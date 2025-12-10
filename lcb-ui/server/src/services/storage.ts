import { join } from 'path';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import type { MCPServer, MCPTool, MCPResource, Environment, Deployment, ChangelogEntry } from '../../../shared/types';

// Database file path - stores in lcb-ui root folder
const DB_FILE = join(process.cwd(), '..', 'db.json');

// Export ChangelogEntry for backwards compatibility
export type { ChangelogEntry } from '../../../shared/types';

// Old changelog entry structure (kept for reference, but not used)
// interface OldChangelogEntry {
//   id: string;
//   timestamp: string;
//   type: string;
//   itemName: string;
//   description: string;
//   details?: {
//     oldValue?: any;
//     newValue?: any;
//   };
// }

// Database schema
interface Database {
  servers: MCPServer[];
  actions: {
    [serverId: string]: {
      discovered: MCPTool[];  // From Discovery wizard
      custom: MCPTool[];      // From "Add Action" button
    };
  };
  widgetResources: {
    [serverId: string]: MCPResource[];  // Custom widget resources per server
  };
  environments: {
    [serverId: string]: Environment[];  // Deployment environments per server
  };
  deployments: {
    [environmentId: string]: Deployment[];  // Deployment history per environment
  };
  changelogs: {
    [sessionId: string]: ChangelogEntry[];
  };
}

// Default data
const defaultData: Database = {
  servers: [],
  actions: {},
  widgetResources: {},
  environments: {},
  deployments: {},
  changelogs: {}
};

// Initialize database
let db: Low<Database> | null = null;

async function getDb(): Promise<Low<Database>> {
  if (db) {
    return db;
  }

  const adapter = new JSONFile<Database>(DB_FILE);
  db = new Low(adapter, defaultData);

  await db.read();

  // Initialize with default data if empty
  db.data ||= defaultData;
  db.data.servers ||= [];
  db.data.actions ||= {};
  db.data.widgetResources ||= {};
  db.data.environments ||= {};
  db.data.deployments ||= {};
  db.data.changelogs ||= {};

  await db.write();

  console.log('[Storage] Database initialized at:', DB_FILE);

  return db;
}

export class StorageService {
  /**
   * Get all configured MCP servers
   */
  async getServers(): Promise<MCPServer[]> {
    try {
      const db = await getDb();
      await db.read();
      const servers = db.data.servers || [];
      console.log(`[Storage] Loaded ${servers.length} server(s)`);
      return servers;
    } catch (error) {
      console.error('[Storage] Error loading servers:', error);
      return [];
    }
  }

  /**
   * Save all MCP servers
   */
  async saveServers(servers: MCPServer[]): Promise<void> {
    try {
      const db = await getDb();
      db.data.servers = servers;
      await db.write();
      console.log('[Storage] Servers saved successfully');
    } catch (error) {
      console.error('[Storage] Error saving servers:', error);
      throw error;
    }
  }

  /**
   * Add a new MCP server
   */
  async addServer(server: MCPServer): Promise<MCPServer[]> {
    const db = await getDb();
    await db.read();

    // Check for duplicate ID
    if (db.data.servers.some(s => s.id === server.id)) {
      throw new Error(`Server with ID ${server.id} already exists`);
    }

    db.data.servers.push(server);
    await db.write();

    return db.data.servers;
  }

  /**
   * Update an existing MCP server
   */
  async updateServer(id: string, updates: Partial<MCPServer>): Promise<MCPServer[]> {
    const db = await getDb();
    await db.read();

    const index = db.data.servers.findIndex(s => s.id === id);

    if (index === -1) {
      throw new Error(`Server with ID ${id} not found`);
    }

    db.data.servers[index] = { ...db.data.servers[index], ...updates };
    await db.write();

    return db.data.servers;
  }

  /**
   * Remove an MCP server
   * NOTE: Managed servers cannot be deleted
   */
  async removeServer(id: string): Promise<MCPServer[]> {
    const db = await getDb();
    await db.read();

    // Find the server
    const serverToDelete = db.data.servers.find(s => s.id === id);

    if (!serverToDelete) {
      throw new Error(`Server with ID ${id} not found`);
    }

    // Prevent deletion of managed servers
    if (serverToDelete.serverType === 'local-managed' || serverToDelete.serverType === 'remote-managed') {
      throw new Error(`Cannot delete managed server "${serverToDelete.name}". Managed servers are protected.`);
    }

    const initialLength = db.data.servers.length;
    db.data.servers = db.data.servers.filter(s => s.id !== id);

    if (db.data.servers.length === initialLength) {
      throw new Error(`Server with ID ${id} not found`);
    }

    await db.write();

    return db.data.servers;
  }

  /**
   * Force remove a managed server (used only during bootstrap/initialization)
   * @internal
   */
  async forceRemoveManagedServer(id: string): Promise<void> {
    const db = await getDb();
    await db.read();

    const initialLength = db.data.servers.length;
    db.data.servers = db.data.servers.filter(s => s.id !== id);

    if (db.data.servers.length === initialLength) {
      throw new Error(`Server with ID ${id} not found`);
    }

    await db.write();
  }

  /**
   * Get a single server by ID
   */
  async getServer(id: string): Promise<MCPServer | null> {
    const db = await getDb();
    await db.read();

    return db.data.servers.find(s => s.id === id) || null;
  }

  /**
   * Get managed servers (Local and/or Remote)
   */
  async getManagedServers(): Promise<MCPServer[]> {
    const db = await getDb();
    await db.read();

    return db.data.servers.filter(s =>
      s.serverType === 'local-managed' || s.serverType === 'remote-managed'
    );
  }

  /**
   * Get managed server by type
   */
  async getManagedServer(serverType: 'local-managed' | 'remote-managed'): Promise<MCPServer | null> {
    const db = await getDb();
    await db.read();

    return db.data.servers.find(s => s.serverType === serverType) || null;
  }

  /**
   * Create a server (used by initializer)
   */
  async createServer(server: MCPServer): Promise<MCPServer> {
    const db = await getDb();
    await db.read();

    // Check for duplicate ID
    if (db.data.servers.some(s => s.id === server.id)) {
      throw new Error(`Server with ID ${server.id} already exists`);
    }

    db.data.servers.push(server);
    await db.write();

    return server;
  }

  /**
   * Clear all stored servers (useful for testing)
   */
  async clearServers(): Promise<void> {
    try {
      console.log('[Storage] Clearing all servers');
      const db = await getDb();
      db.data.servers = [];
      await db.write();
      console.log('[Storage] All servers cleared');
    } catch (error) {
      console.error('[Storage] Error clearing servers:', error);
      throw error;
    }
  }

  /**
   * ==================== ACTIONS METHODS ====================
   */

  /**
   * Get discovered actions for a server
   */
  async getDiscoveredActions(serverId: string): Promise<MCPTool[]> {
    try {
      const db = await getDb();
      await db.read();
      if (!db.data.actions[serverId]) {
        db.data.actions[serverId] = { discovered: [], custom: [] };
      }
      console.log('[Storage] Loaded discovered actions for server:', serverId, db.data.actions[serverId].discovered.length);
      return db.data.actions[serverId].discovered || [];
    } catch (error) {
      console.error('[Storage] Error loading discovered actions:', error);
      return [];
    }
  }

  /**
   * Get custom actions for a server
   */
  async getCustomActions(serverId: string): Promise<MCPTool[]> {
    try {
      const db = await getDb();
      await db.read();
      if (!db.data.actions[serverId]) {
        db.data.actions[serverId] = { discovered: [], custom: [] };
      }
      console.log('[Storage] Loaded custom actions for server:', serverId, db.data.actions[serverId].custom.length);
      return db.data.actions[serverId].custom || [];
    } catch (error) {
      console.error('[Storage] Error loading custom actions:', error);
      return [];
    }
  }

  /**
   * Get all actions (discovered + custom) for a server
   */
  async getAllActions(serverId: string): Promise<MCPTool[]> {
    const discovered = await this.getDiscoveredActions(serverId);
    const custom = await this.getCustomActions(serverId);
    return [...discovered, ...custom];
  }

  /**
   * Save discovered actions for a server
   */
  async saveDiscoveredActions(serverId: string, actions: MCPTool[]): Promise<void> {
    try {
      const db = await getDb();
      await db.read();
      if (!db.data.actions[serverId]) {
        db.data.actions[serverId] = { discovered: [], custom: [] };
      }
      db.data.actions[serverId].discovered = actions;
      await db.write();
      console.log('[Storage] Discovered actions saved for server:', serverId);
    } catch (error) {
      console.error('[Storage] Error saving discovered actions:', error);
      throw error;
    }
  }

  /**
   * Save custom actions for a server
   */
  async saveCustomActions(serverId: string, actions: MCPTool[]): Promise<void> {
    try {
      const db = await getDb();
      await db.read();
      if (!db.data.actions[serverId]) {
        db.data.actions[serverId] = { discovered: [], custom: [] };
      }
      db.data.actions[serverId].custom = actions;
      await db.write();
      console.log('[Storage] Custom actions saved for server:', serverId);
    } catch (error) {
      console.error('[Storage] Error saving custom actions:', error);
      throw error;
    }
  }

  /**
   * Add a discovered action for a server
   */
  async addDiscoveredAction(serverId: string, action: MCPTool): Promise<MCPTool[]> {
    const actions = await this.getDiscoveredActions(serverId);
    actions.push(action);
    await this.saveDiscoveredActions(serverId, actions);
    return actions;
  }

  /**
   * Add a custom action for a server
   */
  async addCustomAction(serverId: string, action: MCPTool): Promise<MCPTool[]> {
    const actions = await this.getCustomActions(serverId);
    actions.push(action);
    await this.saveCustomActions(serverId, actions);
    return actions;
  }

  /**
   * Update an action (discovered or custom) for a server
   */
  async updateAction(serverId: string, actionName: string, updates: Partial<MCPTool>): Promise<void> {
    const discovered = await this.getDiscoveredActions(serverId);
    const custom = await this.getCustomActions(serverId);

    // Try to find in discovered
    const discoveredIndex = discovered.findIndex(a => a.name === actionName);
    if (discoveredIndex !== -1) {
      discovered[discoveredIndex] = { ...discovered[discoveredIndex], ...updates };
      await this.saveDiscoveredActions(serverId, discovered);
      return;
    }

    // Try to find in custom
    const customIndex = custom.findIndex(a => a.name === actionName);
    if (customIndex !== -1) {
      custom[customIndex] = { ...custom[customIndex], ...updates };
      await this.saveCustomActions(serverId, custom);
      return;
    }

    // If action not found in database, it might be a live server tool being edited for first time
    // Add it to discovered actions with ALL the provided updates (including deleted flag)
    const newAction: MCPTool = {
      name: actionName,
      description: updates.description || '',
      inputSchema: updates.inputSchema,
      version: updates.version || '1.0.0',
      ...updates // Spread all updates to include deleted, deployed, hasEdsWidget, annotations, etc.
    };
    discovered.push(newAction);
    await this.saveDiscoveredActions(serverId, discovered);
  }

  /**
   * Mark all actions as deployed (set deployed: true for all actions)
   */
  async markAllActionsAsDeployed(serverId: string): Promise<void> {
    const discovered = await this.getDiscoveredActions(serverId);
    const custom = await this.getCustomActions(serverId);

    // Mark all discovered actions as deployed
    const updatedDiscovered = discovered.map(action => ({
      ...action,
      deployed: true
    }));
    await this.saveDiscoveredActions(serverId, updatedDiscovered);

    // Mark all custom actions as deployed
    const updatedCustom = custom.map(action => ({
      ...action,
      deployed: true
    }));
    await this.saveCustomActions(serverId, updatedCustom);
  }

  /**
   * Delete an action (discovered or custom) for a server
   */
  async deleteAction(serverId: string, actionName: string): Promise<void> {
    const discovered = await this.getDiscoveredActions(serverId);
    const custom = await this.getCustomActions(serverId);

    // Try to delete from discovered
    const discoveredFiltered = discovered.filter(a => a.name !== actionName);
    if (discoveredFiltered.length !== discovered.length) {
      await this.saveDiscoveredActions(serverId, discoveredFiltered);
      return;
    }

    // Try to delete from custom
    const customFiltered = custom.filter(a => a.name !== actionName);
    if (customFiltered.length !== custom.length) {
      await this.saveCustomActions(serverId, customFiltered);
      return;
    }

    throw new Error(`Action ${actionName} not found`);
  }

  // ==================== ACTION DRAFTS (overlay) ====================
  /**
   * Get all action drafts for a server (stored within discovered with draft flag)
   */
  async getActionDrafts(serverId: string): Promise<MCPTool[]> {
    const discovered = await this.getDiscoveredActions(serverId);
    return discovered.filter(a => (a as any).draft === true);
  }

  /**
   * Clear all action drafts for a server (after successful deployment)
   */
  async clearActionDrafts(serverId: string): Promise<void> {
    const discovered = await this.getDiscoveredActions(serverId);
    const withoutDrafts = discovered.filter(a => !(a as any).draft);
    await this.saveDiscoveredActions(serverId, withoutDrafts);
  }

  /**
   * Upsert an action draft for a server
   */
  async upsertActionDraft(serverId: string, actionName: string, updates: Partial<MCPTool>): Promise<MCPTool[]> {
    const discovered = await this.getDiscoveredActions(serverId);
    const isDraft = (tool: MCPTool) => (tool as any).draft === true;

    // Find existing draft by name
    const idx = discovered.findIndex(a => a.name === actionName && isDraft(a));
    const base: MCPTool = {
      name: actionName,
      title: updates.title,
      description: updates.description,
      version: updates.version,
      inputSchema: updates.inputSchema,
      annotations: updates.annotations,
      _meta: updates._meta,
      draft: true,
      draftSource: 'schema'
    };

    if (idx !== -1) {
      discovered[idx] = { ...discovered[idx], ...base };
    } else {
      discovered.push(base);
    }
    await this.saveDiscoveredActions(serverId, discovered);
    return discovered.filter(isDraft);
  }

  /**
   * Delete an action draft
   */
  async deleteActionDraft(serverId: string, actionName: string): Promise<void> {
    const discovered = await this.getDiscoveredActions(serverId);
    const filtered = discovered.filter(a => !(a.name === actionName && (a as any).draft === true));
    await this.saveDiscoveredActions(serverId, filtered);
  }

  /**
   * ==================== FLOWS METHODS ====================
   */

  /**
   * ==================== WIDGET RESOURCES CRUD ====================
   */

  /**
   * Get widget resources for a server
   */
  async getWidgetResources(serverId: string): Promise<MCPResource[]> {
    try {
      const db = await getDb();
      await db.read();
      if (!db.data.widgetResources[serverId]) {
        db.data.widgetResources[serverId] = [];
      }
      console.log('[Storage] Loaded widget resources for server:', serverId, db.data.widgetResources[serverId].length);
      return db.data.widgetResources[serverId] || [];
    } catch (error) {
      console.error('[Storage] Error loading widget resources:', error);
      return [];
    }
  }

  /**
   * Save widget resources for a server
   */
  async saveWidgetResources(serverId: string, resources: MCPResource[]): Promise<void> {
    try {
      const db = await getDb();
      await db.read();
      if (!db.data.widgetResources[serverId]) {
        db.data.widgetResources[serverId] = [];
      }
      db.data.widgetResources[serverId] = resources;
      await db.write();
      console.log('[Storage] Saved widget resources for server:', serverId, resources.length);
    } catch (error) {
      console.error('[Storage] Error saving widget resources:', error);
      throw error;
    }
  }

  /**
   * Add a widget resource for a server
   */
  async addWidgetResource(serverId: string, resource: MCPResource): Promise<MCPResource[]> {
    const resources = await this.getWidgetResources(serverId);
    resources.push(resource);
    await this.saveWidgetResources(serverId, resources);
    return resources;
  }

  /**
   * Update a widget resource for a server
   */
  async updateWidgetResource(serverId: string, resourceUri: string, updates: Partial<MCPResource>): Promise<void> {
    const resources = await this.getWidgetResources(serverId);
    const index = resources.findIndex(r => r.uri === resourceUri);
    if (index !== -1) {
      resources[index] = { ...resources[index], ...updates };
      await this.saveWidgetResources(serverId, resources);
      return;
    }
    throw new Error(`Widget resource with URI "${resourceUri}" not found`);
  }

  /**
   * Delete a widget resource for a server
   */
  async deleteWidgetResource(serverId: string, resourceUri: string): Promise<void> {
    const resources = await this.getWidgetResources(serverId);
    const filtered = resources.filter(r => r.uri !== resourceUri);
    if (filtered.length === resources.length) {
      throw new Error(`Widget resource with URI "${resourceUri}" not found`);
    }
    await this.saveWidgetResources(serverId, filtered);
  }

  // ==================== RESOURCE DRAFTS (overlay) ====================
  /**
   * Get all resource drafts for a server (stored within widgetResources with draft flag)
   * Includes: modified drafts (draft: true), newly created (deployed: false), and deleted (deleted: true)
   */
  async getResourceDrafts(serverId: string): Promise<MCPResource[]> {
    const resources = await this.getWidgetResources(serverId);
    if (!Array.isArray(resources)) return [];
    
    // Include all uncommitted changes: modified, newly created, or deleted
    return resources.filter(r => 
      (r as any).draft === true || 
      (r as any).deployed === false || 
      (r as any).deleted === true
    );
  }

  /**
   * Clear all resource drafts for a server (after successful deployment)
   */
  async clearResourceDrafts(serverId: string): Promise<void> {
    console.log('[Storage] Clearing resource drafts for server:', serverId);
    const resources = await this.getWidgetResources(serverId);
    console.log('[Storage] Total resources:', resources.length);
    const drafts = resources.filter(r => (r as any).draft);
    console.log('[Storage] Drafts to remove:', drafts.length, drafts.map(d => d.uri));
    const withoutDrafts = Array.isArray(resources) ? resources.filter(r => !(r as any).draft) : [];
    console.log('[Storage] Resources after filtering:', withoutDrafts.length);
    await this.saveWidgetResources(serverId, withoutDrafts);
    console.log('[Storage] ✅ Successfully cleared resource drafts');
  }

  /**
   * Mark all resources with deployed: false as deployed: true (after successful deployment)
   */
  async markResourcesAsDeployed(serverId: string): Promise<void> {
    console.log('[Storage] Marking resources as deployed for server:', serverId);
    const resources = await this.getWidgetResources(serverId);
    console.log('[Storage] Total resources:', resources.length);
    const undeployedCount = resources.filter(r => (r as any).deployed === false).length;
    console.log('[Storage] Resources to mark as deployed:', undeployedCount);
    
    const updatedResources = resources.map(r => {
      if ((r as any).deployed === false) {
        return { ...r, deployed: true };
      }
      return r;
    });
    
    await this.saveWidgetResources(serverId, updatedResources);
    console.log('[Storage] ✅ Successfully marked resources as deployed');
  }

  /**
   * Mark a specific resource as deleted (associated with action deletion)
   */
  async markResourceAsDeleted(serverId: string, resourceUri: string, resourceData?: any): Promise<void> {
    console.log('[Storage] Marking resource as deleted:', { serverId, resourceUri, hasResourceData: !!resourceData });
    const resources = await this.getWidgetResources(serverId);
    const existingResource = resources.find(r => r.uri === resourceUri);
    
    let updatedResources;
    if (existingResource) {
      // Resource exists in database, mark it as deleted
      updatedResources = resources.map(r => {
        if (r.uri === resourceUri) {
          return { ...r, deleted: true };
        }
        return r;
      });
      console.log('[Storage] ✅ Marked existing resource as deleted');
    } else if (resourceData) {
      // Resource doesn't exist in database yet (from live server), add it with deleted flag
      updatedResources = [...resources, { ...resourceData, deleted: true }];
      console.log('[Storage] ✅ Added resource to database with deleted flag');
    } else {
      console.log('[Storage] ⚠️ Resource not found in database and no resource data provided');
      return;
    }
    
    await this.saveWidgetResources(serverId, updatedResources);
    console.log('[Storage] ✅ Successfully saved resources');
  }

  /**
   * Restore a deleted resource (remove deleted flag)
   */
  async restoreResource(serverId: string, resourceUri: string): Promise<void> {
    console.log('[Storage] Restoring resource:', { serverId, resourceUri });
    const resources = await this.getWidgetResources(serverId);
    const updatedResources = resources.map(r => {
      if (r.uri === resourceUri) {
        const { deleted, ...rest } = r as any;
        return rest;
      }
      return r;
    });
    await this.saveWidgetResources(serverId, updatedResources);
    console.log('[Storage] ✅ Successfully restored resource');
  }

  /**
   * Mark all actions with deployed: false as deployed: true (after successful deployment)
   */
  async markActionsAsDeployed(serverId: string): Promise<void> {
    console.log('[Storage] Marking actions as deployed for server:', serverId);
    const actions = await this.getAllActions(serverId);
    console.log('[Storage] Total actions:', actions.length);
    const undeployedCount = actions.filter(a => (a as any).deployed === false).length;
    console.log('[Storage] Actions to mark as deployed:', undeployedCount);
    
    const updatedActions = actions.map(a => {
      if ((a as any).deployed === false) {
        // Remove discovered flag when marking as deployed
        const { discovered, ...rest } = a as any;
        return { ...rest, deployed: true };
      }
      return a;
    });
    
    // Save both discovered and custom actions
    const db = await getDb();
    await db.read();
    if (!db.data.actions) {
      db.data.actions = {};
    }
    if (!db.data.actions[serverId]) {
      db.data.actions[serverId] = { discovered: [], custom: [] };
    }
    
    // Split updated actions back into discovered and custom based on existing categorization
    const discovered = updatedActions.filter(a => {
      const existing = db.data.actions![serverId].discovered.find((d: MCPTool) => d.name === a.name);
      return !!existing;
    });
    const custom = updatedActions.filter(a => {
      const existing = db.data.actions![serverId].custom.find((c: MCPTool) => c.name === a.name);
      return !!existing;
    });
    
    db.data.actions[serverId].discovered = discovered;
    db.data.actions[serverId].custom = custom;
    await db.write();
    console.log('[Storage] ✅ Successfully marked actions as deployed');
  }

  /**
   * Upsert a resource draft for a server
   */
  async upsertResourceDraft(serverId: string, resourceUri: string, updates: Partial<MCPResource>): Promise<MCPResource[]> {
    let resources = await this.getWidgetResources(serverId);
    if (!Array.isArray(resources)) {
      resources = [];
    }
    
    const isDraft = (resource: MCPResource) => (resource as any).draft === true;

    // Find existing draft by URI
    const idx = resources.findIndex(r => r.uri === resourceUri && isDraft(r));
    const base: MCPResource = {
      uri: resourceUri,
      name: updates.name,
      description: updates.description || '', // Provide default empty string if undefined
      mimeType: updates.mimeType,
      actionName: updates.actionName, // Preserve actionName for deployment
      _meta: updates._meta, // Preserve _meta field
      draft: true
    };

    if (idx !== -1) {
      // Update existing draft
      resources[idx] = { ...resources[idx], ...base };
    } else {
      // Add new draft
      resources.push(base);
    }

    await this.saveWidgetResources(serverId, resources);
    return resources.filter(isDraft);
  }


  /**
   * ==================== CHANGELOG METHODS ====================
   */

  /**
   * Get changelog entries for a session
   */
  async getChangelog(sessionId: string): Promise<ChangelogEntry[]> {
    try {
      const db = await getDb();
      await db.read();
      console.log('[Storage] Loaded changelog for session:', sessionId, db.data.changelogs[sessionId]?.length || 0);
      return db.data.changelogs[sessionId] || [];
    } catch (error) {
      console.error('[Storage] Error loading changelog:', error);
      return [];
    }
  }

  /**
   * Add a changelog entry for a session.
   * If an uncommitted entry with the same type and resource identifier exists, it will be updated instead.
   * This prevents duplicate changelog entries for the same field being edited multiple times.
   */
  async addChangelogEntry(sessionId: string, entry: ChangelogEntry): Promise<void> {
    try {
      const db = await getDb();
      await db.read();
      if (!db.data.changelogs[sessionId]) {
        db.data.changelogs[sessionId] = [];
      }

      // Find existing uncommitted entry for the same resource/field
      const existingIndex = db.data.changelogs[sessionId].findIndex(existing => {
        // Must be uncommitted to be replaceable
        if (existing.committed) {
          return false;
        }

        // Must have the same type
        if (existing.type !== entry.type) {
          return false;
        }

        // For action-related changes, match by actionName
        if (entry.actionName && existing.actionName === entry.actionName) {
          // For field-specific changes, also match by fieldName
          if (entry.fieldName && existing.fieldName !== entry.fieldName) {
            return false;
          }
          return true;
        }

        // For resource-related changes, match by resourceUri
        if (entry.resourceUri && existing.resourceUri === entry.resourceUri) {
          return true;
        }

        // For flow-related changes, match by actionName (flow name stored in actionName)
        if (entry.type.includes('flow') && entry.actionName && existing.actionName === entry.actionName) {
          return true;
        }

        return false;
      });

      if (existingIndex !== -1) {
        // Update existing entry: keep original timestamp, update values and description
        const existingEntry = db.data.changelogs[sessionId][existingIndex];
        console.log('[Storage] Consolidating changelog entry:', {
          type: entry.type,
          actionName: entry.actionName,
          resourceUri: entry.resourceUri,
          fieldName: entry.fieldName,
          oldTimestamp: existingEntry.timestamp,
          newTimestamp: entry.timestamp
        });

        db.data.changelogs[sessionId][existingIndex] = {
          ...existingEntry,
          // Keep the original timestamp (first edit time)
          timestamp: existingEntry.timestamp,
          // Update the description to reflect the latest change
          description: entry.description,
          // Update old/new values
          oldValue: existingEntry.oldValue, // Keep original "before" value
          newValue: entry.newValue,         // Update to latest "after" value
          // Update the entry ID to the new one
          id: entry.id
        };
      } else {
        // No existing entry found, add new one
        db.data.changelogs[sessionId].push(entry);
      }

      await db.write();
      console.log('[Storage] Changelog entry processed for session:', sessionId);
    } catch (error) {
      console.error('[Storage] Error adding changelog entry:', error);
      throw error;
    }
  }

  /**
   * Clear changelog for a session
   */
  async clearChangelog(sessionId: string): Promise<void> {
    try {
      const db = await getDb();
      await db.read();
      delete db.data.changelogs[sessionId];
      await db.write();
      console.log('[Storage] Changelog cleared for session:', sessionId);
    } catch (error) {
      console.error('[Storage] Error clearing changelog:', error);
      throw error;
    }
  }

  /**
   * Clear all old changelogs (cleanup utility)
   */
  async clearOldChangelogs(): Promise<void> {
    try {
      const db = await getDb();
      await db.read();
      db.data.changelogs = {};
      await db.write();
      console.log('[Storage] All changelogs cleared');
    } catch (error) {
      console.error('[Storage] Error clearing all changelogs:', error);
      throw error;
    }
  }

  /**
   * ==================== ENVIRONMENTS METHODS ====================
   */

  /**
   * Get environments for a server
   */
  async getEnvironments(serverId: string): Promise<Environment[]> {
    try {
      const db = await getDb();
      await db.read();
      console.log('[Storage] Loaded environments for server:', serverId, db.data.environments[serverId]?.length || 0);
      return db.data.environments[serverId] || [];
    } catch (error) {
      console.error('[Storage] Error loading environments:', error);
      return [];
    }
  }

  /**
   * Save environments for a server
   */
  async saveEnvironments(serverId: string, environments: Environment[]): Promise<void> {
    try {
      const db = await getDb();
      await db.read();
      db.data.environments[serverId] = environments;
      await db.write();
      console.log('[Storage] Environments saved for server:', serverId);
    } catch (error) {
      console.error('[Storage] Error saving environments:', error);
      throw error;
    }
  }

  /**
   * Add an environment for a server
   */
  async addEnvironment(serverId: string, environment: Environment): Promise<Environment[]> {
    const environments = await this.getEnvironments(serverId);

    // Check for duplicate ID
    if (environments.some(e => e.id === environment.id)) {
      throw new Error(`Environment with ID ${environment.id} already exists`);
    }

    environments.push(environment);
    await this.saveEnvironments(serverId, environments);
    return environments;
  }

  /**
   * Update an environment for a server
   */
  async updateEnvironment(serverId: string, envId: string, updates: Partial<Environment>): Promise<void> {
    const environments = await this.getEnvironments(serverId);
    const index = environments.findIndex(e => e.id === envId);
    if (index === -1) {
      throw new Error(`Environment ${envId} not found`);
    }
    environments[index] = { ...environments[index], ...updates };
    await this.saveEnvironments(serverId, environments);
  }

  /**
   * Delete an environment for a server
   */
  async deleteEnvironment(serverId: string, envId: string): Promise<void> {
    const environments = await this.getEnvironments(serverId);
    const filtered = environments.filter(e => e.id !== envId);
    if (filtered.length === environments.length) {
      throw new Error(`Environment ${envId} not found`);
    }
    await this.saveEnvironments(serverId, filtered);
  }

  // ===== Deployments =====

  /**
   * Get all deployments for an environment
   */
  async getDeployments(environmentId: string): Promise<Deployment[]> {
    const db = await getDb();
    await db.read();
    return db.data.deployments[environmentId] || [];
  }

  /**
   * Get a single deployment by ID
   */
  async getDeployment(environmentId: string, deploymentId: string): Promise<Deployment | undefined> {
    const deployments = await this.getDeployments(environmentId);
    return deployments.find(d => d.id === deploymentId);
  }

  /**
   * Create a new deployment
   */
  async createDeployment(deployment: Deployment): Promise<Deployment> {
    const db = await getDb();
    await db.read();

    if (!db.data.deployments[deployment.environmentId]) {
      db.data.deployments[deployment.environmentId] = [];
    }

    db.data.deployments[deployment.environmentId].push(deployment);
    await db.write();

    return deployment;
  }

  /**
   * Update deployment status and metadata
   */
  async updateDeployment(environmentId: string, deploymentId: string, updates: Partial<Deployment>): Promise<Deployment> {
    const db = await getDb();
    await db.read();

    const deployments = db.data.deployments[environmentId] || [];
    const index = deployments.findIndex(d => d.id === deploymentId);

    if (index === -1) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    deployments[index] = { ...deployments[index], ...updates };
    await db.write();

    return deployments[index];
  }

  /**
   * Append output to deployment
   */
  async appendDeploymentOutput(environmentId: string, deploymentId: string, output: string): Promise<void> {
    const db = await getDb();
    await db.read();

    const deployments = db.data.deployments[environmentId] || [];
    const deployment = deployments.find(d => d.id === deploymentId);

    if (!deployment) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    deployment.output += output;
    await db.write();
  }

  /**
   * Get last deployment for an environment
   */
  async getLastDeployment(environmentId: string): Promise<Deployment | null> {
    const deployments = await this.getDeployments(environmentId);
    if (deployments.length === 0) return null;

    // Sort by startedAt descending and return first
    return deployments.sort((a, b) =>
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    )[0];
  }

  /**
   * Clear all deployments for an environment
   */
  async clearDeployments(environmentId: string): Promise<void> {
    const db = await getDb();
    await db.read();
    db.data.deployments[environmentId] = [];
    await db.write();
    console.log('[Storage] Cleared all deployments for environment:', environmentId);
  }

  /**
   * ==================== BULK DATA ACCESS METHODS ====================
   */

  /**
   * Get all deployments for all environments (bulk access)
   */
  async getAllDeployments(): Promise<{ [environmentId: string]: Deployment[] }> {
    try {
      const db = await getDb();
      await db.read();
      return db.data.deployments || {};
    } catch (error) {
      console.error('[Storage] Error getting all deployments:', error);
      return {};
    }
  }

  /**
   * Save all deployments for all environments (bulk access)
   */
  async saveAllDeployments(deployments: { [environmentId: string]: Deployment[] }): Promise<void> {
    try {
      const db = await getDb();
      await db.read();
      db.data.deployments = deployments;
      await db.write();
    } catch (error) {
      console.error('[Storage] Error saving all deployments:', error);
      throw error;
    }
  }

  /**
   * Get all actions for all servers (bulk access)
   */
  async getActions(): Promise<{ [serverId: string]: { discovered: MCPTool[]; custom: MCPTool[] } }> {
    try {
      const db = await getDb();
      await db.read();
      return db.data.actions || {};
    } catch (error) {
      console.error('[Storage] Error getting all actions:', error);
      return {};
    }
  }

  /**
   * Save all actions for all servers (bulk access)
   */
  async saveActions(actions: { [serverId: string]: { discovered: MCPTool[]; custom: MCPTool[] } }): Promise<void> {
    try {
      const db = await getDb();
      await db.read();
      db.data.actions = actions;
      await db.write();
      console.log('[Storage] All actions saved successfully');
    } catch (error) {
      console.error('[Storage] Error saving all actions:', error);
      throw error;
    }
  }

  /**
   * Get all widget resources for all servers (bulk access)
   */
  async getAllWidgetResources(): Promise<{ [serverId: string]: MCPResource[] }> {
    try {
      const db = await getDb();
      await db.read();
      return db.data.widgetResources || {};
    } catch (error) {
      console.error('[Storage] Error getting all widget resources:', error);
      return {};
    }
  }

  /**
   * Save all widget resources for all servers (bulk access)
   */
  async saveAllWidgetResources(resources: { [serverId: string]: MCPResource[] }): Promise<void> {
    try {
      const db = await getDb();
      await db.read();
      db.data.widgetResources = resources;
      await db.write();
      console.log('[Storage] All widget resources saved successfully');
    } catch (error) {
      console.error('[Storage] Error saving all widget resources:', error);
      throw error;
    }
  }


  /**
   * Get all environments for all servers (bulk access)
   */
  async getAllEnvironments(): Promise<{ [serverId: string]: Environment[] }> {
    try {
      const db = await getDb();
      await db.read();
      return db.data.environments || {};
    } catch (error) {
      console.error('[Storage] Error getting all environments:', error);
      return {};
    }
  }

  /**
   * Save all environments for all servers (bulk access)
   */
  async saveAllEnvironments(environments: { [serverId: string]: Environment[] }): Promise<void> {
    try {
      const db = await getDb();
      await db.read();
      db.data.environments = environments;
      await db.write();
      console.log('[Storage] All environments saved successfully');
    } catch (error) {
      console.error('[Storage] Error saving all environments:', error);
      throw error;
    }
  }

  /**
   * Clear all changelogs (bulk operation)
   */
  async clearAllChangelogs(): Promise<void> {
    try {
      const db = await getDb();
      await db.read();
      db.data.changelogs = {};
      await db.write();
      console.log('[Storage] All changelogs cleared successfully');
    } catch (error) {
      console.error('[Storage] Error clearing all changelogs:', error);
      throw error;
    }
  }

  /**
   * Migrate widget resources from old format to new format
   * OLD: { description, _meta: { "openai/widgetDescription": "..." } } (description optional)
   * NEW: { description (MANDATORY - MCP standard), _meta: { "openai/widgetDescription": "..." } }
   * Migration strategy:
   * 1. If resource has no description, use "Widget Resource" as default
   * 2. Move any top-level openai/* fields to _meta
   * 3. Ensure _meta structure is correct
   */
  async migrateWidgetResources(): Promise<void> {
    try {
      console.log('[Storage] Starting widget resources migration...');
      const db = await getDb();
      await db.read();

      if (!db.data.widgetResources) {
        console.log('[Storage] No widget resources to migrate');
        return;
      }

      let migrationCount = 0;
      let totalResources = 0;

      // Iterate through all servers
      for (const serverId of Object.keys(db.data.widgetResources)) {
        const resources = db.data.widgetResources[serverId];
        if (!Array.isArray(resources)) continue;

        totalResources += resources.length;

        for (let i = 0; i < resources.length; i++) {
          const resource = resources[i] as any;
          let needsMigration = false;

          // 1. Ensure description is present (MANDATORY)
          if (!resource.description || resource.description.trim() === '') {
            // Use name as fallback, or generic default
            resource.description = resource.name || 'Widget Resource';
            needsMigration = true;
            console.log(`[Storage]   - Resource ${resource.uri}: Added mandatory description`);
          }

          // 2. Ensure _meta object exists
          if (!resource._meta) {
            resource._meta = {};
          }

          // 3. Check for old format: openai/* fields at top level
          const oldOpenAIFields = ['openai/widgetDescription', 'openai/widgetPrefersBorder',
                                    'openai/widgetCSP', 'openai/widgetDomain'];
          for (const field of oldOpenAIFields) {
            if (resource[field] !== undefined) {
              // Move to _meta
              resource._meta[field] = resource[field];
              delete resource[field];
              needsMigration = true;
              console.log(`[Storage]   - Resource ${resource.uri}: Moved ${field} to _meta`);
            }
          }

          if (needsMigration) {
            resources[i] = resource;
            migrationCount++;
          }
        }
      }

      if (migrationCount > 0) {
        await db.write();
        console.log(`[Storage] Migration complete: ${migrationCount}/${totalResources} resources migrated`);
      } else {
        console.log('[Storage] Migration complete: No resources needed migration');
      }
    } catch (error) {
      console.error('[Storage] Error during widget resources migration:', error);
      throw error;
    }
  }

  /**
   * Reset the database singleton (for clean room operation)
   * This forces a fresh reinitialization with default data
   */
  async resetDatabase(): Promise<void> {
    try {
      console.log('[Storage] Resetting database singleton...');
      // Reset the singleton to null
      db = null;
      // Re-initialize with fresh data
      await getDb();
      console.log('[Storage] ✓ Database singleton reset and reinitialized');
    } catch (error) {
      console.error('[Storage] Error resetting database:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();
