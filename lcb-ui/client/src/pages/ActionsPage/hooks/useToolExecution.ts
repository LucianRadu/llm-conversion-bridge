import { useCallback } from 'react';
import type { MCPTool, MCPServer, ToolArguments } from '../../../../../shared/types';
import type { HistoryEntry } from '../../../services/history';
import { apiClient } from '../../../services/api';
import { ErrorMessages, SuccessMessages } from '../../../utils/errorHandler';
import { ACTION_META } from '../../../constants/actionMeta';

interface UseToolExecutionParams {
  selectedTool: MCPTool | null;
  selectedServer: MCPServer | null;
  inputValues: Record<string, string>;
  setInputValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setIsExecuting: (executing: boolean) => void;
  setExecutionResponse: (response: any) => void;
  setCopyStatus: React.Dispatch<React.SetStateAction<{
    request: 'idle' | 'success' | 'error';
    response: 'idle' | 'success' | 'error';
    mainResponse: 'idle' | 'success' | 'error';
    annotations: 'idle' | 'success' | 'error';
    metadata: 'idle' | 'success' | 'error';
  }>>;
  setHistory: React.Dispatch<React.SetStateAction<HistoryEntry[]>>;
  autoOpenAEMWidgets: boolean;
  setAEMWidgetData: (data: {
    toolName: string;
    toolId: string;
    componentUrl: string;
    toolInput: Record<string, any>;
    toolOutput?: any;
    toolResponseMetadata?: Record<string, any>;
  } | null) => void;
  setIsAEMWidgetModalOpen: (open: boolean) => void;
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

export function useToolExecution({
  selectedTool,
  selectedServer,
  inputValues,
  setInputValues,
  setIsExecuting,
  setExecutionResponse,
  setCopyStatus,
  setHistory,
  autoOpenAEMWidgets,
  setAEMWidgetData,
  setIsAEMWidgetModalOpen,
  handleAsync
}: UseToolExecutionParams) {
  const handleInputChange = useCallback((key: string, value: string) => {
    setInputValues(prev => ({ ...prev, [key]: value }));
  }, [setInputValues]);

  const handleExecuteAction = useCallback(async () => {
    if (!selectedTool || !selectedServer) return;

    setIsExecuting(true);
    setExecutionResponse(null);
    setCopyStatus(prev => ({ ...prev, mainResponse: 'idle', annotations: 'idle', metadata: 'idle' }));

    // Build arguments from input values
    const args: ToolArguments = {};
    if (selectedTool.inputSchema?.properties) {
      Object.keys(selectedTool.inputSchema.properties).forEach(key => {
        const value = inputValues[key];
        if (value !== undefined && value !== '') {
          args[key] = value;
        }
      });
    }

    try {
      await handleAsync(
        () => apiClient.executeTool(selectedServer.id, selectedTool.name, args),
        {
          successMessage: SuccessMessages.EXECUTE_ACTION(selectedTool.name),
          onSuccess: (response) => {
            setExecutionResponse(response);

            // Add to history
            const newEntry: HistoryEntry = {
              id: Date.now().toString(),
              timestamp: new Date(),
              operationName: `tools/call: ${selectedTool.name}`,
              request: {
                method: `tools/call`,
                params: {
                  name: selectedTool.name,
                  arguments: args
                }
              },
              response: response
            };

            setHistory(prev => [newEntry, ...prev]);

            // Check if auto-open AEM Widgets is enabled and tool has AEM Widget
            if (autoOpenAEMWidgets && selectedTool._meta?.[ACTION_META.OUTPUT_TEMPLATE]) {
              const componentUrl = selectedTool._meta[ACTION_META.OUTPUT_TEMPLATE] || '';

              // Extract structured content and metadata from response
              let toolOutput = null;
              let toolResponseMetadata = null;

              if (response?.structuredContent) {
                toolOutput = response.structuredContent;
              }

              if (response?._meta) {
                toolResponseMetadata = response._meta;
              }

              // Open AEM Widget modal
              setAEMWidgetData({
                toolName: selectedTool.name,
                toolId: newEntry.id,
                componentUrl,
                toolInput: args,
                toolOutput,
                toolResponseMetadata,
              });
              setIsAEMWidgetModalOpen(true);
            }
          },
          onError: (error) => {
            const errorMessage = error.message;
            setExecutionResponse({ error: errorMessage });
          },
          errorContext: ErrorMessages.EXECUTE_ACTION
        }
      );
    } finally {
      setIsExecuting(false);
    }
  }, [
    selectedTool,
    selectedServer,
    inputValues,
    setIsExecuting,
    setExecutionResponse,
    setCopyStatus,
    setHistory,
    autoOpenAEMWidgets,
    setAEMWidgetData,
    setIsAEMWidgetModalOpen,
    handleAsync
  ]);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, [setHistory]);

  const handleCopyToClipboard = useCallback(async (
    content: any,
    type: 'request' | 'response' | 'mainResponse' | 'annotations' | 'metadata'
  ) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(content, null, 2));
      setCopyStatus(prev => ({ ...prev, [type]: 'success' }));
      setTimeout(() => {
        setCopyStatus(prev => ({ ...prev, [type]: 'idle' }));
      }, 2000);
    } catch (err) {
      setCopyStatus(prev => ({ ...prev, [type]: 'error' }));
      setTimeout(() => {
        setCopyStatus(prev => ({ ...prev, [type]: 'idle' }));
      }, 2000);
    }
  }, [setCopyStatus]);

  return {
    handleInputChange,
    handleExecuteAction,
    clearHistory,
    handleCopyToClipboard
  };
}
