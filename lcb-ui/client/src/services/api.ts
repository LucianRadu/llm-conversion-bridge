import type { MCPServer, MCPTool, MCPResource, ToolExecutionResult, Environment, Deployment } from '../../../shared/types';

const API_BASE = '/api';

// Request deduplication: cache pending promises to avoid duplicate concurrent calls
let pendingGetServers: Promise<MCPServer[]> | null = null;

/**
 * API client for communicating with the backend
 */
export class ApiClient {
  /**
   * Get all configured MCP servers
   * Uses request deduplication to prevent multiple concurrent calls
   */
  async getServers(): Promise<MCPServer[]> {
    // If a request is already in flight, return the same promise
    if (pendingGetServers) {
      console.log('[API Client] Reusing pending getServers request...');
      return pendingGetServers;
    }

    console.log('[API Client] Fetching all servers...');

    pendingGetServers = fetch(`${API_BASE}/servers`)
      .then(async (response) => {
        if (!response.ok) {
          console.error('[API Client] Failed to fetch servers:', response.statusText);
          throw new Error(`Failed to fetch servers: ${response.statusText}`);
        }
        const data = await response.json();
        console.log('[API Client] Fetched servers:', data.servers);
        return data.servers;
      })
      .finally(() => {
        // Clear after a small delay to allow batching of near-simultaneous calls
        setTimeout(() => {
          pendingGetServers = null;
        }, 100);
      });

    return pendingGetServers;
  }

  /**
   * Get a specific server by ID
   */
  async getServer(id: string): Promise<MCPServer> {
    const response = await fetch(`${API_BASE}/servers/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch server: ${response.statusText}`);
    }
    const data = await response.json();
    return data.server;
  }

  /**
   * Add a new MCP server
   */
  async addServer(server: Omit<MCPServer, 'status'>): Promise<MCPServer> {
    console.log('[API Client] Adding server:', server);
    const response = await fetch(`${API_BASE}/servers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(server)
    });
    if (!response.ok) {
      const error = await response.json();
      console.error('[API Client] Failed to add server:', error);
      throw new Error(error.message || 'Failed to add server');
    }
    const data = await response.json();
    console.log('[API Client] Server added successfully:', data.server);
    return data.server;
  }

  /**
   * Update an existing MCP server
   */
  async updateServer(id: string, updates: Partial<MCPServer>): Promise<MCPServer> {
    const response = await fetch(`${API_BASE}/servers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update server');
    }
    const data = await response.json();
    return data.server;
  }

  /**
   * Delete an MCP server
   */
  async deleteServer(id: string): Promise<void> {
    console.log('[API Client] Deleting server:', id);
    const response = await fetch(`${API_BASE}/servers/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const error = await response.json();
      console.error('[API Client] Failed to delete server:', error);
      throw new Error(error.message || 'Failed to delete server');
    }
    console.log('[API Client] Server deleted successfully:', id);
  }

  /**
   * Connect to an MCP server
   */
  async connectServer(id: string): Promise<MCPServer> {
    console.log('[API Client] Connecting to server:', id);
    const response = await fetch(`${API_BASE}/servers/${id}/connect`, {
      method: 'POST'
    });
    if (!response.ok) {
      const error = await response.json();
      console.error('[API Client] Failed to connect to server:', error);
      throw new Error(error.message || 'Failed to connect to server');
    }
    const data = await response.json();
    console.log('[API Client] Connected to server successfully:', data.server);
    return data.server;
  }

  /**
   * Disconnect from an MCP server
   */
  async disconnectServer(id: string): Promise<MCPServer> {
    console.log('[API Client] Disconnecting from server:', id);
    const response = await fetch(`${API_BASE}/servers/${id}/disconnect`, {
      method: 'POST'
    });
    if (!response.ok) {
      const error = await response.json();
      console.error('[API Client] Failed to disconnect from server:', error);
      throw new Error(error.message || 'Failed to disconnect from server');
    }
    const data = await response.json();
    console.log('[API Client] Disconnected from server successfully:', data.server);
    return data.server;
  }

  /**
   * Get all tools from all connected servers
   */
  async getTools(): Promise<MCPTool[]> {
    const response = await fetch(`${API_BASE}/tools`);
    if (!response.ok) {
      throw new Error(`Failed to fetch tools: ${response.statusText}`);
    }
    const data = await response.json();
    return data.tools;
  }

  /**
   * Get tools from a specific server
   */
  async getToolsForServer(serverId: string): Promise<MCPTool[]> {
    const response = await fetch(`${API_BASE}/tools/server/${serverId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch tools: ${response.statusText}`);
    }
    const data = await response.json();
    return data.tools;
  }

  /**
   * ==================== ACTION DRAFTS ====================
   */
  async getActionDrafts(serverId: string): Promise<MCPTool[]> {
    const response = await fetch(`${API_BASE}/actions/${serverId}/drafts`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch action drafts');
    }
    const data = await response.json();
    return data.drafts;
  }

  async upsertActionDraft(serverId: string, actionName: string, updates: Partial<MCPTool>): Promise<MCPTool[]> {
    const response = await fetch(`${API_BASE}/actions/${serverId}/drafts/${encodeURIComponent(actionName)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save action draft');
    }
    const data = await response.json();
    return data.drafts;
  }

  async deleteActionDraft(serverId: string, actionName: string): Promise<MCPTool[]> {
    const response = await fetch(`${API_BASE}/actions/${serverId}/drafts/${encodeURIComponent(actionName)}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete action draft');
    }
    const data = await response.json();
    return data.drafts;
  }

  async writeDraftsToSchemas(serverId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/actions/${serverId}/drafts/deploy`, {
      method: 'POST'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to write drafts to schema files');
    }
  }

  /**
   * Overwrite an action's schema.json directly (title, description, inputSchema)
   */
  async saveActionSchema(serverId: string, actionName: string, payload: { title: string; description: string; inputSchema?: any }): Promise<{ version: string; path: string }> {
    const response = await fetch(`${API_BASE}/actions/${serverId}/schema/${encodeURIComponent(actionName)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save action schema');
    }
    const data = await response.json();
    return { version: data.version, path: data.path };
  }

  /**
   * Toggle isPublished flag (soft delete/restore)
   */
  async setActionPublished(serverId: string, actionName: string, isPublished: boolean): Promise<void> {
    const response = await fetch(`${API_BASE}/actions/${serverId}/schema/${encodeURIComponent(actionName)}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublished })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update publish flag');
    }
  }

  /**
   * Execute a tool
   */
  async executeTool(serverId: string, toolName: string, args: any): Promise<ToolExecutionResult> {
    const response = await fetch(`${API_BASE}/tools/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverId, toolName, args })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to execute tool');
    }
    const data = await response.json();
    return data.result;
  }

  /**
   * Get all resources from all connected servers
   */
  async getResources(): Promise<MCPResource[]> {
    const response = await fetch(`${API_BASE}/resources`);
    if (!response.ok) {
      throw new Error(`Failed to fetch resources: ${response.statusText}`);
    }
    const data = await response.json();
    return data.resources;
  }

  /**
   * Get resources from a specific server
   */
  async getResourcesForServer(serverId: string): Promise<MCPResource[]> {
    const response = await fetch(`${API_BASE}/resources/server/${serverId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch resources: ${response.statusText}`);
    }
    const data = await response.json();
    return data.resources;
  }

  /**
   * Read a resource
   */
  async readResource(serverId: string, uri: string): Promise<any> {
    const response = await fetch(`${API_BASE}/resources/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverId, uri })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to read resource');
    }
    const data = await response.json();
    return data.contents;
  }

  /**
   * Get EDS URL from widget template.html
   * Returns { url: string } on success or { error: string, templatePath?: string } on failure
   */
  async getEdsUrlForResource(serverId: string, resourceUri: string): Promise<{ url?: string; error?: string; templatePath?: string }> {
    try {
      const encodedUri = encodeURIComponent(resourceUri);
      const apiUrl = `${API_BASE}/resources/eds-url/${serverId}/${encodedUri}`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        return { error: `HTTP ${response.status}: ${response.statusText}` };
      }

      const data = await response.json();

      if (data.edsUrl) {
        return { url: data.edsUrl };
      } else if (data.error) {
        return { error: data.error, templatePath: data.templatePath };
      } else {
        return { error: 'Unknown response format' };
      }
    } catch (error) {
      console.error('[API Client] Error fetching EDS URL:', error);
      return { error: error instanceof Error ? error.message : 'Network error occurred' };
    }
  }

  /**
   * ==================== ACTIONS API ====================
   */

  /**
   * Get all actions (discovered + custom) for a server
   */
  async getActions(serverId: string): Promise<MCPTool[]> {
    const response = await fetch(`${API_BASE}/actions/${serverId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch actions: ${response.statusText}`);
    }
    const data = await response.json();
    return data.actions;
  }

  /**
   * Get merged actions (MCP + DB with uncommitted changes priority)
   */
  async getMergedActions(serverId: string): Promise<MCPTool[]> {
    console.log('[API Client] Fetching merged actions for server:', serverId);
    const response = await fetch(`${API_BASE}/actions/${serverId}/merged`);
    if (!response.ok) {
      console.error('[API Client] Failed to fetch merged actions:', response.statusText);
      throw new Error(`Failed to fetch merged actions: ${response.statusText}`);
    }
    const data = await response.json();
    console.log('[API Client] Fetched merged actions:', data.tools.length);
    return data.tools;
  }

  /**
   * Get discovered actions for a server
   */
  async getDiscoveredActions(serverId: string): Promise<MCPTool[]> {
    const response = await fetch(`${API_BASE}/actions/${serverId}/discovered`);
    if (!response.ok) {
      throw new Error(`Failed to fetch discovered actions: ${response.statusText}`);
    }
    const data = await response.json();
    return data.actions;
  }

  /**
   * Get custom actions for a server
   */
  async getCustomActions(serverId: string): Promise<MCPTool[]> {
    const response = await fetch(`${API_BASE}/actions/${serverId}/custom`);
    if (!response.ok) {
      throw new Error(`Failed to fetch custom actions: ${response.statusText}`);
    }
    const data = await response.json();
    return data.actions;
  }

  /**
   * Add a discovered action for a server
   */
  async addDiscoveredAction(serverId: string, action: MCPTool): Promise<MCPTool[]> {
    const response = await fetch(`${API_BASE}/actions/${serverId}/discovered`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to add discovered action');
    }
    const data = await response.json();
    return data.actions;
  }

  /**
   * Add a custom action for a server
   */
  async addCustomAction(serverId: string, action: MCPTool): Promise<MCPTool[]> {
    const response = await fetch(`${API_BASE}/actions/${serverId}/custom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to add custom action');
    }
    const data = await response.json();
    return data.actions;
  }

  /**
   * Update an action for a server
   */
  async updateAction(serverId: string, actionName: string, updates: Partial<MCPTool>): Promise<MCPTool[]> {
    const response = await fetch(`${API_BASE}/actions/${serverId}/${encodeURIComponent(actionName)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update action');
    }
    const data = await response.json();
    return data.actions;
  }

  /**
   * Delete an action for a server
   */
  async deleteAction(serverId: string, actionName: string): Promise<MCPTool[]> {
    const response = await fetch(`${API_BASE}/actions/${serverId}/${encodeURIComponent(actionName)}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete action');
    }
    const data = await response.json();
    return data.actions;
  }

  /**
   * ==================== WIDGET RESOURCES API ====================
   */

  /**
   * Get all widget resources for a server
   */
  async getWidgetResources(serverId: string): Promise<MCPResource[]> {
    const response = await fetch(`${API_BASE}/widget-resources/${serverId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch widget resources: ${response.statusText}`);
    }
    const data = await response.json();
    return Array.isArray(data.resources) ? data.resources : [];
  }

  /**
   * Get widget resource by action name
   */
  async getWidgetResourceByActionName(serverId: string, actionName: string): Promise<MCPResource | null> {
    try {
      const response = await fetch(`${API_BASE}/widget-resources/${serverId}/by-action/${encodeURIComponent(actionName)}`);
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch widget resource: ${response.statusText}`);
      }
      const data = await response.json();
      return data.resource;
    } catch (error) {
      console.error('[API Client] Failed to fetch widget resource by action name:', error);
      return null;
    }
  }

  /**
   * Add a widget resource for a server
   */
  async addWidgetResource(serverId: string, resource: MCPResource): Promise<MCPResource[]> {
    const response = await fetch(`${API_BASE}/widget-resources/${serverId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resource)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to add widget resource');
    }
    const data = await response.json();
    return data.resources;
  }

  /**
   * Update a widget resource for a server
   */
  async updateWidgetResource(serverId: string, resourceUri: string, updates: Partial<MCPResource>): Promise<MCPResource[]> {
    const response = await fetch(`${API_BASE}/widget-resources/${serverId}/${encodeURIComponent(resourceUri)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update widget resource');
    }
    const data = await response.json();
    return data.resources;
  }

  /**
   * Delete a widget resource for a server
   */
  async deleteWidgetResource(serverId: string, resourceUri: string): Promise<MCPResource[]> {
    const response = await fetch(`${API_BASE}/widget-resources/${serverId}/${encodeURIComponent(resourceUri)}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete widget resource');
    }
    const data = await response.json();
    return data.resources;
  }

  /**
   * Get content of a widget resource from MCP server
   */
  async readWidgetResourceContent(serverId: string, resourceUri: string): Promise<any> {
    const response = await fetch(`${API_BASE}/widget-resources/${serverId}/${encodeURIComponent(resourceUri)}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to read widget resource content');
    }
    const data = await response.json();
    return data.contents;
  }

  /**
   * ==================== RESOURCE DRAFTS ====================
   */
  async getResourceDrafts(serverId: string): Promise<MCPResource[]> {
    const response = await fetch(`${API_BASE}/widget-resources/${serverId}/drafts`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch resource drafts');
    }
    const data = await response.json();
    return Array.isArray(data.drafts) ? data.drafts : [];
  }

  async upsertResourceDraft(serverId: string, resourceUri: string, updates: Partial<MCPResource>): Promise<MCPResource[]> {
    const response = await fetch(`${API_BASE}/widget-resources/${serverId}/drafts/${encodeURIComponent(resourceUri)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save resource draft');
    }
    const data = await response.json();
    return data.drafts;
  }

  async clearResourceDrafts(serverId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/widget-resources/${serverId}/drafts`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to clear resource drafts');
    }
  }

  async deployResourceDrafts(serverId: string): Promise<{ success: boolean; written: string[] }> {
    const response = await fetch(`${API_BASE}/widget-resources/${serverId}/drafts/deploy`, {
      method: 'POST'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to deploy resource drafts');
    }
    return response.json();
  }

  /**
   * ==================== FLOWS API ====================
   */


  /**
   * ==================== CHANGELOG API ====================
   */

  /**
   * Get changelog entries for a session
   */
  async getChangelog(sessionId: string): Promise<any[]> {
    const response = await fetch(`${API_BASE}/changelog/${sessionId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch changelog: ${response.statusText}`);
    }
    const data = await response.json();
    return data.changelog;
  }

  /**
   * Add a changelog entry for a session
   */
  async addChangelogEntry(sessionId: string, entry: any): Promise<any[]> {
    const response = await fetch(`${API_BASE}/changelog/${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to add changelog entry');
    }
    const data = await response.json();
    return data.changelog;
  }

  /**
   * Clear changelog for a session
   */
  async clearChangelog(sessionId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/changelog/${sessionId}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to clear changelog');
    }
  }

  /**
   * Clear all old changelogs (cleanup utility)
   */
  async clearAllChangelogs(): Promise<void> {
    const response = await fetch(`${API_BASE}/changelog`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to clear all changelogs');
    }
  }

  /**
   * ==================== ENVIRONMENTS METHODS ====================
   */

  /**
   * Get all environments for a server
   */
  async getEnvironments(serverId: string): Promise<Environment[]> {
    console.log('[API Client] Fetching environments for server:', serverId);
    const response = await fetch(`${API_BASE}/environments/${serverId}`);
    if (!response.ok) {
      const error = await response.json();
      console.error('[API Client] Failed to fetch environments:', error);
      throw new Error(error.message || 'Failed to fetch environments');
    }
    const data = await response.json();
    console.log('[API Client] Fetched environments:', data.environments);
    return data.environments;
  }

  /**
   * Add a new environment for a server
   */
  async addEnvironment(serverId: string, environment: Environment): Promise<Environment[]> {
    console.log('[API Client] Adding environment:', environment);
    const response = await fetch(`${API_BASE}/environments/${serverId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(environment)
    });
    if (!response.ok) {
      const error = await response.json();
      console.error('[API Client] Failed to add environment:', error);
      throw new Error(error.message || 'Failed to add environment');
    }
    const data = await response.json();
    return data.environments;
  }

  /**
   * Update an environment
   */
  async updateEnvironment(serverId: string, envId: string, updates: Partial<Environment>): Promise<Environment[]> {
    console.log('[API Client] Updating environment:', envId, updates);
    const response = await fetch(`${API_BASE}/environments/${serverId}/${envId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!response.ok) {
      const error = await response.json();
      console.error('[API Client] Failed to update environment:', error);
      throw new Error(error.message || 'Failed to update environment');
    }
    const data = await response.json();
    return data.environments;
  }

  /**
   * Delete an environment
   */
  async deleteEnvironment(serverId: string, envId: string): Promise<Environment[]> {
    console.log('[API Client] Deleting environment:', envId);
    const response = await fetch(`${API_BASE}/environments/${serverId}/${envId}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const error = await response.json();
      console.error('[API Client] Failed to delete environment:', error);
      throw new Error(error.message || 'Failed to delete environment');
    }
    const data = await response.json();
    return data.environments;
  }

  /**
   * ==================== DEPLOYMENTS METHODS ====================
   */

  /**
   * Get all deployments for an environment
   */
  async getDeployments(environmentId: string): Promise<Deployment[]> {
    console.log('[API Client] Fetching deployments for environment:', environmentId);
    const response = await fetch(`${API_BASE}/deployments/${environmentId}`);
    if (!response.ok) {
      const error = await response.json();
      console.error('[API Client] Failed to fetch deployments:', error);
      throw new Error(error.message || 'Failed to fetch deployments');
    }
    const data = await response.json();
    console.log('[API Client] Fetched deployments:', data.deployments);
    return data.deployments;
  }

  /**
   * Get a single deployment by ID
   */
  async getDeployment(environmentId: string, deploymentId: string): Promise<Deployment | null> {
    console.log('[API Client] Fetching deployment:', deploymentId);
    const response = await fetch(`${API_BASE}/deployments/${environmentId}/${deploymentId}`);
    if (!response.ok) {
      const error = await response.json();
      console.error('[API Client] Failed to fetch deployment:', error);
      throw new Error(error.message || 'Failed to fetch deployment');
    }
    const data = await response.json();
    console.log('[API Client] Fetched deployment:', data.deployment);
    return data.deployment;
  }

  /**
   * Get last deployment for an environment
   */
  async getLastDeployment(environmentId: string): Promise<Deployment | null> {
    console.log('[API Client] Fetching last deployment for environment:', environmentId);
    const response = await fetch(`${API_BASE}/deployments/${environmentId}/last`);
    if (!response.ok) {
      const error = await response.json();
      console.error('[API Client] Failed to fetch last deployment:', error);
      throw new Error(error.message || 'Failed to fetch last deployment');
    }
    const data = await response.json();
    console.log('[API Client] Fetched last deployment:', data.deployment);
    return data.deployment;
  }

  /**
   * ==================== CLEANUP METHODS ====================
   */

  /**
   * Clean room - clears all managed servers and related data from the database
   */
  async cleanRoom(): Promise<void> {
    console.log('[API Client] Starting clean room cleanup...');
    const response = await fetch(`${API_BASE}/cleanup/clean-room`, {
      method: 'POST'
    });
    if (!response.ok) {
      const error = await response.json();
      console.error('[API Client] Failed to clean room:', error);
      throw new Error(error.message || 'Failed to clean room');
    }
    console.log('[API Client] Clean room cleanup completed');
  }

  /**
   * ==================== BASH COMMAND EXECUTION ====================
   */

  /**
   * Execute a bash command
   */
  async executeBashCommand(
    command: string,
    options?: {
      description?: string;
      environmentId?: string;
      serverId?: string;
      background?: boolean;
      cwd?: string;
    }
  ): Promise<{ output: string; sessionId: string; deploymentId?: string }> {
    console.log('[API Client] Executing bash command:', command);
    const response = await fetch(`${API_BASE}/bash/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command,
        description: options?.description,
        environmentId: options?.environmentId,
        serverId: options?.serverId,
        background: options?.background || false,
        cwd: options?.cwd
      })
    });
    if (!response.ok) {
      const error = await response.json();
      console.error('[API Client] Failed to execute bash command:', error);
      throw new Error(error.message || 'Failed to execute bash command');
    }
    const data = await response.json();
    console.log('[API Client] Bash command executed successfully');
    return {
      output: data.output || '',
      sessionId: data.sessionId,
      deploymentId: data.deploymentId
    };
  }

  /**
   * Kill a running bash command by session ID
   */
  async killBashCommand(sessionId: string): Promise<void> {
    console.log('[API Client] Killing bash command with session:', sessionId);
    const response = await fetch(`${API_BASE}/bash/kill/${sessionId}`, {
      method: 'POST'
    });
    if (!response.ok) {
      const error = await response.json();
      console.error('[API Client] Failed to kill bash command:', error);
      throw new Error(error.message || 'Failed to kill bash command');
    }
    console.log('[API Client] Bash command killed successfully');
  }

  /**
   * Call Tool Planner API with user prompt and IMS token
   * Returns detailed request/response information regardless of success/failure
   */
  async callToolPlanner(prompt: string, imsToken: string): Promise<any> {
    console.log('[API Client] Calling Tool Planner API');
    const response = await fetch(`${API_BASE}/tool-planner`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ prompt, imsToken })
    });

    // Always return the JSON response, regardless of HTTP status
    // Backend now returns structured data even for errors
    const data = await response.json();
    console.log('[API Client] Tool Planner response received:', data);
    return data;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
