import { useCallback } from 'react';
import type { MCPTool, MCPServer } from '../../../../../shared/types';
import { apiClient } from '../../../services/api';
import { changelogService } from '../../../services/changelog';
import { ErrorMessages } from '../../../utils/errorHandler';
import { hasWidget, findAssociatedResource } from '../utils/widgetUtils';

interface UseActionDeletionParams {
  selectedTool: MCPTool | null;
  selectedServer: MCPServer | null;
  loadTools: (forceRefresh?: boolean, clearResponse?: boolean) => Promise<MCPTool[] | void>;
  setSelectedTool: (tool: MCPTool | null) => void;
  setIsDeleteDialogOpen: (open: boolean) => void;
  handleAsync: (
    fn: () => Promise<any>,
    options?: {
      successMessage?: string;
      errorContext?: string;
      onSuccess?: (result?: any) => void | Promise<void>;
      onError?: (error: any) => void;
    }
  ) => Promise<void>;
}

export function useActionDeletion({
  selectedTool,
  selectedServer,
  loadTools,
  setSelectedTool,
  setIsDeleteDialogOpen,
  handleAsync
}: UseActionDeletionParams) {
  const handleDeleteAction = useCallback(async () => {
    if (!selectedTool || !selectedServer) return;

    const actionName = selectedTool.name;
    const actionHasWidget = hasWidget(selectedTool);

    await handleAsync(
      async () => {
        // Set deleted: true in the database (don't physically delete)
        // Preserve the full tool data (including description) from the live server
        await apiClient.updateAction(selectedServer.id, actionName, { ...selectedTool, deleted: true });

        // Add action deletion to changelog
        await changelogService.addEntry(
          'action_deleted',
          actionName,
          `Action "${actionName}" marked for deletion`,
          {
            oldValue: selectedTool
          }
        );

        // If action has an EDS Widget, find and mark the associated resource as deleted
        if (actionHasWidget) {
          try {
            // Fetch all resources from BOTH live MCP server AND database
            // (widget resources from never-deployed actions only exist in database)
            const [liveResources, dbResources] = await Promise.all([
              apiClient.getResourcesForServer(selectedServer.id).catch(() => []),
              apiClient.getWidgetResources(selectedServer.id).catch(() => [])
            ]);

            const allResources = [...liveResources, ...dbResources];

            // Find the associated resource using utility function
            const associatedResource = findAssociatedResource(actionName, selectedTool, allResources);

            if (associatedResource) {
              // Mark resource as deleted using the new endpoint (pass resource data for live server resources)
              await fetch(`/api/widget-resources/${encodeURIComponent(selectedServer.id)}/${encodeURIComponent(associatedResource.uri)}/mark-deleted`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resourceData: associatedResource })
              });

              // Add resource deletion to changelog
              await changelogService.addEntry(
                'resource_deleted',
                associatedResource.uri,
                `EDS Widget resource "${associatedResource.name}" marked for deletion (associated with action "${actionName}")`,
                {
                  oldValue: associatedResource
                }
              );
            }
          } catch (error) {
            console.error('Failed to mark associated resource as deleted:', error);
            // Non-fatal error - continue with action deletion
          }
        }
      },
      {
        successMessage: actionHasWidget
          ? `Action "${actionName}" and its associated EDS Widget marked for deletion`
          : `Action "${actionName}" marked for deletion`,
        onSuccess: async () => {
          // Reload tools to reflect the deleted flag and get the fresh tools list
          const refreshedTools = await loadTools(true);

          // Re-select the deleted action from the freshly loaded tools to show it with the DELETED badge
          const deletedAction = Array.isArray(refreshedTools)
            ? refreshedTools.find(t => t.name === actionName)
            : undefined;
          if (deletedAction) {
            setSelectedTool(deletedAction);
          }

          setIsDeleteDialogOpen(false);
        },
        errorContext: ErrorMessages.DELETE_ACTION
      }
    );
  }, [selectedTool, selectedServer, loadTools, setSelectedTool, setIsDeleteDialogOpen, handleAsync]);

  return { handleDeleteAction };
}
