import { useState, useEffect, useCallback } from 'react';
import type { MCPServer } from '../../../shared/types';
import { apiClient } from '../services/api';
import { dispatchAppEvent, addAppEventListener, removeAppEventListener } from '../constants/events';
import { toastService } from '../services/toast';

interface UseServerSelectorReturn {
  servers: MCPServer[];
  connectedServer: MCPServer | null;
  isLoading: boolean;
  isConnecting: boolean;
  needsConfirmation: boolean;
  pendingServerId: string | null;
  connectToServer: (serverId: string) => Promise<void>;
  disconnectServer: (serverId: string) => Promise<void>;
  confirmSwitch: () => Promise<void>;
  cancelSwitch: () => void;
  refreshServers: () => Promise<void>;
}

/**
 * Custom hook for server selection and switching
 * Provides server list, connection management, and switching logic
 */
export function useServerSelector(): UseServerSelectorReturn {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [pendingServerId, setPendingServerId] = useState<string | null>(null);

  const connectedServer = servers.find(s => s.status === 'connected') || null;

  /**
   * Load all servers from API
   */
  const loadServers = useCallback(async () => {
    try {
      setIsLoading(true);
      const fetchedServers = await apiClient.getServers();
      setServers(fetchedServers);
    } catch (error) {
      console.error('[useServerSelector] Failed to load servers:', error);
      toastService.error('Failed to load servers');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh servers (alias for loadServers)
   */
  const refreshServers = useCallback(async () => {
    await loadServers();
  }, [loadServers]);

  /**
   * Connect to a server
   * If another server is connected, shows confirmation
   */
  const connectToServer = useCallback(async (serverId: string) => {
    const server = servers.find(s => s.id === serverId);
    if (!server) {
      toastService.error('Server not found');
      return;
    }

    // If this server is already connected, do nothing
    if (server.status === 'connected') {
      return;
    }

    // If another server is connected, ask for confirmation
    if (connectedServer && connectedServer.id !== serverId) {
      setPendingServerId(serverId);
      setNeedsConfirmation(true);
      return;
    }

    // Otherwise, connect directly
    try {
      setIsConnecting(true);
      console.log(`[useServerSelector] Connecting to: ${server.name}`);
      
      await apiClient.connectServer(serverId);
      
      // Clear page selections
      sessionStorage.removeItem('actionsPage-selectedToolName');
      sessionStorage.removeItem('widgetResourcesPage-selectedResourceUri');
      sessionStorage.removeItem('environmentsPage-selectedEnvironmentId');
      
      console.log(`[useServerSelector] ✅ Connected to: ${server.name}`);
      toastService.success(`Connected to ${server.name}`);
      
      dispatchAppEvent('SERVER_CONNECTED', { serverId });
      await loadServers();
    } catch (error) {
      console.error('[useServerSelector] Failed to connect:', error);
      toastService.error(`Failed to connect to ${server.name}`);
    } finally {
      setIsConnecting(false);
    }
  }, [servers, connectedServer, loadServers]);

  /**
   * Disconnect from a server
   */
  const disconnectServer = useCallback(async (serverId: string) => {
    const server = servers.find(s => s.id === serverId);
    if (!server) {
      toastService.error('Server not found');
      return;
    }

    try {
      setIsConnecting(true);
      console.log(`[useServerSelector] Disconnecting from: ${server.name}`);
      
      await apiClient.disconnectServer(serverId);
      
      // Clear page selections
      sessionStorage.removeItem('actionsPage-selectedToolName');
      sessionStorage.removeItem('widgetResourcesPage-selectedResourceUri');
      sessionStorage.removeItem('environmentsPage-selectedEnvironmentId');
      
      console.log(`[useServerSelector] ✅ Disconnected from: ${server.name}`);
      toastService.info(`Disconnected from ${server.name}`);
      
      dispatchAppEvent('SERVER_DISCONNECTED', { serverId });
      await loadServers();
    } catch (error) {
      console.error('[useServerSelector] Failed to disconnect:', error);
      toastService.error(`Failed to disconnect from ${server.name}`);
    } finally {
      setIsConnecting(false);
    }
  }, [servers, loadServers]);

  /**
   * Confirm switching from one server to another
   */
  const confirmSwitch = useCallback(async () => {
    if (!pendingServerId || !connectedServer) {
      setNeedsConfirmation(false);
      setPendingServerId(null);
      return;
    }

    const newServer = servers.find(s => s.id === pendingServerId);
    if (!newServer) {
      toastService.error('Server not found');
      setNeedsConfirmation(false);
      setPendingServerId(null);
      return;
    }

    try {
      setIsConnecting(true);
      console.log(`[useServerSelector] Switching from ${connectedServer.name} to ${newServer.name}`);
      
      // Disconnect from current server
      await apiClient.disconnectServer(connectedServer.id);
      
      // Connect to new server
      await apiClient.connectServer(pendingServerId);
      
      // Clear page selections
      sessionStorage.removeItem('actionsPage-selectedToolName');
      sessionStorage.removeItem('widgetResourcesPage-selectedResourceUri');
      sessionStorage.removeItem('environmentsPage-selectedEnvironmentId');
      
      console.log(`[useServerSelector] ✅ Switched to: ${newServer.name}`);
      toastService.success(`Switched to ${newServer.name}`);
      
      dispatchAppEvent('SERVER_CONNECTED', { serverId: pendingServerId });
      await loadServers();
    } catch (error) {
      console.error('[useServerSelector] Failed to switch servers:', error);
      toastService.error(`Failed to switch to ${newServer.name}`);
    } finally {
      setIsConnecting(false);
      setNeedsConfirmation(false);
      setPendingServerId(null);
    }
  }, [pendingServerId, connectedServer, servers, loadServers]);

  /**
   * Cancel server switch
   */
  const cancelSwitch = useCallback(() => {
    setNeedsConfirmation(false);
    setPendingServerId(null);
  }, []);

  // Load servers on mount
  useEffect(() => {
    loadServers();
  }, [loadServers]);

  // Listen for server events
  useEffect(() => {
    const handleServerEvents = () => {
      loadServers();
    };

    addAppEventListener('SERVER_CONNECTED', handleServerEvents);
    addAppEventListener('SERVER_DISCONNECTED', handleServerEvents);
    addAppEventListener('SERVER_SELECTED', handleServerEvents);

    return () => {
      removeAppEventListener('SERVER_CONNECTED', handleServerEvents);
      removeAppEventListener('SERVER_DISCONNECTED', handleServerEvents);
      removeAppEventListener('SERVER_SELECTED', handleServerEvents);
    };
  }, [loadServers]);

  return {
    servers,
    connectedServer,
    isLoading,
    isConnecting,
    needsConfirmation,
    pendingServerId,
    connectToServer,
    disconnectServer,
    confirmSwitch,
    cancelSwitch,
    refreshServers
  };
}

