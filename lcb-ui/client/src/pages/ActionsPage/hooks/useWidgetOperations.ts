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

import { useState, useCallback } from 'react';
import type { MCPResource, MCPTool } from '../../../../../shared/types';
import { apiClient } from '../../../services/api';
import { changelogService } from '../../../services/changelog';
import { EDS_WIDGET_META } from '../../../constants/edsWidgetMeta';
import { ACTION_META } from '../../../constants/actionMeta';

export function useWidgetOperations() {
  const [widgetsMap, setWidgetsMap] = useState<Map<string, MCPResource>>(new Map());
  const [loadingWidgets, setLoadingWidgets] = useState(false);

  /**
   * Load widgets for a server and correlate them with actions
   */
  const loadWidgets = useCallback(async (serverId: string, actions: MCPTool[]) => {
    try {
      setLoadingWidgets(true);

      // Load widgets from MCP server
      const serverResources = await apiClient.getResourcesForServer(serverId);
      
      // Load widget resources from database
      const dbResources = await apiClient.getWidgetResources(serverId);

      // Load resource drafts
      const drafts = await apiClient.getResourceDrafts(serverId);
      const draftMap = new Map(drafts.map(d => [d.uri, d]));

      // Get deleted resource URIs from changelog
      const changelogEntries = await changelogService.getUncommittedEntries();
      const deletedResourceUris = new Set(
        changelogEntries
          .filter(e => e.type === 'resource_deleted')
          .map(e => e.resourceUri)
      );

      // Merge server resources with drafts
      const serverResourcesOverlaid = serverResources.map(r => {
        const draft = draftMap.get(r.uri);
        if (!draft) return r;
        
        return {
          ...r,
          name: draft.name ?? r.name,
          description: draft.description ?? r.description,
          mimeType: draft.mimeType ?? r.mimeType,
          _meta: draft._meta ?? r._meta,
          draft: true
        };
      });

      // Deduplicate resources by URI
      const resourceMap = new Map<string, MCPResource>();
      serverResourcesOverlaid.forEach(r => resourceMap.set(r.uri, r));
      dbResources.forEach(r => resourceMap.set(r.uri, r));

      // Apply deleted flags
      const allResources = Array.from(resourceMap.values()).map(resource => ({
        ...resource,
        deleted: resource.deleted || deletedResourceUris.has(resource.uri)
      }));

      // Correlate widgets with actions
      const widgetsMap = new Map<string, MCPResource>();
      
      actions.forEach(action => {
        const outputTemplateUri = action._meta?.[ACTION_META.OUTPUT_TEMPLATE];
        if (outputTemplateUri) {
          const widget = allResources.find(r => r.uri === outputTemplateUri);
          if (widget) {
            widgetsMap.set(action.name, {
              ...widget,
              actionName: action.name
            });
          }
        }
      });

      setWidgetsMap(widgetsMap);
      return widgetsMap;
    } catch (error) {
      console.error('[useWidgetOperations] Failed to load widgets:', error);
      throw error;
    } finally {
      setLoadingWidgets(false);
    }
  }, []);

  /**
   * Save widget updates to database
   */
  const saveWidget = useCallback(async (
    serverId: string,
    resourceUri: string,
    updates: Partial<MCPResource>,
    originalWidget?: MCPResource
  ) => {
    try {
      await apiClient.upsertResourceDraft(serverId, resourceUri, updates);

      // Track changes to changelog
      // Use originalWidget if provided (from editor), otherwise fall back to widgetsMap
      const widget = originalWidget || widgetsMap.get(updates.actionName || '');

      if (widget) {
        // Track description changes
        if (widget.description !== updates.description) {
          await changelogService.addEntry(
            'resource_description_changed',
            updates.actionName || '',
            `Updated MCP description for widget "${widget.name || widget.uri}"`,
            {
              resourceUri: widget.uri,
              oldValue: widget.description,
              newValue: updates.description
            }
          );
        }

        // Track widget description changes
        if (widget._meta?.[EDS_WIDGET_META.WIDGET_DESCRIPTION] !== updates._meta?.[EDS_WIDGET_META.WIDGET_DESCRIPTION]) {
          await changelogService.addEntry(
            'resource_widget_description_changed',
            updates.actionName || '',
            `Updated OpenAI widget description for "${widget.name || widget.uri}"`,
            {
              resourceUri: widget.uri,
              oldValue: widget._meta?.[EDS_WIDGET_META.WIDGET_DESCRIPTION],
              newValue: updates._meta?.[EDS_WIDGET_META.WIDGET_DESCRIPTION]
            }
          );
        }

        // Track template URL changes
        const originalScriptUrl = widget._meta?.[EDS_WIDGET_META.LCB_WIDGET_META]?.[EDS_WIDGET_META.SCRIPT_URL] || '';
        const newScriptUrl = updates._meta?.[EDS_WIDGET_META.LCB_WIDGET_META]?.[EDS_WIDGET_META.SCRIPT_URL] || '';
        
        if (originalScriptUrl !== newScriptUrl) {
          await changelogService.addEntry(
            'resource_script_url_changed',
            updates.actionName || '',
            `Updated Script URL for "${widget.name || widget.uri}"`,
            {
              resourceUri: widget.uri,
              oldValue: originalScriptUrl,
              newValue: newScriptUrl
            }
          );
        }

        const originalEmbedUrl = widget._meta?.[EDS_WIDGET_META.LCB_WIDGET_META]?.[EDS_WIDGET_META.WIDGET_EMBED_URL] || '';
        const newEmbedUrl = updates._meta?.[EDS_WIDGET_META.LCB_WIDGET_META]?.[EDS_WIDGET_META.WIDGET_EMBED_URL] || '';
        
        if (originalEmbedUrl !== newEmbedUrl) {
          await changelogService.addEntry(
            'resource_widget_embed_url_changed',
            updates.actionName || '',
            `Updated Widget Embed URL for "${widget.name || widget.uri}"`,
            {
              resourceUri: widget.uri,
              oldValue: originalEmbedUrl,
              newValue: newEmbedUrl
            }
          );
        }
      }
    } catch (error) {
      console.error('[useWidgetOperations] Failed to save widget:', error);
      throw error;
    }
  }, [widgetsMap]);

  /**
   * Get widget for a specific action
   */
  const getWidgetForAction = useCallback((actionName: string): MCPResource | undefined => {
    return widgetsMap.get(actionName);
  }, [widgetsMap]);

  /**
   * Fetch full widget details including _meta
   */
  const fetchWidgetDetails = useCallback(async (serverId: string, resourceUri: string): Promise<MCPResource | null> => {
    try {
      console.log('[useWidgetOperations] Fetching full resource details for:', resourceUri);
      
      // Get the resource from the widgets map first (for basic info)
      const basicWidget = Array.from(widgetsMap.values()).find(w => w.uri === resourceUri);
      
      // Fetch the full resource with _meta from the server
      const response = await fetch(`/api/resources/server/${serverId}/resource?uri=${encodeURIComponent(resourceUri)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch resource: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('[useWidgetOperations] Fetched full resource:', data.resource);
      
      // Merge with basic widget info
      return {
        ...basicWidget,
        ...data.resource,
        actionName: basicWidget?.actionName
      };
    } catch (error) {
      console.error('[useWidgetOperations] Failed to fetch widget details:', error);
      return null;
    }
  }, [widgetsMap]);

  return {
    widgetsMap,
    loadingWidgets,
    loadWidgets,
    saveWidget,
    getWidgetForAction,
    fetchWidgetDetails
  };
}

