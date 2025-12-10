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
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe.
 */

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Hook that redirects to /lcbs if no server is connected
 * Checks server state directly from API and listens for disconnection events
 */
export function useRequireConnectedServer() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkServerConnection = async () => {
      try {
        const { apiClient } = await import('../services/api');
        const servers = await apiClient.getServers();
        const connectedServer = servers.find(s => s.status === 'connected');

        // Only redirect if:
        // 1. No server is connected
        // 2. We're not already on /lcbs (prevent redirect loops)
        if (!connectedServer && location.pathname !== '/lcbs') {
          console.log('[useRequireConnectedServer] No server connected, redirecting to /lcbs');
          navigate('/lcbs');
        }
      } catch (err) {
        console.error('[useRequireConnectedServer] Failed to check server connection:', err);
      }
    };

    // Check on mount
    checkServerConnection();

    // Listen for disconnection events
    const handleDisconnect = () => {
      console.log('[useRequireConnectedServer] Server disconnected, checking connection...');
      checkServerConnection();
    };

    window.addEventListener('lcb-server-disconnected', handleDisconnect);

    return () => {
      window.removeEventListener('lcb-server-disconnected', handleDisconnect);
    };
  }, [navigate, location.pathname]);

  return null;
}

