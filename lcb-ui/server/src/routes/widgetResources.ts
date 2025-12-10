import { Hono } from 'hono';
import { storageService } from '../services/storage';
import { writeResourceWidgetMetadata } from '../services/schemaWriter';
import type { MCPResource } from '../../../shared/types';
import type { MCPClientManager } from '../services/mcpClientManager';
import { promises as fs } from 'fs';
import path from 'path';

// Type for Hono context with mcpClientManager
type AppContext = {
  Variables: {
    mcpClientManager: MCPClientManager;
  };
};

export const widgetResourcesRouter = new Hono<AppContext>();

/**
 * GET /api/widget-resources/:serverId
 * Get all widget resources for a server
 */
widgetResourcesRouter.get('/:serverId', async (c) => {
  const serverId = c.req.param('serverId');
  try {
    const resources = await storageService.getWidgetResources(serverId);
    return c.json({ resources });
  } catch (error) {
    console.error('[Widget Resources API] Error getting resources:', error);
    return c.json({ error: 'Failed to get widget resources' }, 500);
  }
});

/**
 * Convert camelCase to kebab-case (matches backend script pattern)
 * Handles consecutive uppercase letters correctly: "helloWorldEDS" -> "hello-world-eds"
 */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')  // Add hyphen between lowercase/digit and uppercase
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2') // Handle consecutive uppercase: "XMLParser" -> "XML-Parser"
    .toLowerCase();
}

/**
 * GET /api/widget-resources/:serverId/by-action/:actionName
 * Get widget resource by action name
 */
widgetResourcesRouter.get('/:serverId/by-action/:actionName', async (c) => {
  const serverId = c.req.param('serverId');
  const actionName = decodeURIComponent(c.req.param('actionName'));
  
  try {
    const resources = await storageService.getWidgetResources(serverId);
    // Convert action name to kebab-case and add -widget suffix
    // e.g., "helloWorldEDS" -> "hello-world-eds-widget.html"
    const kebabName = toKebabCase(actionName);
    const expectedUri = `ui://eds-widget/${kebabName}-widget.html`;
    
    const resource = resources.find(r => r.uri === expectedUri);
    
    if (!resource) {
      return c.json({ error: 'Widget resource not found' }, 404);
    }
    
    return c.json({ resource });
  } catch (error) {
    console.error('[Widget Resources API] Error getting resource by action name:', error);
    return c.json({ error: 'Failed to get widget resource' }, 500);
  }
});

/**
 * POST /api/widget-resources/:serverId
 * Add a widget resource for a server
 */
widgetResourcesRouter.post('/:serverId', async (c) => {
  const serverId = c.req.param('serverId');
  try {
    const resource = await c.req.json<MCPResource>();
    const resources = await storageService.addWidgetResource(serverId, resource);
    return c.json({ resource, resources }, 201);
  } catch (error) {
    console.error('[Widget Resources API] Error adding resource:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to add widget resource'
    }, 500);
  }
});

/**
 * PUT /api/widget-resources/:serverId/:resourceUri
 * Update a widget resource for a server
 */
widgetResourcesRouter.put('/:serverId/:resourceUri', async (c) => {
  const serverId = c.req.param('serverId');
  const resourceUri = decodeURIComponent(c.req.param('resourceUri'));
  try {
    const updates = await c.req.json<Partial<MCPResource>>();
    await storageService.updateWidgetResource(serverId, resourceUri, updates);
    const resources = await storageService.getWidgetResources(serverId);
    return c.json({ resources });
  } catch (error) {
    console.error('[Widget Resources API] Error updating resource:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to update widget resource'
    }, 500);
  }
});

/**
 * GET /api/widget-resources/:serverId/compare/:actionName
 * Get both draft and original versions of a widget resource for comparison
 * Returns the draft from DB and the deployed widget-schema.json from disk
 */
widgetResourcesRouter.get('/:serverId/compare/:actionName', async (c) => {
  try {
    const serverId = c.req.param('serverId');
    const actionName = decodeURIComponent(c.req.param('actionName'));
    
    // Get draft version from DB
    const allDrafts = await storageService.getResourceDrafts(serverId);
    const draftVersion = allDrafts.find(r => r.actionName === actionName);
    
    // Read original/deployed version from widget-schema.json file on disk
    let originalVersion = null;
    try {
      const widgetSchemaPath = path.resolve(
        process.cwd(),
        '../..',
        'lcb-server',
        'server',
        'src',
        'actions',
        actionName,
        'widget',
        'widget-schema.json'
      );
      
      console.log(`[Widget Resources API] Reading widget-schema.json from: ${widgetSchemaPath}`);
      const schemaContent = await fs.readFile(widgetSchemaPath, 'utf-8');
      originalVersion = JSON.parse(schemaContent);
      console.log(`[Widget Resources API] Successfully read widget-schema.json for ${actionName}`);
    } catch (error) {
      console.error(`[Widget Resources API] Failed to read widget-schema.json for ${actionName}:`, error);
      // originalVersion remains null if file doesn't exist (new widget)
    }
    
    return c.json({ 
      draft: draftVersion || null,
      original: originalVersion || null
    });
  } catch (error) {
    console.error('[Widget Resources API] Error comparing widget versions:', error);
    return c.json(
      { error: 'Failed to compare versions', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * DELETE /api/widget-resources/:serverId/drafts
 * Clear all resource drafts for a server
 * NOTE: This MUST be defined before DELETE /:serverId/:resourceUri to avoid route conflicts
 */
widgetResourcesRouter.delete('/:serverId/drafts', async (c) => {
  try {
    const serverId = c.req.param('serverId');
    await storageService.clearResourceDrafts(serverId);
    return c.json({ success: true });
  } catch (error) {
    console.error('[Widget Resources API] Error clearing resource drafts:', error);
    return c.json(
      { error: 'Failed to clear drafts', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * DELETE /api/widget-resources/:serverId/:resourceUri
 * Delete a widget resource for a server
 */
widgetResourcesRouter.delete('/:serverId/:resourceUri', async (c) => {
  const serverId = c.req.param('serverId');
  const resourceUri = decodeURIComponent(c.req.param('resourceUri'));
  try {
    await storageService.deleteWidgetResource(serverId, resourceUri);
    const resources = await storageService.getWidgetResources(serverId);
    return c.json({ resources });
  } catch (error) {
    console.error('[Widget Resources API] Error deleting resource:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to delete widget resource'
    }, 500);
  }
});

/**
 * POST /api/widget-resources/:serverId/:resourceUri/read
 * Get content of a widget resource from MCP server
 */
widgetResourcesRouter.post('/:serverId/:resourceUri/read', async (c) => {
  const serverId = c.req.param('serverId');
  const resourceUri = decodeURIComponent(c.req.param('resourceUri'));

  try {
    const mcpClientManager = c.get('mcpClientManager');

    // Read resource content from MCP server
    const contents = await mcpClientManager.readResource(serverId, resourceUri);

    return c.json({ contents });
  } catch (error) {
    console.error('[Widget Resources API] Error reading resource content:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to read widget resource content'
    }, 500);
  }
});

/**
 * POST /api/widget-resources/:serverId/drafts/deploy
 * Write all resource drafts to widget-schema.json files (local-managed only).
 * Note: Build/Deploy should be triggered by the client via /api/bash/execute after this succeeds.
 * IMPORTANT: This route must come BEFORE /:serverId/drafts/:resourceUri to avoid matching "deploy" as a resourceUri!
 */
widgetResourcesRouter.post('/:serverId/drafts/deploy', async (c) => {
  try {
    const serverId = c.req.param('serverId');
    const drafts = await storageService.getResourceDrafts(serverId);

    console.log(`[Widget Resources API] Deploying ${drafts.length} resource drafts for server: ${serverId}`);
    console.log('[Widget Resources API] Drafts:', JSON.stringify(drafts, null, 2));

    const written: string[] = [];
    for (const draft of drafts) {
      // Skip drafts without actionName
      if (!draft.actionName) {
        console.warn(`[Widget Resources API] Draft missing actionName for URI: ${draft.uri}`);
        continue;
      }

      console.log(`[Widget Resources API] Writing draft for action: ${draft.actionName}`);
      console.log(`[Widget Resources API] Draft payload:`, {
        uri: draft.uri,
        name: draft.name,
        description: draft.description,
        _meta: draft._meta
      });

      try {
        const result = await writeResourceWidgetMetadata(draft.actionName, {
          uri: draft.uri,
          name: draft.name || '',
          description: draft.description || '',
          _meta: draft._meta
        });
        console.log(`[Widget Resources API] Successfully wrote: ${result.path}`);
        written.push(draft.actionName);
      } catch (writeError) {
        console.error(`[Widget Resources API] Failed to write ${draft.actionName}:`, writeError);
        throw writeError; // Re-throw to be caught by outer try-catch
      }
    }

    return c.json({ success: true, written });
  } catch (error) {
    console.error('[Widget Resources API] Error writing resource drafts to widget-schema.json:', error);
    return c.json(
      { error: 'Failed to write drafts', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * GET /api/widget-resources/:serverId/drafts
 * Get all resource drafts for a server
 */
widgetResourcesRouter.get('/:serverId/drafts', async (c) => {
  try {
    const serverId = c.req.param('serverId');
    const drafts = await storageService.getResourceDrafts(serverId);
    return c.json({ drafts });
  } catch (error) {
    console.error('[Widget Resources API] Error getting resource drafts:', error);
    return c.json(
      { error: 'Failed to get drafts', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * POST /api/widget-resources/:serverId/drafts/:resourceUri
 * Upsert a single resource draft
 */
widgetResourcesRouter.post('/:serverId/drafts/:resourceUri', async (c) => {
  try {
    const serverId = c.req.param('serverId');
    const resourceUri = decodeURIComponent(c.req.param('resourceUri'));
    
    console.log('[Widget Resources API] Upserting draft for:', { serverId, resourceUri });
    console.log('[Widget Resources API] Request headers:', c.req.header());
    
    // Try to get the raw body first
    let updates: Partial<MCPResource>;
    try {
      updates = await c.req.json<Partial<MCPResource>>();
      console.log('[Widget Resources API] Parsed updates:', updates);
    } catch (jsonError) {
      console.error('[Widget Resources API] Failed to parse JSON body:', jsonError);
      console.log('[Widget Resources API] Raw body:', await c.req.text());
      throw jsonError;
    }
    
    const drafts = await storageService.upsertResourceDraft(serverId, resourceUri, updates);
    return c.json({ drafts });
  } catch (error) {
    console.error('[Widget Resources API] Error upserting resource draft:', error);
    return c.json(
      { error: 'Failed to save draft', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * POST /api/widget-resources/:serverId/mark-deployed
 * Mark all resources with deployed: false as deployed: true (after successful deployment)
 */
widgetResourcesRouter.post('/:serverId/mark-deployed', async (c) => {
  try {
    const serverId = c.req.param('serverId');
    await storageService.markResourcesAsDeployed(serverId);
    return c.json({ success: true });
  } catch (error) {
    console.error('[Widget Resources API] Error marking resources as deployed:', error);
    return c.json(
      { error: 'Failed to mark resources as deployed', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * POST /api/widget-resources/:serverId/:resourceUri/mark-deleted
 * Mark a specific resource as deleted (associated with action deletion)
 * Body: { resourceData?: any } - Optional resource data for resources not yet in database
 */
widgetResourcesRouter.post('/:serverId/:resourceUri/mark-deleted', async (c) => {
  try {
    const serverId = c.req.param('serverId');
    const resourceUri = decodeURIComponent(c.req.param('resourceUri'));
    const body = await c.req.json().catch(() => ({}));
    const resourceData = body.resourceData;
    console.log('[Widget Resources API] Marking resource as deleted:', { serverId, resourceUri, hasResourceData: !!resourceData });
    await storageService.markResourceAsDeleted(serverId, resourceUri, resourceData);
    return c.json({ success: true });
  } catch (error) {
    console.error('[Widget Resources API] Error marking resource as deleted:', error);
    return c.json(
      { error: 'Failed to mark resource as deleted', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * POST /api/widget-resources/:serverId/:resourceUri/restore
 * Restore a deleted resource (remove deleted flag)
 */
widgetResourcesRouter.post('/:serverId/:resourceUri/restore', async (c) => {
  try {
    const serverId = c.req.param('serverId');
    const resourceUri = decodeURIComponent(c.req.param('resourceUri'));
    console.log('[Widget Resources API] Restoring resource:', { serverId, resourceUri });
    await storageService.restoreResource(serverId, resourceUri);
    return c.json({ success: true });
  } catch (error) {
    console.error('[Widget Resources API] Error restoring resource:', error);
    return c.json(
      { error: 'Failed to restore resource', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});
