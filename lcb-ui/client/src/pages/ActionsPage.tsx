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
import { useLocation } from 'react-router-dom';
import { TextField, ActionButton, Button, DialogContainer, Dialog, Content, Heading, ButtonGroup, Text as SpectrumText } from '@react-spectrum/s2';
import { style } from '@react-spectrum/s2/style' with { type: 'macro' };
import Refresh from '@react-spectrum/s2/icons/Refresh';
import Add from '@react-spectrum/s2/icons/Add';
import type { MCPTool, MCPServer, MCPResource } from '../../../shared/types';
import { apiClient } from '../services/api';
import { changelogService } from '../services/changelog';
import { STORAGE_KEYS } from '../constants/storage';
import { EVENTS, dispatchAppEvent } from '../constants/events';
import { safeRemoveSessionStorage } from '../utils/storage';
import { ErrorMessages } from '../utils/errorHandler';
import { useErrorNotification } from '../hooks/useErrorNotification';
import { useRequireConnectedServer } from '../hooks/useRequireConnectedServer';
import { isLocalManagedServer } from '../utils/serverUtils';
import { filterToolsByQuery } from './ActionsPage/utils/actionUtils';
import { useToolsLoader } from './ActionsPage/hooks/useToolsLoader';
import { useActionCRUD } from './ActionsPage/hooks/useActionCRUD';
import { useActionDeletion } from './ActionsPage/hooks/useActionDeletion';
import { useWidgetOperations } from './ActionsPage/hooks/useWidgetOperations';
import ActionsGrid from './ActionsPage/ActionsGrid';
import UnifiedActionEditor, { type UnifiedActionEditorRef } from '../components/UnifiedActionEditor';
import ExecutionPanel from '../components/ExecutionPanel';
import CreateActionWizard from '../components/CreateActionWizard';
import ReviewDraftsModal from '../components/ReviewDraftsModal';
import ToastContainer from '../components/ToastContainer';
import EDSActionDeleteDialog from './ActionsPage/components/EDSActionDeleteDialog';
import WidgetlessActionDeleteDialog from './ActionsPage/components/WidgetlessActionDeleteDialog';
import { hasWidget } from './ActionsPage/utils/widgetUtils';

export default function ActionsPage() {
  useRequireConnectedServer();
  const { handleAsync } = useErrorNotification();
  const location = useLocation();

  const [tools, setTools] = useState<MCPTool[]>([]);
  const [selectedServer, setSelectedServer] = useState<MCPServer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Refs for editor/panel actions
  const editorRef = useRef<UnifiedActionEditorRef>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Dialogs
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<MCPTool | null>(null);
  const [editingWidget, setEditingWidget] = useState<MCPResource | null>(null);
  const [isExecutionPanelOpen, setIsExecutionPanelOpen] = useState(false);
  const [executingAction, setExecutingAction] = useState<MCPTool | null>(null);
  const [executingWidget, setExecutingWidget] = useState<MCPResource | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [actionToDelete, setActionToDelete] = useState<MCPTool | null>(null);
  const [isReviewDraftsOpen, setIsReviewDraftsOpen] = useState(false);

  // Drafts
  const [draftActionNames, setDraftActionNames] = useState<Set<string>>(new Set());

  // Widget operations
  const { widgetsMap, loadWidgets, saveWidget, getWidgetForAction, fetchWidgetDetails } = useWidgetOperations();

  // Tools loader hook
  const { loadTools } = useToolsLoader({
    setTools,
    setSelectedTool: () => {}, // Not used in card view
    setSelectedServer,
    setError,
    setLoading,
    setHistory: () => {}, // Not used in card view
    setDraftActionNames,
    setExecutionResponse: () => {}, // Not used in card view
    setCopyStatus: () => {} // Not used in card view
  });

  // Action CRUD hook
  const { handleSaveAction, handleAddAction } = useActionCRUD({
    selectedServer,
    tools,
    loadTools,
    setSelectedTool: () => {}, // Not used in card view
    setIsEditDialogOpen,
    handleAsync
  });

  // Action deletion hook
  const { handleDeleteAction } = useActionDeletion({
    selectedTool: actionToDelete,
    selectedServer,
    loadTools,
    setSelectedTool: setActionToDelete,
    setIsDeleteDialogOpen,
    handleAsync
  });

  // Load tools and widgets on mount
  useEffect(() => {
    const initLoad = async () => {
      await loadTools(false);
    };
    initLoad();

    // Listen for server events
    const handleServerConnected = () => {
      loadTools(true);
    };

    const handleServerDisconnected = () => {
      safeRemoveSessionStorage(STORAGE_KEYS.TOOLS_LOADED_FOR_SERVER);
      setTools([]);
    };

    window.addEventListener(EVENTS.SERVER_CONNECTED, handleServerConnected);
    window.addEventListener(EVENTS.SERVER_DISCONNECTED, handleServerDisconnected);

    return () => {
      window.removeEventListener(EVENTS.SERVER_CONNECTED, handleServerConnected);
      window.removeEventListener(EVENTS.SERVER_DISCONNECTED, handleServerDisconnected);
    };
  }, []);

  // Load widgets when tools change
  useEffect(() => {
    if (selectedServer && tools.length > 0) {
      loadWidgets(selectedServer.id, tools);
    }
  }, [selectedServer, tools, loadWidgets]);

  // Update deleted actions when changelog changes
  useEffect(() => {
    const handleChangelogUpdate = async () => {
      const changelogEntries = await changelogService.getUncommittedEntries();
      const deletedActionNames = new Set(
        changelogEntries
          .filter(e => e.type === 'action_deleted')
          .map(e => e.actionName)
      );

      setTools(prevTools =>
        prevTools.map(tool => ({
          ...tool,
          deleted: deletedActionNames.has(tool.name)
        }))
      );
    };

    window.addEventListener('lcb-changelog-updated', handleChangelogUpdate);
    return () => {
      window.removeEventListener('lcb-changelog-updated', handleChangelogUpdate);
    };
  }, []);

  // Reload tools when navigating back to this page
  useEffect(() => {
    if (location.pathname === '/actions') {
      loadTools(true);
    } else {
      safeRemoveSessionStorage(STORAGE_KEYS.TOOLS_LOADED_FOR_SERVER);
    }
  }, [location.pathname]);

  const handleConnectServer = async () => {
    if (!selectedServer) return;

    setConnecting(true);
    setError(null);

    const serverId = selectedServer.id;
    safeRemoveSessionStorage(STORAGE_KEYS.TOOLS_LOADED_FOR_SERVER);
    setTools([]);

    try {
      await handleAsync(
        async () => {
          await apiClient.connectServer(serverId);
          dispatchAppEvent('SERVER_CONNECTED', { serverId });

          const servers = await apiClient.getServers();
          const server = servers.find(s => s.id === serverId);
          if (server) {
            setSelectedServer(server);
          }

          return await loadTools(true);
        },
        {
          errorContext: ErrorMessages.CONNECT_SERVER,
          onError: () => {
            setError(ErrorMessages.CONNECT_SERVER);
          }
        }
      );
    } finally {
      setConnecting(false);
    }
  };

  const handleEdit = async (action: MCPTool) => {
    setEditingAction(action);
    
    // If the action has a widget, fetch the full widget details including _meta
    const outputTemplateUri = action._meta?.['openai/outputTemplate'];
    if (outputTemplateUri && selectedServer) {
      const fullWidget = await fetchWidgetDetails(selectedServer.id, outputTemplateUri);
      setEditingWidget(fullWidget);
    } else {
      setEditingWidget(null);
    }
    
    setIsEditDialogOpen(true);
  };

  const handleExecute = async (action: MCPTool) => {
    setExecutingAction(action);
    setIsExecutionPanelOpen(true);
    
    // Fetch widget if action has one
    if (selectedServer && hasWidget(action)) {
      const basicWidget = getWidgetForAction(action.name);
      if (basicWidget && basicWidget.uri) {
        const fullWidget = await fetchWidgetDetails(selectedServer.id, basicWidget.uri);
        setExecutingWidget(fullWidget || null);
      } else {
        setExecutingWidget(null);
      }
    } else {
      setExecutingWidget(null);
    }
  };

  const handleExecuteAction = async (args: Record<string, string>) => {
    if (!executingAction || !selectedServer) throw new Error('No action or server selected');

    const result = await apiClient.executeTool(selectedServer.id, executingAction.name, args);
    return result;
  };

  const handleUnifiedSave = async (actionUpdates: Partial<MCPTool>, widgetUpdates?: Partial<MCPResource>) => {
    if (!editingAction || !selectedServer) return;

    try {
      // Save action updates
      await handleSaveAction(editingAction.name, actionUpdates);

      // Save widget updates if provided
      if (widgetUpdates && editingAction._meta?.['openai/outputTemplate']) {
        await saveWidget(selectedServer.id, editingAction._meta['openai/outputTemplate'], widgetUpdates, editingWidget || undefined);
      }

      // Reload tools and widgets
      await loadTools(true);
    } catch (error) {
      console.error('Failed to save:', error);
    }
  };

  const filteredTools = filterToolsByQuery(tools, searchQuery);

  return (
    <div className={style({ padding: 24, height: 'full', display: 'flex', flexDirection: 'column' })}>
      <div className={style({ display: 'flex', flexDirection: 'column', gap: 24, flex: 1, minHeight: 0 })}>
        {/* Header */}
        <div className={style({ display: 'flex', flexDirection: 'column', gap: 16 })}>
          <div className={style({ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' })}>
            <SpectrumText 
              styles={style({ font: 'heading-2xl', fontWeight: 'bold' })}
              UNSAFE_style={{ fontSize: '28px', letterSpacing: '-0.02em' }}
            >
              Actions & Widgets
            </SpectrumText>
            <div className={style({ display: 'flex', flexDirection: 'row', gap: 8 })}>
              {isLocalManagedServer(selectedServer) && draftActionNames.size > 0 && (
                <Button
                  variant="secondary"
                  onPress={() => setIsReviewDraftsOpen(true)}
                >
                  {`Review Drafts (${draftActionNames.size})`}
                </Button>
              )}
              <ActionButton
                aria-label="Refresh"
                onPress={() => loadTools(true, true)}
                isDisabled={loading}
                isQuiet
              >
                <Refresh />
              </ActionButton>
              {isLocalManagedServer(selectedServer) && (
                <Button
                  variant="accent"
                  onPress={() => setIsAddDialogOpen(true)}
                >
                  <Add />
                  <SpectrumText>Add Action</SpectrumText>
                </Button>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <TextField
            aria-label="Search actions"
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search actions..."
            UNSAFE_style={{ width: '100%', maxWidth: '400px' }}
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className={style({ padding: 24, backgroundColor: 'red-100', borderRadius: 'lg' })}>
            <p className={style({ font: 'body', color: 'red-900', margin: 0 })}>
              {error}
            </p>
            {selectedServer && selectedServer.status === 'disconnected' && (
              <Button
                variant="accent"
                onPress={handleConnectServer}
                isDisabled={connecting}
                UNSAFE_style={{ marginTop: '12px' }}
              >
                {connecting ? 'Connecting...' : 'Connect'}
              </Button>
            )}
          </div>
        )}

        {/* Main Content */}
        {selectedServer && selectedServer.status === 'connected' && (
          <div className={style({ flex: 1, overflow: 'auto' })}>
            <ActionsGrid
              tools={filteredTools}
              widgets={widgetsMap}
              draftActionNames={draftActionNames}
              isLocalManaged={isLocalManagedServer(selectedServer)}
              loading={loading}
              onEdit={handleEdit}
              onExecute={handleExecute}
            />
          </div>
        )}

        {/* Unified Editor (Modal) */}
        <DialogContainer onDismiss={() => { 
          setIsEditDialogOpen(false); 
          setEditingAction(null);
          setEditingWidget(null);
        }}>
          {isEditDialogOpen && editingAction && (
            <Dialog size="XL">
              {({ close }) => (
                <>
                  <Heading slot="title">{`Edit ${editingAction.name}`}</Heading>
                  <Content>
                    <UnifiedActionEditor
                      ref={editorRef}
                      isOpen={isEditDialogOpen}
                      action={editingAction}
                      widget={editingWidget}
                      onClose={() => {
                        setIsEditDialogOpen(false);
                        setEditingAction(null);
                        setEditingWidget(null);
                        close();
                      }}
                      onSave={handleUnifiedSave}
                      serverId={selectedServer?.id}
                    />
                  </Content>
                  <ButtonGroup>
                    <Button variant="secondary" onPress={close}>
                      Cancel
                    </Button>
                    <Button 
                      variant="accent" 
                      onPress={() => editorRef.current?.handleSave()}
                    >
                      Save Changes
                    </Button>
                  </ButtonGroup>
                </>
              )}
            </Dialog>
          )}
        </DialogContainer>

        {/* Execution Panel (Modal) */}
        <DialogContainer onDismiss={() => { setIsExecutionPanelOpen(false); setExecutingAction(null); }}>
          {isExecutionPanelOpen && executingAction && (
            <Dialog size="XL">
              {({ close }) => (
                <>
                  <Heading slot="title">{`Execute: ${executingAction.name}`}</Heading>
                  <Content>
                    <ExecutionPanel
                      isOpen={isExecutionPanelOpen}
                      action={executingAction}
                      onClose={() => {
                        setIsExecutionPanelOpen(false);
                        setExecutingAction(null);
                        setExecutingWidget(null);
                        close();
                      }}
                      onExecute={handleExecuteAction}
                      widget={executingWidget}
                      serverId={selectedServer?.id}
                    />
                  </Content>
                  <ButtonGroup>
                    <Button variant="secondary" onPress={close}>
                      Close
                    </Button>
                  </ButtonGroup>
                </>
              )}
            </Dialog>
          )}
        </DialogContainer>

        {/* Add Action Dialog */}
        <CreateActionWizard
          isOpen={isAddDialogOpen}
          onClose={() => setIsAddDialogOpen(false)}
          onAdd={handleAddAction}
          existingActions={tools}
          serverId={selectedServer?.id || ''}
          connectedServer={selectedServer}
        />

        {/* Delete Action Confirmation Dialog */}
        <DialogContainer onDismiss={() => setIsDeleteDialogOpen(false)}>
          {isDeleteDialogOpen && actionToDelete && (
            hasWidget(actionToDelete) ? (
              <EDSActionDeleteDialog
                actionName={actionToDelete.name}
                serverId={selectedServer?.id || ''}
                action={actionToDelete}
                onConfirm={() => {
                  handleDeleteAction();
                  setIsDeleteDialogOpen(false);
                }}
                onCancel={() => setIsDeleteDialogOpen(false)}
              />
            ) : (
              <WidgetlessActionDeleteDialog
                actionName={actionToDelete.name}
                onConfirm={() => {
                  handleDeleteAction();
                  setIsDeleteDialogOpen(false);
                }}
                onCancel={() => setIsDeleteDialogOpen(false)}
              />
            )
          )}
        </DialogContainer>

        {/* Review Drafts Modal */}
        {selectedServer && (
          <ReviewDraftsModal
            serverId={selectedServer.id}
            isOpen={isReviewDraftsOpen}
            onClose={() => {
              setIsReviewDraftsOpen(false);
              loadTools(true);
            }}
          />
        )}


        <ToastContainer />
      </div>
    </div>
  );
}

