import { useCallback } from 'react';
import type { MCPTool, MCPServer } from '../../../../../shared/types';
import type { HistoryEntry } from '../../../services/history';
import { apiClient } from '../../../services/api';
import { handleApiError, ErrorMessages } from '../../../utils/errorHandler';
import {
  safeGetSessionStorage,
  safeSetSessionStorage,
  safeRemoveSessionStorage
} from '../../../utils/storage';
import { STORAGE_KEYS } from '../../../constants/storage';
import { UI } from '../../../constants/ui';
import { buildCacheKey, shouldRefreshCache } from '../utils/cacheUtils';
import { sortToolsByDeploymentStatus, countDraftActions } from '../utils/actionUtils';

interface UseToolsLoaderParams {
  setTools: (tools: MCPTool[]) => void;
  setSelectedTool: (tool: MCPTool | null) => void;
  setSelectedServer: (server: MCPServer | null) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  setHistory: React.Dispatch<React.SetStateAction<HistoryEntry[]>>;
  setDraftActionNames: (names: Set<string>) => void;
  setExecutionResponse: (response: any) => void;
  setCopyStatus: React.Dispatch<React.SetStateAction<{
    request: 'idle' | 'success' | 'error';
    response: 'idle' | 'success' | 'error';
    mainResponse: 'idle' | 'success' | 'error';
    annotations: 'idle' | 'success' | 'error';
    metadata: 'idle' | 'success' | 'error';
  }>>;
}

export function useToolsLoader({
  setTools,
  setSelectedTool,
  setSelectedServer,
  setError,
  setLoading,
  setHistory,
  setDraftActionNames,
  setExecutionResponse,
  setCopyStatus
}: UseToolsLoaderParams) {
  const loadTools = useCallback(async (forceRefresh: boolean = false, clearResponse: boolean = false) => {
    try {
      // Get the connected server from API
      const servers = await apiClient.getServers();
      const connectedServer = servers.find(s => s.status === 'connected');

      if (!connectedServer) {
        setTools([]);
        setSelectedTool(null);
        setSelectedServer(null);
        setError('No LCB server connected');
        safeRemoveSessionStorage(STORAGE_KEYS.TOOLS_LOADED_FOR_SERVER);
        return;
      }

      setSelectedServer(connectedServer);
      const serverId = connectedServer.id;

      // Clear response if requested (from refresh button click)
      if (clearResponse) {
        setExecutionResponse(null);
        setCopyStatus(prev => ({ ...prev, mainResponse: 'idle', annotations: 'idle', metadata: 'idle' }));
      }
      setLoading(true);
      setError(null);

      // Check if tools already loaded for this server+session combination
      const cacheKey = buildCacheKey(serverId, connectedServer.sessionId);
      const sessionLoadedServer = safeGetSessionStorage(STORAGE_KEYS.TOOLS_LOADED_FOR_SERVER);
      const shouldFetchFromServer = shouldRefreshCache(forceRefresh, sessionLoadedServer, cacheKey);

      // Load merged actions (MCP + DB with uncommitted changes priority)
      let mergedTools: MCPTool[] = [];
      if (connectedServer.status === 'connected' && shouldFetchFromServer) {
        mergedTools = await apiClient.getMergedActions(serverId);

        // Add tools/list request to history (check for duplicates within 1 second)
        const toolsListEntry: HistoryEntry = {
          id: Date.now().toString(),
          timestamp: new Date(),
          operationName: 'tools/list',
          request: {
            method: 'tools/list',
            params: {}
          },
          response: {
            tools: mergedTools
          }
        };

        setHistory(prev => {
          // Check if last entry is tools/list within 1 second (React StrictMode duplicate)
          if (prev.length > 0) {
            const lastEntry = prev[0];
            const timeDiff = toolsListEntry.timestamp.getTime() - lastEntry.timestamp.getTime();
            if (lastEntry.operationName === 'tools/list' && timeDiff < UI.HISTORY_DUPLICATE_THRESHOLD_MS) {
              return prev; // Skip duplicate
            }
          }
          return [toolsListEntry, ...prev];
        });

        // Mark tools as loaded for this server+session combination
        safeSetSessionStorage(STORAGE_KEYS.TOOLS_LOADED_FOR_SERVER, cacheKey);
      }

      // Merged tools already include uncommitted changes from DB
      // Backend handles all merging logic now

      // Count drafts using utility function
      const draftActions = countDraftActions(mergedTools);
      setDraftActionNames(draftActions);

      // Sort tools using utility function
      const allTools = sortToolsByDeploymentStatus(mergedTools);

      setTools(allTools);

      // Check if this was a page refresh
      const isPageRefresh = safeGetSessionStorage(STORAGE_KEYS.ACTIONS_PAGE_IS_REFRESH) === 'true';

      // Try to restore selected action only on page refresh
      let toolToSelect = null;
      if (isPageRefresh) {
        const storedActionName = safeGetSessionStorage(STORAGE_KEYS.ACTIONS_PAGE_SELECTED_ACTION);
        if (storedActionName) {
          toolToSelect = allTools.find(t => t.name === storedActionName);
        }
      }

      // Restore selected tool on page refresh (but don't auto-select first tool)
      if (allTools.length > 0 && toolToSelect) {
        setSelectedTool(toolToSelect);
      }

      return allTools; // Return the loaded tools for immediate use
    } catch (error) {
      handleApiError(error, {
        context: 'loadTools',
        fallback: ErrorMessages.LOAD_ACTIONS,
        setError,
      });
      setTools([]);
      return []; // Return empty array on error
    } finally {
      setLoading(false);
    }
  }, [
    setTools,
    setSelectedTool,
    setSelectedServer,
    setError,
    setLoading,
    setHistory,
    setDraftActionNames,
    setExecutionResponse,
    setCopyStatus
  ]);

  return { loadTools };
}
