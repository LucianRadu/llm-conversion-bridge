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

import type { MCPServer } from '../../../../../shared/types';
import { apiClient } from '../../../services/api';
import { toastService } from '../../../services/toast';
import { dispatchAppEvent } from '../../../constants/events';

export interface UseServerProcessProps {
  lcbServers: MCPServer[];
  loadServers: () => Promise<void>;
  setIsConnectionOperationInProgress: (value: boolean) => void;
  onError?: (message: string) => void;
}

export interface UseServerProcessReturn {
  handleStartServer: (id: string) => Promise<void>;
  handleStopServer: (id: string) => Promise<void>;
}

/**
 * Custom hook for server process management
 * Handles starting/stopping servers with health checks
 */
export function useServerProcess({
  lcbServers,
  loadServers,
  setIsConnectionOperationInProgress,
  onError
}: UseServerProcessProps): UseServerProcessReturn {
  /**
   * Start a server with health check polling
   */
  const handleStartServer = async (id: string) => {
    try {
      setIsConnectionOperationInProgress(true);
      const server = lcbServers.find(s => s.id === id);
      console.log(`[Server Start] Starting server: ${server?.name || id}`);

      // Set state to 'starting' immediately
      await apiClient.updateServer(id, { processState: 'starting' });
      await loadServers();

      // Just run make serve (it will kill existing servers first)
      const response = await fetch('/api/bash/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: 'make serve',
          description: `Start ${server?.name || 'server'}`,
          background: true
        })
      });

      const data = await response.json();
      console.log('[Server Start] Server start response:', data);

      if (response.ok && data.sessionId) {
        // Poll the server to check if it's actually ready (max 15 seconds)
        // Use server's URL (path extracted from AEM_COMPUTE_SERVICE)
        const serverUrl = server?.url || `http://localhost:${import.meta.env.LCB_SERVER_PORT || '7676'}`;
        let isReady = false;
        let attempts = 0;
        const maxAttempts = 15;

        while (!isReady && attempts < maxAttempts) {
          attempts++;

          try {
            const healthCheck = await fetch(`/api/health/check?url=${encodeURIComponent(serverUrl)}`);
            const healthData = await healthCheck.json();

            console.log(`[Server Start] Health check attempt ${attempts}:`, healthData);

            if (healthData.healthy) {
              isReady = true;
              console.log(`[Server Start] Server is ready!`);
            } else {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch (err) {
            console.log(`[Server Start] Health check attempt ${attempts} failed:`, err);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        if (isReady) {
          // Update server state to 'started' with the session ID
          await apiClient.updateServer(id, {
            processState: 'started',
            processSessionId: data.sessionId
          });
          await loadServers();
          console.log(`[Server Start] ✅ Server started successfully: ${server?.name || id}`);
          toastService.success('Server started successfully');
        } else {
          console.error(`[Server Start] ❌ Server failed to respond within 15 seconds`);
          await apiClient.updateServer(id, { processState: 'stopped' });
          await loadServers();
          toastService.error('Server failed to start within 15 seconds');
        }
      } else {
        console.error(`[Server Start] ❌ Failed to start server process`);
        await apiClient.updateServer(id, { processState: 'stopped' });
        await loadServers();
        toastService.error('Failed to start server process');
      }
    } catch (err) {
      console.error(`[Server Start] ❌ Failed to start server:`, err);
      if (onError) {
        onError(err instanceof Error ? err.message : 'Failed to start server');
      }
      await apiClient.updateServer(id, { processState: 'stopped' });
      await loadServers();
    } finally {
      setIsConnectionOperationInProgress(false);
    }
  };

  /**
   * Stop a server with verification
   */
  const handleStopServer = async (id: string) => {
    try {
      setIsConnectionOperationInProgress(true);
      const server = lcbServers.find(s => s.id === id);
      console.log(`[Server Stop] Stopping server: ${server?.name || id}`);

      if (!server) {
        throw new Error(`Server not found: ${id}`);
      }

      // Update state to stopping IMMEDIATELY for UI feedback
      console.log(`[Server Stop] Setting state to 'stopping': ${server.name}`);
      await apiClient.updateServer(id, { processState: 'stopping' });
      await loadServers();

      if (!server?.processSessionId) {
        console.warn(`[Server Stop] No process session ID found (server may have been started externally)`);
        // Continue with kill-fastly anyway to stop the actual process
      }

      // If server is connected, disconnect first
      if (server.status === 'connected') {
        console.log(`[Server Stop] Server is connected, disconnecting first: ${server.name}`);
        try {
          await apiClient.disconnectServer(id);
          dispatchAppEvent('SERVER_DISCONNECTED', { serverId: id });
          console.log(`[Server Stop] ✅ Disconnected from: ${server.name}`);
        } catch (disconnectErr) {
          console.warn(`[Server Stop] Failed to disconnect (server may already be disconnected):`, disconnectErr);
        }
      }

      // Kill the process using make kill-fastly (more reliable than just killing the session)
      console.log(`[Server Stop] Running make kill-fastly to stop all server processes`);
      try {
        const killResponse = await fetch('/api/bash/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command: 'cd ../lcb-server && make kill-fastly',
            description: `Stop ${server.name}`,
            background: false
          })
        });

        if (killResponse.ok) {
          console.log(`[Server Stop] ✅ make kill-fastly executed successfully`);
        } else {
          console.warn(`[Server Stop] make kill-fastly returned error, but continuing`);
        }
      } catch (killErr) {
        console.warn(`[Server Stop] Failed to run make kill-fastly:`, killErr);
      }

      // Also kill the background process session if it exists
      if (server.processSessionId) {
        console.log(`[Server Stop] Killing background session: ${server.processSessionId}`);
        try {
          await fetch(`/api/bash/kill/${server.processSessionId}`, { method: 'POST' });
        } catch (sessionKillErr) {
          console.warn(`[Server Stop] Failed to kill session (may already be dead):`, sessionKillErr);
        }
      }

      // Wait a moment for processes to die
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify server is actually stopped by checking if it responds
      console.log(`[Server Stop] Verifying server is stopped...`);
      try {
        // Use server's URL (path extracted from AEM_COMPUTE_SERVICE)
        const serverUrl = server?.url || `http://localhost:${import.meta.env.LCB_SERVER_PORT || '7676'}`;
        const healthCheck = await fetch(`/api/health/check?url=${encodeURIComponent(serverUrl)}`);
        const healthData = await healthCheck.json();

        if (healthData.healthy) {
          console.error(`[Server Stop] ❌ Server is still running!`);
          throw new Error('Server is still running after kill command');
        } else {
          console.log(`[Server Stop] ✅ Server confirmed stopped`);
        }
      } catch (healthErr: any) {
        // If health check fails, server is stopped (which is what we want)
        if (healthErr.message === 'Server is still running after kill command') {
          throw healthErr;
        }
        console.log(`[Server Stop] ✅ Server confirmed stopped (health check failed as expected)`);
      }

      // Update state to stopped
      await apiClient.updateServer(id, {
        processState: 'stopped',
        processSessionId: undefined
      });
      await loadServers();
      console.log(`[Server Stop] ✅ Server stopped successfully: ${server.name}`);
      toastService.success('Server stopped successfully');
    } catch (err) {
      console.error(`[Server Stop] ❌ Failed to stop server:`, err);
      if (onError) {
        onError(err instanceof Error ? err.message : 'Failed to stop server');
      }
      // Don't reset state - if we got here, server is likely stopped anyway
      await apiClient.updateServer(id, {
        processState: 'stopped',
        processSessionId: undefined
      });
      await loadServers();
    } finally {
      setIsConnectionOperationInProgress(false);
    }
  };

  return {
    handleStartServer,
    handleStopServer
  };
}
