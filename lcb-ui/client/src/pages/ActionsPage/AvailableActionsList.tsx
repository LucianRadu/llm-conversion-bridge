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

import {
  TextField,
  ProgressCircle,
  Switch,
  Badge,
  Button,
  DialogContainer,
  Dialog,
  Divider,
  Content,
  Text
} from '@react-spectrum/s2';
import { style } from '@react-spectrum/s2/style' with { type: 'macro' };
import ViewDetailIcon from '@react-spectrum/s2/icons/InfoCircle';
import { useState } from 'react';
type MCPTool = any;

// Get single badge to display based on priority
const getBadgeToShow = (tool: MCPTool, draftActionNames: Set<string>) => {
  if (tool.deleted) return { text: 'DELETED', variant: 'negative' as const, clickable: true, type: 'deleted' as const };
  if (tool.discovered) return { text: 'DISCOVERED', variant: 'purple' as const, clickable: false, type: 'discovered' as const };
  if (tool.deployed === false) return { text: 'NOT DEPLOYED', variant: 'yellow' as const, clickable: false, type: 'not_deployed' as const };
  if (tool.draft || draftActionNames.has(tool.name)) return { text: 'UPDATED', variant: 'blue' as const, clickable: true, type: 'draft' as const };
  return null;
};

interface AvailableActionsListProps {
  tools: MCPTool[];
  filteredTools: MCPTool[];
  selectedTool: MCPTool | null;
  loading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onToolSelect: (keys: Set<React.Key>) => void;
  autoOpenAEMWidgets: boolean;
  onAutoOpenChange: (checked: boolean) => void;
  isLocalManaged?: boolean;
  onRevertDraft?: (actionName: string) => Promise<void>;
  onRevertAction?: (actionName: string, type: 'draft' | 'deleted') => Promise<void>;
  draftActionNames: Set<string>;
}

export default function AvailableActionsList({
  tools,
  filteredTools,
  selectedTool,
  loading,
  searchQuery,
  onSearchChange,
  onToolSelect,
  autoOpenAEMWidgets,
  onAutoOpenChange,
  isLocalManaged = false,
  onRevertDraft,
  onRevertAction,
  draftActionNames
}: AvailableActionsListProps) {
  const [revertingActionName, setRevertingActionName] = useState<string | null>(null);
  const [isRevertConfirmOpen, setIsRevertConfirmOpen] = useState(false);
  const [pendingRevertActionName, setPendingRevertActionName] = useState<string | null>(null);
  const [revertType, setRevertType] = useState<'draft' | 'deleted'>('draft');

  const handleRevertClick = (actionName: string, type: 'draft' | 'deleted' | 'not_deployed' | 'discovered') => {
    // Only handle revertable types
    if (type === 'not_deployed' || type === 'discovered') return;

    setPendingRevertActionName(actionName);
    setRevertType(type);
    setIsRevertConfirmOpen(true);
  };

  const handleConfirmRevert = async () => {
    if (!pendingRevertActionName) return;
    
    setRevertingActionName(pendingRevertActionName);
    try {
      if (revertType === 'draft' && onRevertDraft) {
        await onRevertDraft(pendingRevertActionName);
      } else if (revertType === 'deleted' && onRevertAction) {
        await onRevertAction(pendingRevertActionName, 'deleted');
      }
    } finally {
      setRevertingActionName(null);
      setIsRevertConfirmOpen(false);
      setPendingRevertActionName(null);
      setRevertType('draft');
    }
  };

  return (
    <div
      id="available-actions-container"
      className={style({
        display: 'flex',
        flexDirection: 'column',
        height: 'full',
        overflow: 'hidden',
        borderWidth: 2,
        borderStyle: 'solid',
        borderColor: 'gray-75',
        borderRadius: 'lg',
        backgroundColor: 'base',
      })}
    >
      {/* Header with Auto open toggle - Sticky */}
      <div
        className={style({
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: 24,
          borderBottomWidth: 1,
          borderBottomColor: 'gray-200',
        })}
      >
        <div className={style({ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' })}>
          <Text styles={style({ font: 'heading', fontWeight: 'bold' })}>
            Actions ({tools.length})
          </Text>
          <div className={style({ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 })}>
            <Text styles={style({ font: 'body-sm', color: 'gray-700' })}>Auto Open EDS Widgets</Text>
            <Switch
              isSelected={autoOpenAEMWidgets}
              onChange={onAutoOpenChange}
              aria-label="Auto Open EDS Widgets"
              id="auto-open-aem-widgets-toggle"
            />
          </div>
        </div>

        {/* Search */}
        <TextField
          aria-label="Search actions"
          value={searchQuery}
          onChange={onSearchChange}
          UNSAFE_style={{ width: '100%' }}
          isDisabled={tools.length === 0}
        />
      </div>

      {/* Content Area */}
      <div className={style({ flex: 1, overflow: 'auto', padding: 24 })}>
        {loading ? (
          <div className={style({ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'full' })}>
            <ProgressCircle aria-label="Loading tools" isIndeterminate size="S" />
          </div>
        ) : filteredTools.length === 0 ? (
          <Text styles={style({ font: 'body', color: 'gray-600' })}>
            {tools.length === 0 ? 'No actions available from selected server' : 'No actions found'}
          </Text>
        ) : (
          <div className={style({ display: 'flex', flexDirection: 'column', gap: 8 })}>
            {filteredTools.map((tool) => {
              const badge = getBadgeToShow(tool, draftActionNames);
              const isSelected = selectedTool?.name === tool.name;

              return (
                <div
                  key={tool.name}
                  onClick={() => {
                    const keySet = new Set<React.Key>([tool.name]);
                    onToolSelect(keySet);
                  }}
                  className={style({
                    position: 'relative',
                    padding: 12,
                    borderRadius: 'lg',
                  })}
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: isSelected 
                      ? '2px solid var(--spectrum-global-color-blue-600)' 
                      : '2px solid var(--spectrum-global-color-gray-75)',
                    backgroundColor: isSelected ? 'var(--spectrum-global-color-blue-400)' : 'var(--spectrum-global-color-gray-50)',
                    boxShadow: isSelected ? '0 4px 12px rgba(0, 94, 184, 0.25)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'var(--spectrum-global-color-gray-100)';
                      e.currentTarget.style.border = '2px solid var(--spectrum-global-color-gray-200)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'var(--spectrum-global-color-gray-50)';
                      e.currentTarget.style.border = '2px solid var(--spectrum-global-color-gray-75)';
                    }
                  }}
                >
                  {/* Single badge based on priority: DELETED > NOT DEPLOYED > UPDATED */}
                  {badge && (
                    <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
                      {badge.clickable ? (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isLocalManaged && revertingActionName !== tool.name) {
                              handleRevertClick(tool.name, badge.type);
                            }
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.stopPropagation();
                              e.preventDefault();
                              if (isLocalManaged && revertingActionName !== tool.name) {
                                handleRevertClick(tool.name, badge.type);
                              }
                            }
                          }}
                          style={{
                            pointerEvents: isLocalManaged ? 'auto' : 'none',
                            cursor: isLocalManaged ? 'pointer' : 'default',
                            border: 'none',
                            background: 'none',
                            padding: 0,
                            margin: 0,
                            display: 'flex',
                            alignItems: 'center',
                            opacity: revertingActionName === tool.name && revertType === badge.type ? 0.6 : 1
                          }}
                          aria-label={badge.type === 'deleted' ? `Restore ${tool.name}` : `Revert ${tool.name} to server version`}
                          tabIndex={isLocalManaged ? 0 : -1}
                          role="button"
                        >
                          <Badge variant={badge.variant}>{badge.text}</Badge>
                        </div>
                      ) : (
                        <Badge variant={badge.variant}>{badge.text}</Badge>
                      )}
                    </div>
                  )}
                  <div 
                    className={style({ display: 'flex', flexDirection: 'column', gap: 4 })}
                    style={{ paddingRight: badge ? '80px' : '0' }}
                  >
                    <div className={style({ display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'center' })}>
                      {/* Show widget icon if: 1) hasEdsWidget is true, OR 2) _meta has OpenAI widget fields */}
                      {(tool.hasEdsWidget || tool._meta?.["openai/widgetAccessible"] || tool._meta?.["openai/outputTemplate"]) && (
                        <ViewDetailIcon UNSAFE_style={{ flexShrink: 0 }} />
                      )}
                      <Text styles={style({ font: 'body', fontWeight: 'bold' })}>{tool.name}</Text>
                    </div>
                    {tool.description && (
                      <Text styles={style({ font: 'body-sm', color: 'gray-700' })}>
                        {tool.description}
                      </Text>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Revert Confirmation Dialog (for both draft and deleted) */}
      <DialogContainer onDismiss={() => setIsRevertConfirmOpen(false)}>
        {isRevertConfirmOpen && (
          <Dialog>
            <Text slot="title">{revertType === 'deleted' ? 'Restore Action?' : 'Revert Draft Changes?'}</Text>
            <Divider />
            <Content>
              <div className={style({ display: 'flex', flexDirection: 'column', gap: 16 })}>
                <Text>
                  {revertType === 'deleted' ? (
                    <>
                      Are you sure you want to restore <strong>{pendingRevertActionName}</strong>? This will remove the deletion mark and restore the action.
                    </>
                  ) : (
                    <>
                      Are you sure you want to revert <strong>{pendingRevertActionName}</strong> to the
                      server version? This will discard all draft changes for this action.
                    </>
                  )}
                </Text>
                <div className={style({ display: 'flex', flexDirection: 'row', gap: 8, justifyContent: 'end' })}>
                  <Button variant="secondary" onPress={() => setIsRevertConfirmOpen(false)}>
                    <Text>Cancel</Text>
                  </Button>
                  <Button
                    variant="accent"
                    onPress={handleConfirmRevert}
                    isDisabled={revertingActionName !== null}
                  >
                    <Text>{revertingActionName === pendingRevertActionName ? (revertType === 'deleted' ? 'Restoring...' : 'Reverting...') : (revertType === 'deleted' ? 'Restore' : 'Revert')}</Text>
                  </Button>
                </div>
              </div>
            </Content>
          </Dialog>
        )}
      </DialogContainer>
    </div>
  );
}

