import { useCallback } from 'react';
import type { MCPTool, MCPServer } from '../../../../../shared/types';
import { apiClient } from '../../../services/api';
import { toastService } from '../../../services/toast';
import { ErrorMessages, SuccessMessages } from '../../../utils/errorHandler';

interface UseActionCRUDParams {
  selectedServer: MCPServer | null;
  tools: MCPTool[];
  loadTools: (forceRefresh?: boolean, clearResponse?: boolean) => Promise<MCPTool[] | void>;
  setSelectedTool: (tool: MCPTool | null) => void;
  setIsEditDialogOpen: (open: boolean) => void;
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

export function useActionCRUD({
  selectedServer,
  tools,
  loadTools,
  setSelectedTool,
  setIsEditDialogOpen,
  handleAsync
}: UseActionCRUDParams) {
  const handleSaveAction = useCallback(async (originalName: string, updates: Partial<MCPTool>) => {
    if (!selectedServer) return;

    await handleAsync(
      () => apiClient.upsertActionDraft(selectedServer.id, originalName, updates),
      {
        successMessage: SuccessMessages.SAVE_ACTION(originalName),
        onSuccess: async () => {
          // Reload tools to apply draft overlays
          const refreshedTools = await loadTools(true);

          // Update selected tool with the refreshed data from DB
          const updatedTool = Array.isArray(refreshedTools)
            ? refreshedTools.find(t => t.name === originalName)
            : undefined;
          if (updatedTool) {
            setSelectedTool(updatedTool);
          }

          setIsEditDialogOpen(false);
        },
        errorContext: ErrorMessages.SAVE_ACTION
      }
    );
  }, [selectedServer, loadTools, setSelectedTool, setIsEditDialogOpen, handleAsync]);

  const handleAddAction = useCallback(async (newAction: MCPTool) => {
    if (!selectedServer) {
      throw new Error('No LCB server connected');
    }

    // Check if action with same name already exists
    if (tools.find(t => t.name === newAction.name)) {
      throw new Error(`Action with name "${newAction.name}" already exists`);
    }

    // Add action via API (as custom action)
    await apiClient.addCustomAction(selectedServer.id, newAction);

    // Reload tools to update draft counts and apply proper sorting
    const refreshedTools = await loadTools(true);

    // Select the new action after reload
    const updatedAction = Array.isArray(refreshedTools)
      ? refreshedTools.find(t => t.name === newAction.name) || newAction
      : newAction;
    setSelectedTool(updatedAction);

    // Show success toast
    toastService.success(SuccessMessages.ADD_ACTION(newAction.name));
  }, [selectedServer, tools, loadTools, setSelectedTool]);

  return {
    handleSaveAction,
    handleAddAction
  };
}
