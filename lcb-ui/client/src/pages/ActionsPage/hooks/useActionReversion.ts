import { useCallback } from 'react';
import type { MCPTool, MCPServer } from '../../../../../shared/types';
import { apiClient } from '../../../services/api';
import { changelogService } from '../../../services/changelog';
import { hasWidget, findAssociatedResource } from '../utils/widgetUtils';

interface UseActionReversionParams {
  selectedServer: MCPServer | null;
  tools: MCPTool[];
  loadTools: (forceRefresh?: boolean, clearResponse?: boolean) => Promise<MCPTool[] | void>;
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

export function useActionReversion({
  selectedServer,
  tools,
  loadTools,
  handleAsync
}: UseActionReversionParams) {
  const handleRevertAction = useCallback(async (actionName: string, revertType: 'draft' | 'deleted') => {
    if (!selectedServer) return;

    await handleAsync(
      async () => {
        // Get all entries before deletion
        const entries = await changelogService.getUncommittedEntries();

        if (revertType === 'deleted') {
          // Set deleted: false to restore the action
          await apiClient.updateAction(selectedServer.id, actionName, { deleted: false });

          // Find and delete the action_deleted changelog entry
          const actionDeletedEntry = entries.find(
            e => e.actionName === actionName && e.type === 'action_deleted'
          );

          if (actionDeletedEntry) {
            await changelogService.deleteEntry(actionDeletedEntry.id);
          }

          // Find the action to check if it has a widget
          const action = tools.find(t => t.name === actionName);
          const actionHasWidget = hasWidget(action);

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
              const associatedResource = findAssociatedResource(actionName, action, allResources);

              if (associatedResource) {
                // Restore the resource using the new endpoint
                await fetch(`/api/widget-resources/${encodeURIComponent(selectedServer.id)}/${encodeURIComponent(associatedResource.uri)}/restore`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' }
                });

                // Find and delete the resource_deleted changelog entry
                const resourceDeletedEntry = entries.find(
                  e => e.type === 'resource_deleted' && e.resourceUri === associatedResource.uri
                );

                if (resourceDeletedEntry) {
                  await changelogService.deleteEntry(resourceDeletedEntry.id);
                }
              }
            } catch (error) {
              console.error('Failed to restore associated resource:', error);
              // Non-fatal error - continue with action restoration
            }
          }
        } else if (revertType === 'draft') {
          // For draft reversions, delete ALL changelog entries for this action
          // (name_changed, description_changed, field_added, field_modified, field_deleted, etc.)
          const entriesToDelete = entries.filter(e => e.actionName === actionName);

          for (const entry of entriesToDelete) {
            await changelogService.deleteEntry(entry.id);
          }

          // Also delete the draft via API
          await apiClient.deleteActionDraft(selectedServer.id, actionName);
        }

        // Reload tools to reflect updated state
        await loadTools(true);
      },
      {
        successMessage: revertType === 'deleted'
          ? (() => {
              const action = tools.find(t => t.name === actionName);
              const actionHasWidget = hasWidget(action);
              return actionHasWidget
                ? `Action "${actionName}" and its associated EDS Widget restored`
                : `Action "${actionName}" restored`;
            })()
          : `Draft changes reverted for "${actionName}"`,
        onSuccess: () => {
          // Changelog will be automatically updated via event
        },
        errorContext: 'Failed to revert'
      }
    );
  }, [selectedServer, tools, loadTools, handleAsync]);

  // Wrapper for backward compatibility (draft reverts only)
  const handleRevertDraft = useCallback(async (actionName: string) => {
    return handleRevertAction(actionName, 'draft');
  }, [handleRevertAction]);

  return {
    handleRevertAction,
    handleRevertDraft
  };
}
