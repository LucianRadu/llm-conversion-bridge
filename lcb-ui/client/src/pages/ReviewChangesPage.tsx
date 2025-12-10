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

import { useEffect, useState } from 'react';
import {
  Text as SpectrumText,
  ActionButton,
  Button,
  ButtonGroup,
  ProgressCircle,
  Badge,
  InlineAlert,
  Content,
  Heading,
  TooltipTrigger,
  Tooltip,
  IllustratedMessage,
  Accordion,
  Disclosure,
  DisclosureTitle,
  DisclosurePanel,
  Dialog,
  DialogContainer,
  ToggleButton
} from '@react-spectrum/s2';
import { style } from '@react-spectrum/s2/style' with { type: 'macro' };
import Export from '@react-spectrum/s2/icons/Export';
import Refresh from '@react-spectrum/s2/icons/Refresh';
import Checkmark from '@react-spectrum/s2/icons/Checkmark';
import Document from '@react-spectrum/s2/illustrations/gradient/generic1/Document';
import * as Diff from 'diff';
import type { MCPTool, MCPResource } from '../../../shared/types';
import { apiClient } from '../services/api';
import { toastService } from '../services/toast';
import { useConnectedServer } from '../hooks/useConnectedServer';
import DeployChangesDialog from '../components/DeployChangesDialog';
import type { Key } from 'react-aria-components';

// Extend MCPTool to include id for tracking and associated widget changes
interface ChangeItem extends MCPTool {
  id: string;
  timestamp: string;
  widgetChange?: MCPResource; // Associated widget resource change
  isWidgetOnlyChange?: boolean; // True if only the widget changed, not the action itself
}

export default function ReviewChangesPage() {
  const connectedServer = useConnectedServer();
  const [changes, setChanges] = useState<ChangeItem[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<Set<Key>>(new Set());
  const [loading, setLoading] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isDeployDialogOpen, setIsDeployDialogOpen] = useState(false);
  const [shouldStartDeployment, setShouldStartDeployment] = useState(false);
  const [showDiffView, setShowDiffView] = useState<Record<string, boolean>>({});
  const [showWidgetDiffView, setShowWidgetDiffView] = useState<Record<string, boolean>>({});
  const [originalVersions, setOriginalVersions] = useState<Record<string, MCPTool>>({});
  const [originalWidgetVersions, setOriginalWidgetVersions] = useState<Record<string, MCPResource>>({});

  const loadChanges = async () => {
    if (!connectedServer) return;
    
    setLoading(true);
    try {
      // Load all uncommitted action changes
      const modifiedDrafts = await apiClient.getActionDrafts(connectedServer.id);
      const allActions = await apiClient.getActions(connectedServer.id);

      // Create mutually exclusive filters to avoid duplicates:
      // 1. Deleted actions (deleted: true) - highest priority
      // 2. Newly created actions (deployed: false AND NOT deleted) - second priority
      // 3. Modified drafts (from drafts collection) - third priority
      const deletedActions = allActions.filter(a => a.deleted === true);
      const newlyCreatedActions = allActions.filter(a => a.deployed === false && a.deleted !== true);

      // Combine all types of uncommitted action changes
      const actionChanges: ChangeItem[] = [...deletedActions, ...newlyCreatedActions, ...modifiedDrafts].map((change) => ({
        ...change,
        id: change.name,
        timestamp: new Date().toISOString()
      }));

      // Load all uncommitted resource/widget changes
      const resourceDrafts = await apiClient.getResourceDrafts(connectedServer.id);
      
      // Create a map of actionName -> widget resource change
      const widgetChangesByAction = new Map<string, MCPResource>();
      for (const resource of resourceDrafts) {
        if (resource.actionName) {
          widgetChangesByAction.set(resource.actionName, resource);
        }
      }

      // Merge widget changes into action changes
      const actionChangesWithWidgets = actionChanges.map(change => ({
        ...change,
        widgetChange: widgetChangesByAction.get(change.name)
      }));

      // Find widget-only changes (widgets with changes but no corresponding action change)
      const actionNamesWithChanges = new Set(actionChanges.map(c => c.name));
      const widgetOnlyChanges: ChangeItem[] = [];
      
      for (const [actionName, resource] of widgetChangesByAction) {
        if (!actionNamesWithChanges.has(actionName)) {
          // This widget's action has no changes, create a synthetic entry
          widgetOnlyChanges.push({
            name: actionName,
            id: actionName,
            timestamp: new Date().toISOString(),
            widgetChange: resource,
            isWidgetOnlyChange: true
          });
        }
      }

      // Combine all changes
      const allChanges = [...actionChangesWithWidgets, ...widgetOnlyChanges];
      setChanges(allChanges);

      // Enable diff view by default for all changes
      const defaultDiffView: Record<string, boolean> = {};
      const defaultWidgetDiffView: Record<string, boolean> = {};
      for (const change of allChanges) {
        // Enable action diff for non-widget-only changes that have drafts
        if (!change.isWidgetOnlyChange && change.draft) {
          defaultDiffView[change.name] = true;
        }
        // Enable widget diff for changes with widget changes
        if (change.widgetChange?.draft) {
          defaultWidgetDiffView[change.name] = true;
        }
      }
      setShowDiffView(defaultDiffView);
      setShowWidgetDiffView(defaultWidgetDiffView);

      // Start with all changes collapsed
      setExpandedKeys(new Set());
    } catch (e) {
      toastService.error('Failed to load changes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChanges();
  }, [connectedServer]);

  const formatTimestamp = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const handleExport = (change: ChangeItem) => {
    const blob = new Blob([JSON.stringify(change, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${change.name}-change.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleApplyChanges = () => {
    if (!connectedServer) return;
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmDeploy = () => {
    setIsConfirmDialogOpen(false);
    setShouldStartDeployment(true); // Trigger deployment
    setIsDeployDialogOpen(true);
  };

  // Auto-load diffs when actions are expanded
  useEffect(() => {
    const loadDiffsForExpandedItems = async () => {
      if (!connectedServer) return;

      for (const key of expandedKeys) {
        const actionName = key as string;
        const change = changes.find(c => c.id === actionName);
        if (!change) continue;

        // Load action diff if it's an updated action and not already loaded
        if (change.draft && !change.deleted && change.deployed !== false && !originalVersions[actionName]) {
          try {
            const response = await fetch(`/api/actions/${connectedServer.id}/${actionName}/compare`);
            if (response.ok) {
              const data = await response.json();
              if (data.original) {
                setOriginalVersions(prev => ({ ...prev, [actionName]: data.original }));
                setShowDiffView(prev => ({ ...prev, [actionName]: true }));
              }
            }
          } catch (error) {
            console.error('Failed to fetch original version:', error);
          }
        }

        // Load widget diff if there's a widget change and not already loaded
        if (change.widgetChange && !originalWidgetVersions[actionName]) {
          try {
            const response = await fetch(`/api/widget-resources/${connectedServer.id}/compare/${encodeURIComponent(actionName)}`);
            if (response.ok) {
              const data = await response.json();
              if (data.original) {
                setOriginalWidgetVersions(prev => ({ ...prev, [actionName]: data.original }));
                setShowWidgetDiffView(prev => ({ ...prev, [actionName]: true }));
              }
            }
          } catch (error) {
            console.error('Failed to fetch original widget version:', error);
          }
        }
      }
    };

    loadDiffsForExpandedItems();
  }, [expandedKeys, connectedServer, changes, originalVersions, originalWidgetVersions]);

  const toggleDiffView = async (actionName: string) => {
    const isCurrentlyShowing = showDiffView[actionName];
    
    if (!isCurrentlyShowing && !originalVersions[actionName] && connectedServer) {
      // Fetch original version if not already loaded
      try {
        const response = await fetch(`/api/actions/${connectedServer.id}/${actionName}/compare`);
        if (response.ok) {
          const data = await response.json();
          if (data.original) {
            setOriginalVersions(prev => ({ ...prev, [actionName]: data.original }));
          }
        }
      } catch (error) {
        console.error('Failed to fetch original version:', error);
        toastService.error('Failed to load original version for comparison');
        return;
      }
    }
    
    setShowDiffView(prev => ({ ...prev, [actionName]: !isCurrentlyShowing }));
  };

  const toggleWidgetDiffView = async (actionName: string) => {
    const isCurrentlyShowing = showWidgetDiffView[actionName];
    
    if (!isCurrentlyShowing && !originalWidgetVersions[actionName] && connectedServer) {
      // Fetch original widget version if not already loaded
      try {
        const response = await fetch(`/api/widget-resources/${connectedServer.id}/compare/${encodeURIComponent(actionName)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.original) {
            setOriginalWidgetVersions(prev => ({ ...prev, [actionName]: data.original }));
          }
        }
      } catch (error) {
        console.error('Failed to fetch original widget version:', error);
        toastService.error('Failed to load original widget version for comparison');
        return;
      }
    }
    
    setShowWidgetDiffView(prev => ({ ...prev, [actionName]: !isCurrentlyShowing }));
  };

  // Normalize data to match schema.json structure (remove runtime fields)
  const normalizeForComparison = (data: any) => {
    // Only keep fields that belong in schema.json
    const normalized: any = {
      name: data.name,
      version: data.version,
      isPublished: data.isPublished,
      hasAemWidget: data.hasAemWidget,
      definition: {
        title: data.title || data.definition?.title,
        description: data.description || data.definition?.description
      }
    };

    // Add inputSchema if it exists
    const inputSchema = data.inputSchema || data.definition?.inputSchema;
    if (inputSchema) {
      normalized.definition.inputSchema = inputSchema;
    }

    // Add annotations only if they exist in definition (from schema.json)
    // Ignore top-level annotations which may be fabricated by MCP client
    const annotations = data.definition?.annotations;
    if (annotations && Object.keys(annotations).length > 0) {
      normalized.definition.annotations = annotations;
    }

    // Add _meta only if it exists in definition (from schema.json)
    // Ignore top-level _meta which may be from MCP client
    const meta = data.definition?._meta;
    if (meta && Object.keys(meta).length > 0) {
      normalized.definition._meta = meta;
    }

    return normalized;
  };

  const renderDiff = (change: ChangeItem) => {
    const original = originalVersions[change.name];
    
    // If no original loaded yet, check if it's actually a new action (deployed: false)
    // or if we just haven't fetched the original yet
    if (!original) {
      if (change.deployed === false) {
        // Truly a new action
        return (
          <div className={style({ padding: 16, backgroundColor: 'gray-75', borderRadius: 'lg' })}>
            <SpectrumText styles={style({ font: 'body', color: 'gray-700' })}>
              No deployed version found. This appears to be a new action.
            </SpectrumText>
          </div>
        );
      } else {
        // Deployed action but original not loaded yet - show message
        return (
          <div className={style({ padding: 16, backgroundColor: 'gray-75', borderRadius: 'lg' })}>
            <SpectrumText styles={style({ font: 'body', color: 'gray-700' })}>
              Click "Show Changes" to view the differences from the deployed version.
            </SpectrumText>
          </div>
        );
      }
    }

    // Merge original's metadata fields into the draft (draft only stores changes, not full metadata)
    // This ensures version, isPublished, hasAemWidget etc. are inherited from original if not in draft
    // Cast to any since schema.json structure differs from MCPTool type
    const changeAny = change as any;
    const originalAny = original as any;
    const mergedDraft = {
      ...change,
      version: change.version ?? originalAny.version,
      isPublished: changeAny.isPublished ?? originalAny.isPublished,
      hasAemWidget: changeAny.hasAemWidget ?? originalAny.hasAemWidget,
      definition: {
        ...originalAny.definition,
        ...changeAny.definition,
        // Overlay draft's editable fields
        title: change.title || changeAny.definition?.title || originalAny.definition?.title,
        description: change.description || changeAny.definition?.description || originalAny.definition?.description,
        inputSchema: change.inputSchema || changeAny.definition?.inputSchema || originalAny.definition?.inputSchema
      }
    };

    // Normalize both versions to only include schema.json fields
    const normalizedOriginal = normalizeForComparison(original);
    const normalizedDraft = normalizeForComparison(mergedDraft);

    const originalJson = JSON.stringify(normalizedOriginal, null, 2);
    const draftJson = JSON.stringify(normalizedDraft, null, 2);
    const diff = Diff.diffLines(originalJson, draftJson);

    return (
      <div className={style({ 
        font: 'code-xs', 
        backgroundColor: 'gray-75', 
        padding: 16, 
        borderRadius: 'lg',
        borderWidth: 1,
        borderColor: 'gray-200'
      })}>
        <pre className={style({ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' })} style={{ lineHeight: 1.6 }}>
          {diff.map((part, index) => {
            const color = part.added ? '#d4edda' : part.removed ? '#f8d7da' : 'transparent';
            const textColor = part.added ? '#155724' : part.removed ? '#721c24' : '#212529';
            return (
              <span 
                key={index}
                style={{ 
                  backgroundColor: color,
                  color: textColor,
                  display: part.added || part.removed ? 'block' : 'inline'
                }}
              >
                {part.added && '+ '}
                {part.removed && '- '}
                {part.value}
              </span>
            );
          })}
        </pre>
      </div>
    );
  };

  const renderWidgetDiff = (change: ChangeItem) => {
    if (!change.widgetChange) return null;
    
    const original = originalWidgetVersions[change.name];
    if (!original) {
      return (
        <div className={style({ padding: 16, backgroundColor: 'gray-75', borderRadius: 'lg' })}>
          <SpectrumText styles={style({ font: 'body', color: 'gray-700' })}>
            No deployed widget version found. This appears to be a new widget.
          </SpectrumText>
        </div>
      );
    }

    // Merge original's fields into draft
    // Only use draft values for editable fields (description, _meta)
    // Always use original values for structural fields (uri, name, mimeType)
    const draft = change.widgetChange;
    const mergedDraft = {
      // Structural fields - always from original
      uri: original.uri,
      name: original.name,
      mimeType: original.mimeType,
      // Editable fields - use draft if available
      description: draft.description ?? original.description,
      // Merge _meta: start with original, overlay only changed draft fields
      _meta: {
        ...(original._meta || {}),
        // Only overlay _meta fields that actually have values in draft
        ...Object.fromEntries(
          Object.entries(draft._meta || {}).filter(([_, v]) => v !== '' && v !== undefined && v !== null)
        )
      }
    };

    // Normalize widget data for comparison (only include widget-schema.json fields)
    const normalizeWidget = (data: any) => ({
      uri: data.uri,
      name: data.name,
      description: data.description,
      mimeType: data.mimeType,
      // Only include _meta if it has content
      ...(data._meta && Object.keys(data._meta).length > 0 ? { _meta: data._meta } : {})
    });

    const normalizedOriginal = normalizeWidget(original);
    const normalizedDraft = normalizeWidget(mergedDraft);

    const originalJson = JSON.stringify(normalizedOriginal, null, 2);
    const draftJson = JSON.stringify(normalizedDraft, null, 2);
    const diff = Diff.diffLines(originalJson, draftJson);

    return (
      <div className={style({ 
        font: 'code-xs', 
        backgroundColor: 'gray-75', 
        padding: 16, 
        borderRadius: 'lg',
        borderWidth: 1,
        borderColor: 'gray-200'
      })}>
        <pre className={style({ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' })} style={{ lineHeight: 1.6 }}>
          {diff.map((part, index) => {
            const color = part.added ? '#d4edda' : part.removed ? '#f8d7da' : 'transparent';
            const textColor = part.added ? '#155724' : part.removed ? '#721c24' : '#212529';
            return (
              <span 
                key={index}
                style={{ 
                  backgroundColor: color,
                  color: textColor,
                  display: part.added || part.removed ? 'block' : 'inline'
                }}
              >
                {part.added && '+ '}
                {part.removed && '- '}
                {part.value}
              </span>
            );
          })}
        </pre>
      </div>
    );
  };


  if (loading) {
    return (
      <div className={style({ display: 'flex', flexDirection: 'column', height: 'full', overflow: 'hidden' })}>
        {/* Header */}
        <div className={style({ padding: 32, paddingBottom: 24 })}>
          <div className={style({ display: 'flex', flexDirection: 'column', gap: 8 })}>
            <SpectrumText 
              styles={style({ font: 'heading-2xl', fontWeight: 'bold' })}
              UNSAFE_style={{ fontSize: '28px', letterSpacing: '-0.02em' }}
            >
              Review Changes
            </SpectrumText>
            <SpectrumText 
              styles={style({ font: 'body', color: 'gray-700' })}
              UNSAFE_style={{ lineHeight: 1.6, maxWidth: '600px' }}
            >
              Review uncommitted changes before deploying to your environment
            </SpectrumText>
          </div>
        </div>
        {/* Loading State */}
        <div className={style({ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          flex: 1, 
          gap: 16 
        })}>
          <ProgressCircle isIndeterminate aria-label="Loading changes" size="L" />
          <SpectrumText styles={style({ font: 'body', color: 'gray-700' })}>Loading changes…</SpectrumText>
        </div>
      </div>
    );
  }

  return (
    <div className={style({ display: 'flex', flexDirection: 'column', height: 'full', overflow: 'hidden' })}>
      {/* Header */}
      <div className={style({ padding: 32, paddingBottom: 24 })}>
        <div className={style({ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'start' })}>
          <div className={style({ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 })}>
            <SpectrumText 
              styles={style({ font: 'heading-2xl', fontWeight: 'bold' })}
              UNSAFE_style={{ fontSize: '28px', letterSpacing: '-0.02em' }}
            >
              Review Changes
            </SpectrumText>
            <SpectrumText 
              styles={style({ font: 'body', color: 'gray-700' })}
              UNSAFE_style={{ lineHeight: 1.6, maxWidth: '600px' }}
            >
              {connectedServer 
                ? `${changes.length} uncommitted ${changes.length === 1 ? 'change' : 'changes'} on ${connectedServer.name}`
                : 'Review uncommitted changes before deploying to your environment'}
            </SpectrumText>
          </div>
          <div className={style({ display: 'flex', gap: 8, alignItems: 'center' })}>
            <TooltipTrigger delay={0}>
              <ActionButton
                onPress={loadChanges}
                isDisabled={!connectedServer || loading}
                aria-label="Refresh changes"
              >
                <Refresh />
              </ActionButton>
              <Tooltip>Refresh changes</Tooltip>
            </TooltipTrigger>
            <Button 
              variant="accent" 
              onPress={handleApplyChanges}
              isDisabled={!connectedServer || loading || changes.length === 0}
              UNSAFE_style={{ flexShrink: 0 }}
            >
              <Checkmark />
              <SpectrumText>Apply Changes</SpectrumText>
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={style({ flex: 1, overflowY: 'auto', paddingX: 32, paddingBottom: 32 })}>
        {changes.length === 0 ? (
          <div className={style({ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'full' })}>
            <IllustratedMessage size="L">
              <Document />
              <Heading>No uncommitted changes</Heading>
              <Content>
                All your changes have been committed. Create or modify actions to see them here.
              </Content>
            </IllustratedMessage>
          </div>
        ) : (
          <Accordion
            expandedKeys={expandedKeys}
            onExpandedChange={setExpandedKeys}
            allowsMultipleExpanded
            size="L"
          >
            {changes.map((change) => (
              <Disclosure key={change.id} id={change.id}>
                <DisclosureTitle>
                  <div className={style({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: 'full', gap: 16 })}>
                    <div className={style({ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0 })}>
                      <div className={style({ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' })}>
                        <SpectrumText styles={style({ font: 'body', fontWeight: 'bold' })}>
                          {change.name}
                        </SpectrumText>
                        <div className={style({ display: 'flex', gap: 8 })}>
                          {change.isWidgetOnlyChange && <Badge variant="notice">WIDGET ONLY</Badge>}
                          {!change.isWidgetOnlyChange && change.deleted === true && <Badge variant="negative">DELETED</Badge>}
                          {!change.isWidgetOnlyChange && change.deployed === false && !change.deleted && <Badge variant="positive">ADDED</Badge>}
                          {!change.isWidgetOnlyChange && change.draft && !change.deleted && change.deployed !== false && <Badge variant="informative">UPDATED</Badge>}
                          {change.widgetChange && !change.isWidgetOnlyChange && <Badge variant="notice">+ WIDGET</Badge>}
                        </div>
                      </div>
                      <SpectrumText styles={style({ font: 'body-sm', color: 'gray-600' })}>
                        {formatTimestamp(change.timestamp)}
                      </SpectrumText>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <ActionButton 
                        isQuiet 
                        onPress={() => handleExport(change)}
                        aria-label="Export change"
                      >
                        <Export />
                      </ActionButton>
                    </div>
                  </div>
                </DisclosureTitle>
                <DisclosurePanel>
                  <div className={style({ display: 'flex', flexDirection: 'column', gap: 24, paddingTop: 16 })}>
                    {/* Warning for deleted actions with EDS widgets */}
                    {change.deleted === true && change.hasEdsWidget && (
                      <InlineAlert variant="negative">
                        <Heading>Warning</Heading>
                        <Content>Associated EDS Widget will also be deleted</Content>
                      </InlineAlert>
                    )}

                    {/* Action schema.json changes (skip for widget-only changes) */}
                    {!change.isWidgetOnlyChange && (
                      <>
                        {/* File path */}
                        <div className={style({ display: 'flex', flexDirection: 'column', gap: 8 })}>
                          <SpectrumText styles={style({ fontWeight: 'bold', font: 'body' })}>
                            {change.deployed === false ? 'Will create file:' : change.deleted ? 'Will delete file:' : 'Will update file:'}
                          </SpectrumText>
                          <SpectrumText styles={style({ font: 'code-sm', color: 'gray-800' })}>
                            lcb-server/server/src/actions/{change.name}/schema.json
                          </SpectrumText>
                        </div>

                        {/* JSON Preview / Diff View */}
                        <div className={style({ display: 'flex', flexDirection: 'column', gap: 8 })}>
                          <div className={style({ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' })}>
                            <SpectrumText styles={style({ fontWeight: 'bold', font: 'body' })}>
                              {showDiffView[change.name] ? 'Action Diff View' : 'Action Change Preview'}
                            </SpectrumText>
                            {/* Only show diff toggle for updated actions, not new or deleted */}
                            {change.draft && !change.deleted && change.deployed !== false && (
                              <ToggleButton
                                isSelected={showDiffView[change.name] || false}
                                onChange={() => toggleDiffView(change.name)}
                                size="S"
                              >
                                <SpectrumText>Show Diff</SpectrumText>
                              </ToggleButton>
                            )}
                          </div>
                          
                          {showDiffView[change.name] ? (
                            renderDiff(change)
                          ) : (
                            <div
                              className={style({
                                backgroundColor: 'gray-75',
                                padding: 20,
                                borderRadius: 'lg',
                                font: 'code-xs',
                                borderWidth: 1,
                                borderColor: 'gray-200'
                              })}
                            >
                              <pre 
                                className={style({ 
                                  margin: 0, 
                                  whiteSpace: 'pre-wrap', 
                                  wordBreak: 'break-all',
                                  color: 'gray-900'
                                })}
                                style={{ lineHeight: 1.6 }}
                              >
                                {JSON.stringify(change, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* Widget changes section */}
                    {change.widgetChange && (
                      <>
                        {/* Divider if there are both action and widget changes */}
                        {!change.isWidgetOnlyChange && (
                          <div className={style({ borderTopWidth: 1, borderColor: 'gray-200', marginY: 8 })} />
                        )}
                        
                        {/* Widget file path */}
                        <div className={style({ display: 'flex', flexDirection: 'column', gap: 8 })}>
                          <SpectrumText styles={style({ fontWeight: 'bold', font: 'body' })}>
                            {change.widgetChange.deployed === false ? 'Will create widget file:' : change.widgetChange.deleted ? 'Will delete widget file:' : 'Will update widget file:'}
                          </SpectrumText>
                          <SpectrumText styles={style({ font: 'code-sm', color: 'gray-800' })}>
                            lcb-server/server/src/actions/{change.name}/widget/widget-schema.json
                          </SpectrumText>
                        </div>

                        {/* Widget JSON Preview / Diff View */}
                        <div className={style({ display: 'flex', flexDirection: 'column', gap: 8 })}>
                          <div className={style({ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' })}>
                            <SpectrumText styles={style({ fontWeight: 'bold', font: 'body' })}>
                              {showWidgetDiffView[change.name] ? 'Widget Diff View' : 'Widget Change Preview'}
                            </SpectrumText>
                            {/* Show diff toggle for widget changes */}
                            {change.widgetChange.draft && !change.widgetChange.deleted && change.widgetChange.deployed !== false && (
                              <ToggleButton
                                isSelected={showWidgetDiffView[change.name] || false}
                                onChange={() => toggleWidgetDiffView(change.name)}
                                size="S"
                              >
                                <SpectrumText>Show Diff</SpectrumText>
                              </ToggleButton>
                            )}
                          </div>
                          
                          {showWidgetDiffView[change.name] ? (
                            renderWidgetDiff(change)
                          ) : (
                            <div
                              className={style({
                                backgroundColor: 'gray-75',
                                padding: 20,
                                borderRadius: 'lg',
                                font: 'code-xs',
                                borderWidth: 1,
                                borderColor: 'gray-200'
                              })}
                            >
                              <pre 
                                className={style({ 
                                  margin: 0, 
                                  whiteSpace: 'pre-wrap', 
                                  wordBreak: 'break-all',
                                  color: 'gray-900'
                                })}
                                style={{ lineHeight: 1.6 }}
                              >
                                {JSON.stringify(change.widgetChange, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </DisclosurePanel>
              </Disclosure>
            ))}
          </Accordion>
        )}
      </div>

      {/* Confirmation Dialog */}
      <DialogContainer onDismiss={() => setIsConfirmDialogOpen(false)}>
        {isConfirmDialogOpen && (
          <Dialog>
            <Heading>Review Changes</Heading>
            <Content>
              <div>
                Are you sure you want to deploy <strong>{changes.length} {changes.length === 1 ? 'change' : 'changes'}</strong> to the local environment?
                <br /><br />
                This will:
                <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                  <li>Stop any running local server instances</li>
                  <li>Build and deploy your changes</li>
                  <li>Restart the local server with the new changes</li>
                </ul>
              </div>
            </Content>
            <ButtonGroup>
              <Button variant="secondary" onPress={() => setIsConfirmDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="accent" onPress={handleConfirmDeploy}>
                Continue
              </Button>
            </ButtonGroup>
          </Dialog>
        )}
      </DialogContainer>

      {/* Deploy Changes Dialog */}
      {connectedServer && (
        <DeployChangesDialog
          key="deploy-dialog"
          isOpen={isDeployDialogOpen}
          onClose={async () => {
            setIsDeployDialogOpen(false);
            setShouldStartDeployment(false); // Reset trigger

            // Reconnect to server after successful deployment
            try {
              const reconnectResponse = await fetch(`/api/servers/${connectedServer.id}/connect`, {
                method: 'POST'
              });

              if (reconnectResponse.ok) {
                const reconnectData = await reconnectResponse.json();
                const sessionId = reconnectData.server?.sessionId || reconnectData.sessionId || 'unknown';

                if (sessionId !== 'unknown') {
                  window.dispatchEvent(new CustomEvent('lcb-server-connected', {
                    detail: { serverId: connectedServer.id }
                  }));
                  toastService.success('Reconnected to server with fresh session');
                }
              }
            } catch (reconnectError) {
              console.error('Failed to reconnect to server:', reconnectError);
              toastService.error('Failed to reconnect to server');
            }

            // Reload changes after reconnection
            loadChanges();
          }}
          connectedServer={connectedServer}
          shouldStartDeployment={shouldStartDeployment}
          onDeploymentStarted={() => setShouldStartDeployment(false)} // Reset immediately after deployment starts
        />
      )}
    </div>
  );
}

