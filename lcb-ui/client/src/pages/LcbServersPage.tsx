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

import { useState, useEffect, useRef } from 'react';
import {
  ProgressCircle,
  Text,
  AlertDialog,
  DialogContainer
} from '@react-spectrum/s2';
import { apiClient } from '../services/api';
import AddLcbServerDialog from './LcbServersPage/components/AddLcbServerDialog';
import EditLcbServerDialog from './LcbServersPage/components/EditLcbServerDialog';
import { useServerState } from '../hooks/useServerState';
import { filterServers, sortServers } from './LcbServersPage/utils/serverUtils';
import { useServerCRUD } from './LcbServersPage/hooks/useServerCRUD';
import { useServerConnection } from './LcbServersPage/hooks/useServerConnection';

// Import page components
import LcbServersHeader from './LcbServersPage/LcbServersHeader';
import LcbServersFilter from './LcbServersPage/LcbServersFilter';
import ErrorDisplay from './LcbServersPage/ErrorDisplay';
import LcbServersGrid from './LcbServersPage/LcbServersGrid';

export default function LcbServersPage() {
  const { servers: lcbServers, loading, error, loadServers, setError } =
    useServerState();

  const [filterText, setFilterText] = useState<string>('');

  // Custom hooks for business logic
  const {
    isAddDialogOpen,
    setIsAddDialogOpen,
    handleAddServer,
    isEditDialogOpen,
    setIsEditDialogOpen,
    selectedLcbServer,
    handleEditServer,
    handleSaveServerEdit,
    handleDeleteServer
  } = useServerCRUD({ lcbServers, loadServers, onError: setError });

  const {
    isConnectionOperationInProgress,
    isConnectionConfirmOpen,
    setIsConnectionConfirmOpen,
    pendingConnectionServerId,
    setPendingConnectionServerId,
    handleConnectServer,
    handleDisconnectServer,
    handleConfirmConnection
  } = useServerConnection({ lcbServers, loadServers, onError: setError });

  // Server process management removed - users should manually start lcb-server
  // before launching the UI (e.g., via 'make serve' or './run.sh')

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  // Verify actual server state on page load for local-managed servers (run only once on mount)
  const hasVerifiedRef = useRef(false);
  
  useEffect(() => {
    const verifyServerStates = async () => {
      // Only run once on mount, and only after servers are loaded
      if (hasVerifiedRef.current || lcbServers.length === 0) return;
      
      hasVerifiedRef.current = true;
      console.log('[Server State Verification] Checking actual server states...');

      // Collect all updates first, then apply them in a single batch
      const updates: Array<{ serverId: string; updates: Record<string, any> }> = [];

      for (const server of lcbServers) {
        // Only check managed servers (local and remote)
        if (server.serverType !== 'local-managed' && server.serverType !== 'remote-managed') continue;

        try {
          const healthCheck = await fetch(`/api/health/check?url=${encodeURIComponent(server.url)}`);
          const healthData = await healthCheck.json();
          const isActuallyRunning = healthData.healthy;

          // Case 1: DB says started, verify it's actually running
          if (server.processState === 'started') {
            console.log(`[Server State Verification] DB says ${server.name} is 'started', checking...`);

            if (!isActuallyRunning) {
              // Server is NOT actually running, queue state update to stopped
              console.log(`[Server State Verification] ❌ ${server.name} is NOT running, queueing state update to 'stopped'`);
              updates.push({
                serverId: server.id,
                updates: { processState: 'stopped', processSessionId: undefined }
              });
            } else {
              console.log(`[Server State Verification] ✅ ${server.name} is running as expected`);
            }
          }
          // Case 2: DB says stopped (or undefined), but check if it's actually running
          else {
            console.log(`[Server State Verification] DB says ${server.name} is '${server.processState || 'undefined'}', checking...`);

            if (isActuallyRunning) {
              // Server IS running but DB doesn't know, queue state update to started
              console.log(`[Server State Verification] ✅ ${server.name} IS running, queueing state update to 'started'`);
              updates.push({
                serverId: server.id,
                updates: { processState: 'started' }
              });
            } else {
              console.log(`[Server State Verification] ❌ ${server.name} is not running as expected`);
            }
          }
        } catch (err) {
          // Health check failed, server is not running
          if (server.processState === 'started') {
            console.log(`[Server State Verification] ❌ ${server.name} health check failed, queueing state update to 'stopped'`);
            updates.push({
              serverId: server.id,
              updates: { processState: 'stopped', processSessionId: undefined }
            });
          }
        }
      }

      // Apply all updates, then reload servers once
      if (updates.length > 0) {
        console.log(`[Server State Verification] Applying ${updates.length} batched updates...`);
        for (const { serverId, updates: serverUpdates } of updates) {
          await apiClient.updateServer(serverId, serverUpdates);
        }
        await loadServers();
      }

      console.log('[Server State Verification] Verification complete');
    };

    verifyServerStates();
  }, [lcbServers, loadServers]);

  const filteredServers = sortServers(filterServers(lcbServers, filterText));

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          width: '100%',
          backgroundColor: 'var(--spectrum-global-color-gray-50)'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <ProgressCircle aria-label="Loading LCB servers" isIndeterminate size="L" />
          <Text UNSAFE_style={{ fontSize: '15px', color: 'var(--spectrum-global-color-gray-700)' }}>Loading LCB servers...</Text>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '24px', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: 'var(--spectrum-global-color-gray-50)'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: '1' }}>
        {/* Header */}
        <LcbServersHeader onAddClick={() => setIsAddDialogOpen(true)} />

        {/* Filter */}
        <LcbServersFilter
          filterText={filterText}
          onFilterChange={setFilterText}
          isDisabled={lcbServers.length === 0}
        />

        {/* Error Display */}
        <ErrorDisplay error={error} />

        {/* Main Content */}
        {filteredServers.length === 0 && lcbServers.length > 0 ? (
          <div
            style={{
              border: '1px solid var(--spectrum-global-color-gray-300)',
              borderRadius: '8px',
              padding: '56px 48px',
              backgroundColor: 'var(--spectrum-global-color-gray-50)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <Text UNSAFE_style={{ fontSize: '16px', fontWeight: 500 }}>No servers match your filter "{filterText}"</Text>
              <Text UNSAFE_style={{ fontSize: '14px', color: 'var(--spectrum-global-color-gray-700)' }}>Try a different search term</Text>
            </div>
          </div>
        ) : (
          <LcbServersGrid
            servers={filteredServers}
            onEdit={handleEditServer}
            onDelete={handleDeleteServer}
            onConnect={handleConnectServer}
            onDisconnect={handleDisconnectServer}
            isConnectionOperationInProgress={isConnectionOperationInProgress}
          />
        )}
      </div>

      {/* Dialogs */}
      <AddLcbServerDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onAdd={handleAddServer}
      />

      <EditLcbServerDialog
        isOpen={isEditDialogOpen}
        server={selectedLcbServer}
        onClose={() => {
          setIsEditDialogOpen(false);
        }}
        onSave={handleSaveServerEdit}
      />

      <DialogContainer
        onDismiss={() => {
          setIsConnectionConfirmOpen(false);
          setPendingConnectionServerId(null);
        }}
      >
        {isConnectionConfirmOpen && (() => {
          const connectedServer = lcbServers.find(s => s.status === 'connected');
          const pendingServer = lcbServers.find(s => s.id === pendingConnectionServerId);

          return (
            <AlertDialog
              title="Switch Connection"
              variant="confirmation"
              primaryActionLabel="Connect"
              cancelLabel="Cancel"
              onPrimaryAction={handleConfirmConnection}
              onCancel={() => {
                setIsConnectionConfirmOpen(false);
                setPendingConnectionServerId(null);
              }}
            >
              The <strong>{connectedServer?.name}</strong> server is already connected.
              Connecting to <strong>{pendingServer?.name}</strong> will disconnect
              <strong>{connectedServer?.name}</strong>.
            </AlertDialog>
          );
        })()}
      </DialogContainer>
    </div>
  );
}

