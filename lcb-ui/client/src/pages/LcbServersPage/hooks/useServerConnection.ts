/*
 * ADOBE CONFIDENTIAL
 * ___________________
 * Copyright 2025 Adobe
 * All Rights Reserved.
 * NOTICE: All information contained herein is, and remains
 * the property of Adobe and its suppliers, if any. The intellectual
 * and technical concepts contained herein are proprietary to Adobe
 * and its suppliers and are protected by all applicable intellectual
 * property laws, including trade secret and copyright laws.
 *  Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe.
 */

import { useState } from 'react';
import type { MCPServer } from '../../../../../shared/types';
import { apiClient } from '../../../services/api';
import { dispatchAppEvent } from '../../../constants/events';
import { clearAllPageSelections } from '../utils/serverUtils';

export interface UseServerConnectionProps {
  lcbServers: MCPServer[];
  loadServers: () => Promise<void>;
  onError?: (message: string) => void;
}

export interface UseServerConnectionReturn {
  isConnectionOperationInProgress: boolean;
  setIsConnectionOperationInProgress: (value: boolean) => void;
  isConnectionConfirmOpen: boolean;
  setIsConnectionConfirmOpen: (open: boolean) => void;
  pendingConnectionServerId: string | null;
  setPendingConnectionServerId: (id: string | null) => void;
  handleConnectServer: (id: string) => Promise<void>;
  handleDisconnectServer: (id: string) => Promise<void>;
  handleConfirmConnection: () => Promise<void>;
}

/**
 * Custom hook for server connection management
 * Handles connect, disconnect, and connection confirmation logic
 */
export function useServerConnection({
  lcbServers,
  loadServers,
  onError
}: UseServerConnectionProps): UseServerConnectionReturn {
  const [isConnectionOperationInProgress, setIsConnectionOperationInProgress] = useState(false);
  const [isConnectionConfirmOpen, setIsConnectionConfirmOpen] = useState(false);
  const [pendingConnectionServerId, setPendingConnectionServerId] = useState<string | null>(null);

  /**
   * Connect to a server
   * Shows confirmation dialog if another server is already connected
   */
  const handleConnectServer = async (id: string) => {
    try {
      setIsConnectionOperationInProgress(true);
      const server = lcbServers.find(s => s.id === id);
      console.log(`[Server Connect] Starting connection to: ${server?.name || id}`);

      const connectedServer = lcbServers.find(s => s.status === 'connected');

      // If another server is connected, show confirmation dialog
      if (connectedServer && connectedServer.id !== id) {
        setPendingConnectionServerId(id);
        setIsConnectionConfirmOpen(true);
        setIsConnectionOperationInProgress(false);
        return;
      }

      await apiClient.connectServer(id);
      console.log(`[Server Connect] ✅ Successfully connected to: ${server?.name || id}`);

      // Clear selected action and resource from session storage
      clearAllPageSelections();

      dispatchAppEvent('SERVER_CONNECTED', { serverId: id });
      await loadServers();
    } catch (err) {
      console.error(`[Server Connect] ❌ Failed to connect:`, err);
      if (onError) {
        onError(err instanceof Error ? err.message : 'Failed to connect to LCB server');
      }
    } finally {
      setIsConnectionOperationInProgress(false);
    }
  };

  /**
   * Confirm switching connection from one server to another
   */
  const handleConfirmConnection = async () => {
    if (!pendingConnectionServerId) return;

    try {
      setIsConnectionOperationInProgress(true);
      const connectedServer = lcbServers.find(s => s.status === 'connected');

      // Disconnect from current server
      if (connectedServer) {
        await apiClient.disconnectServer(connectedServer.id);
      }

      // Connect to new server
      await apiClient.connectServer(pendingConnectionServerId);

      // Clear selected action and resource from session storage
      clearAllPageSelections();

      dispatchAppEvent('SERVER_CONNECTED', { serverId: pendingConnectionServerId });
      await loadServers();

      setIsConnectionConfirmOpen(false);
      setPendingConnectionServerId(null);
    } catch (err) {
      if (onError) {
        onError(err instanceof Error ? err.message : 'Failed to switch LCB server connection');
      }
      setIsConnectionConfirmOpen(false);
      setPendingConnectionServerId(null);
    } finally {
      setIsConnectionOperationInProgress(false);
    }
  };

  /**
   * Disconnect from a server
   */
  const handleDisconnectServer = async (id: string) => {
    try {
      setIsConnectionOperationInProgress(true);
      const server = lcbServers.find(s => s.id === id);
      console.log(`[Server Disconnect] Starting disconnection from: ${server?.name || id}`);

      await apiClient.disconnectServer(id);
      console.log(`[Server Disconnect] ✅ Successfully disconnected from: ${server?.name || id}`);

      // Clear selected action and resource from session storage
      clearAllPageSelections();

      dispatchAppEvent('SERVER_DISCONNECTED', { serverId: id });
      await loadServers();
    } catch (err) {
      console.error(`[Server Disconnect] ❌ Failed to disconnect:`, err);
      if (onError) {
        onError(err instanceof Error ? err.message : 'Failed to disconnect from LCB server');
      }
    } finally {
      setIsConnectionOperationInProgress(false);
    }
  };

  return {
    isConnectionOperationInProgress,
    setIsConnectionOperationInProgress,
    isConnectionConfirmOpen,
    setIsConnectionConfirmOpen,
    pendingConnectionServerId,
    setPendingConnectionServerId,
    handleConnectServer,
    handleDisconnectServer,
    handleConfirmConnection
  };
}
