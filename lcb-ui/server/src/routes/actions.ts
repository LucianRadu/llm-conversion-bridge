import { Hono } from 'hono';
import { storageService } from '../services/storage';
import { mcpClientManager } from '../services/mcpClientManager';
import type { MCPTool } from '../../../shared/types';
import { overwriteActionSchemaFromUi, setActionPublished, writeActionSchemaFromDraft } from '../services/schemaWriter';
import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';

const actionsRouter = new Hono();

/**
 * GET /api/actions/:serverId/merged
 * Get merged actions from MCP server and DB
 * - For actions with uncommitted changes (draft/not deployed/deleted): use DB data
 * - For deployed actions: use MCP server data
 */
actionsRouter.get('/:serverId/merged', async (c) => {
  const serverId = c.req.param('serverId');
  
  try {
    console.log('[Actions API] Getting merged actions for server:', serverId);
    
    // Step 1: Get tools from MCP server (deployed state)
    let mcpTools: MCPTool[] = [];
    try {
      const tools = await mcpClientManager.getToolsForServer(serverId);
      mcpTools = tools || [];
      console.log(`[Actions API] Got ${mcpTools.length} tools from MCP server`);
    } catch (mcpError) {
      console.error('[Actions API] Failed to get MCP tools:', mcpError);
      // Continue with empty MCP tools - DB might have actions
    }
    
    // Step 2: Get actions from DB (all types)
    const discoveredActions = await storageService.getDiscoveredActions(serverId);
    const customActions = await storageService.getCustomActions(serverId);
    const allDbActions = [...discoveredActions, ...customActions];
    console.log(`[Actions API] Got ${allDbActions.length} actions from DB`);
    
    // Step 3: Create lookup map for DB actions
    const dbActionsMap = new Map(allDbActions.map(action => [action.name, action]));
    
    // Step 4: Merge logic
    const mergedTools: MCPTool[] = [];
    const processedNames = new Set<string>();
    
    // Process MCP tools first
    for (const mcpTool of mcpTools) {
      const dbAction = dbActionsMap.get(mcpTool.name);
      
      // Has uncommitted changes? Use DB data
      if (dbAction && (dbAction.draft === true || dbAction.deployed === false || dbAction.deleted === true)) {
        console.log(`[Actions API] Using DB version for ${mcpTool.name} (has uncommitted changes)`);
        mergedTools.push(dbAction);
      } else {
        // No uncommitted changes: use MCP version
        mergedTools.push(mcpTool);
      }
      
      processedNames.add(mcpTool.name);
    }
    
    // Add DB-only actions (new actions not yet deployed)
    for (const dbAction of allDbActions) {
      if (!processedNames.has(dbAction.name)) {
        console.log(`[Actions API] Adding DB-only action: ${dbAction.name}`);
        mergedTools.push(dbAction);
      }
    }
    
    console.log(`[Actions API] Merged result: ${mergedTools.length} total actions`);
    
    return c.json({ 
      tools: mergedTools,
      source: 'merged' // Indicator for debugging
    });
    
  } catch (error) {
    console.error('[Actions API] Error getting merged actions:', error);
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to get merged actions' 
    }, 500);
  }
});

/**
 * GET /api/actions/:serverId
 * Get all actions (discovered + custom) for a server
 */
actionsRouter.get('/:serverId', async (c) => {
  try {
    const serverId = c.req.param('serverId');
    const actions = await storageService.getAllActions(serverId);
    return c.json({ actions });
  } catch (error) {
    console.error('Error fetching actions:', error);
    return c.json(
      { error: 'Failed to fetch actions', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * GET /api/actions/:serverId/:actionName/compare
 * Get both draft and original versions of an action for comparison
 * Returns the draft from DB and the deployed schema.json from disk
 */
actionsRouter.get('/:serverId/:actionName/compare', async (c) => {
  try {
    const serverId = c.req.param('serverId');
    const actionName = c.req.param('actionName');
    
    // Get draft version from DB
    const allDbActions = await storageService.getAllActions(serverId);
    const draftVersion = allDbActions.find(a => a.name === actionName);
    
    // Read original/deployed version from schema.json file on disk
    let originalVersion = null;
    try {
      // Construct path to schema.json
      // Use path.resolve to properly resolve .. and get absolute path
      // Go up two levels from lcb-ui/server to the project root, then into lcb-server
      const schemaPath = path.resolve(
        process.cwd(),
        '../..',
        'lcb-server',
        'server',
        'src',
        'actions',
        actionName,
        'schema.json'
      );
      
      console.log(`[Actions API] Reading schema.json from: ${schemaPath}`);
      const schemaContent = await fs.readFile(schemaPath, 'utf-8');
      originalVersion = JSON.parse(schemaContent);
      console.log(`[Actions API] Successfully read schema.json for ${actionName}`);
    } catch (error) {
      console.error(`[Actions API] Failed to read schema.json for ${actionName}:`, error);
      // originalVersion remains null if file doesn't exist (new action)
    }
    
    return c.json({ 
      draft: draftVersion || null,
      original: originalVersion || null
    });
  } catch (error) {
    console.error('[Actions API] Error comparing action versions:', error);
    return c.json(
      { error: 'Failed to compare versions', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * POST /api/actions/:serverId/drafts/deploy
 * Write all drafts to schema.json files (local-managed only).
 * Note: Build/Deploy should be triggered by the client via /api/bash/execute after this succeeds.
 */
actionsRouter.post('/:serverId/drafts/deploy', async (c) => {
  try {
    const serverId = c.req.param('serverId');
    const drafts = await storageService.getActionDrafts(serverId);

    for (const draft of drafts) {
      await writeActionSchemaFromDraft(draft);
    }

    return c.json({ success: true, written: drafts.map(d => d.name) });
  } catch (error) {
    console.error('Error writing drafts to schema.json:', error);
    return c.json(
      { error: 'Failed to write drafts', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * DELETE /api/actions/:serverId/drafts
 * Clear all drafts for a server after successful deployment
 */
actionsRouter.delete('/:serverId/drafts', async (c) => {
  try {
    const serverId = c.req.param('serverId');
    await storageService.clearActionDrafts(serverId);
    return c.json({ success: true });
  } catch (error) {
    console.error('Error clearing drafts:', error);
    return c.json(
      { error: 'Failed to clear drafts', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * GET /api/actions/:serverId/custom
 * Get custom actions for a server
 */
actionsRouter.get('/:serverId/custom', async (c) => {
  try {
    const serverId = c.req.param('serverId');
    const actions = await storageService.getCustomActions(serverId);
    return c.json({ actions });
  } catch (error) {
    console.error('Error fetching custom actions:', error);
    return c.json(
      { error: 'Failed to fetch custom actions', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * ==================== DRAFTS (overlay) ====================
 */

/**
 * GET /api/actions/:serverId/drafts
 * Get all action drafts for a server
 */
actionsRouter.get('/:serverId/drafts', async (c) => {
  try {
    const serverId = c.req.param('serverId');
    const drafts = await storageService.getActionDrafts(serverId);
    return c.json({ drafts });
  } catch (error) {
    console.error('Error fetching action drafts:', error);
    return c.json(
      { error: 'Failed to fetch action drafts', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * POST /api/actions/:serverId/drafts/:actionName
 * Upsert a single action draft
 */
actionsRouter.post('/:serverId/drafts/:actionName', async (c) => {
  try {
    const serverId = c.req.param('serverId');
    const actionName = c.req.param('actionName');
    const updates = await c.req.json<Partial<MCPTool>>();
    const drafts = await storageService.upsertActionDraft(serverId, actionName, updates);
    return c.json({ drafts });
  } catch (error) {
    console.error('Error upserting action draft:', error);
    return c.json(
      { error: 'Failed to save draft', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * DELETE /api/actions/:serverId/drafts/:actionName
 * Delete an action draft
 */
actionsRouter.delete('/:serverId/drafts/:actionName', async (c) => {
  try {
    const serverId = c.req.param('serverId');
    const actionName = c.req.param('actionName');
    await storageService.deleteActionDraft(serverId, actionName);
    const drafts = await storageService.getActionDrafts(serverId);
    return c.json({ drafts });
  } catch (error) {
    console.error('Error deleting action draft:', error);
    return c.json(
      { error: 'Failed to delete draft', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * POST /api/actions/:serverId/custom
 * Add a custom action for a server
 */
actionsRouter.post('/:serverId/custom', async (c) => {
  try {
    const serverId = c.req.param('serverId');
    const action = await c.req.json<MCPTool>();

    if (!action.name) {
      return c.json({ error: 'Missing required field: name' }, 400);
    }

    const actions = await storageService.addCustomAction(serverId, action);
    return c.json({ action, actions }, 201);
  } catch (error) {
    console.error('Error adding custom action:', error);
    return c.json(
      { error: 'Failed to add custom action', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * PUT /api/actions/:serverId/:actionName
 * Update an action for a server
 */
actionsRouter.put('/:serverId/:actionName', async (c) => {
  try {
    const serverId = c.req.param('serverId');
    const actionName = c.req.param('actionName');
    const updates = await c.req.json<Partial<MCPTool>>();

    await storageService.updateAction(serverId, actionName, updates);
    const allActions = await storageService.getAllActions(serverId);

    return c.json({ actions: allActions });
  } catch (error) {
    console.error('Error updating action:', error);
    return c.json(
      { error: 'Failed to update action', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * DELETE /api/actions/:serverId/:actionName
 * Delete an action for a server
 */
actionsRouter.delete('/:serverId/:actionName', async (c) => {
  try {
    const serverId = c.req.param('serverId');
    const actionName = c.req.param('actionName');

    await storageService.deleteAction(serverId, actionName);
    const allActions = await storageService.getAllActions(serverId);

    return c.json({ actions: allActions });
  } catch (error) {
    console.error('Error deleting action:', error);
    return c.json(
      { error: 'Failed to delete action', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * POST /api/actions/:serverId/schema/:actionName
 * Overwrite schema.json directly from UI payload (title, description, inputSchema)
 */
actionsRouter.post('/:serverId/schema/:actionName', async (c) => {
  try {
    const actionName = c.req.param('actionName');
    const body = await c.req.json<any>();
    const BodyZ = z.object({
      title: z.string().min(1),
      description: z.string().min(0),
      inputSchema: z.record(z.any()).optional()
    });
    const parsed = BodyZ.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid schema payload', details: parsed.error.flatten() }, 400);
    }
    const result = await overwriteActionSchemaFromUi(actionName, parsed.data);
    return c.json({ ok: true, path: result.path, version: result.version });
  } catch (error) {
    console.error('Error overwriting action schema:', error);
    return c.json(
      { error: 'Failed to overwrite schema', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * POST /api/actions/:serverId/schema/:actionName/publish
 * Toggle isPublished flag
 */
actionsRouter.post('/:serverId/schema/:actionName/publish', async (c) => {
  try {
    const actionName = c.req.param('actionName');
    const { isPublished } = await c.req.json<{ isPublished: boolean }>();
    if (typeof isPublished !== 'boolean') {
      return c.json({ error: 'Invalid body: isPublished must be boolean' }, 400);
    }
    await setActionPublished(actionName, isPublished);
    return c.json({ ok: true });
  } catch (error) {
    console.error('Error updating publish flag:', error);
    return c.json(
      { error: 'Failed to update publish flag', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * POST /api/actions/:serverId/mark-deployed
 * Mark all actions with deployed: false as deployed: true (after successful deployment)
 */
actionsRouter.post('/:serverId/mark-deployed', async (c) => {
  try {
    const serverId = c.req.param('serverId');
    await storageService.markActionsAsDeployed(serverId);
    return c.json({ success: true });
  } catch (error) {
    console.error('[Actions API] Error marking actions as deployed:', error);
    return c.json(
      { error: 'Failed to mark actions as deployed', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

export { actionsRouter };
