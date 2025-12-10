import { useState, useEffect } from 'react';
import type { MCPServer } from '../../../shared/types';
import { apiClient } from '../services/api';
import { addAppEventListener, removeAppEventListener } from '../constants/events';

/**
 * Hook to get the currently connected server
 * Listens to connection events for real-time updates
 */
export function useConnectedServer() {
  const [connectedServer, setConnectedServer] = useState<MCPServer | null>(null);

  useEffect(() => {
    const loadConnectedServer = async () => {
      try {
        const servers = await apiClient.getServers();
        const connected = servers.find(s => s.status === 'connected');
        setConnectedServer(connected || null);
      } catch (err) {
        console.error('[useConnectedServer] Failed to load connected server:', err);
        setConnectedServer(null);
      }
    };

    loadConnectedServer();

    // Listen for connection status changes
    const handleServerStatusChange = () => {
      loadConnectedServer();
    };

    addAppEventListener('SERVER_CONNECTED', handleServerStatusChange);
    addAppEventListener('SERVER_DISCONNECTED', handleServerStatusChange);

    return () => {
      removeAppEventListener('SERVER_CONNECTED', handleServerStatusChange);
      removeAppEventListener('SERVER_DISCONNECTED', handleServerStatusChange);
    };
  }, []);

  return connectedServer;
}
