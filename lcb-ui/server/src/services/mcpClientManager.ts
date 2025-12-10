import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { MCPServer, MCPTool, MCPResource, ToolExecutionResult } from '../../../shared/types';

interface ActiveClient {
  client: Client;
  server: MCPServer;
  transport: StdioClientTransport | SSEClientTransport | StreamableHTTPClientTransport;
}

export class MCPClientManager {
  private activeClients: Map<string, ActiveClient> = new Map();

  /**
   * Connect to an MCP server
   */
  async connect(server: MCPServer): Promise<string | undefined> {
    // If already connected, disconnect first
    if (this.activeClients.has(server.id)) {
      await this.disconnect(server.id);
    }

    try {
      let transport: StdioClientTransport | SSEClientTransport | StreamableHTTPClientTransport;

      if (server.transport === 'stdio') {
        // STDIO transport for local command-based servers
        if (!server.command) {
          throw new Error('STDIO transport requires a command');
        }

        transport = new StdioClientTransport({
          command: server.command,
          args: [],
          env: server.env || {}
        });
      } else if (server.transport === 'http') {
        // Streamable HTTP transport for HTTP-based servers (per MCP spec 2025-03-26)
        // This handles session management via Mcp-Session-Id header automatically
        transport = new StreamableHTTPClientTransport(new URL(server.url));
      } else if (server.transport === 'sse') {
        // SSE transport for servers that only support Server-Sent Events
        transport = new SSEClientTransport(new URL(server.url));
      } else {
        throw new Error(`Unsupported transport type: ${server.transport}`);
      }

      // Create and connect the client
      console.log(`[MCP Client Manager] Creating client for ${server.name}...`);
      const client = new Client(
        {
          name: 'lcb-ui',
          version: '1.0.0'
        },
        {
          capabilities: {
            tools: {},
            resources: {}
          }
        }
      );

      console.log(`[MCP Client Manager] Connecting to ${server.url}...`);
      await client.connect(transport);

      // Log server info from the client
      console.log(`[MCP Client Manager] ✅ Connected successfully!`);

      // Try to access server info from the client - the MCP SDK stores this after initialize
      try {
        // The client has private properties, but we can access them for logging
        const clientAny = client as any;
        console.log(`[MCP Client Manager] 📋 Initialize Response:`, {
          serverName: clientAny._serverInfo?.name || 'Unknown',
          serverVersion: clientAny._serverInfo?.version || 'Unknown',
          protocolVersion: clientAny._serverVersion || 'Unknown',
          capabilities: clientAny._serverCapabilities || {}
        });
      } catch (e) {
        console.log(`[MCP Client Manager] ⚠️  Could not extract server info (this is normal)`);
      }

      // Store the active client
      this.activeClients.set(server.id, {
        client,
        server,
        transport
      });

      console.log(`[MCP Client Manager] 💾 Active connection stored for: ${server.name} (${server.id})`);

      // Extract session ID if using HTTP transport
      let sessionId: string | undefined;
      if (server.transport === 'http' && transport instanceof StreamableHTTPClientTransport) {
        try {
          // The transport might have a sessionId property
          const transportAny = transport as any;
          sessionId = transportAny.sessionId || transportAny._sessionId;
          if (sessionId) {
            console.log(`[MCP Client Manager] 🔑 Session ID: ${sessionId}`);
          }
        } catch (e) {
          console.log(`[MCP Client Manager] ⚠️  Could not extract session ID`);
        }
      }

      return sessionId;
    } catch (error) {
      console.error(`Failed to connect to ${server.name}:`, error);
      throw error;
    }
  }

  /**
   * Disconnect from an MCP server
   */
  async disconnect(serverId: string): Promise<void> {
    const activeClient = this.activeClients.get(serverId);
    if (!activeClient) {
      return;
    }

    try {
      await activeClient.client.close();
      this.activeClients.delete(serverId);
      console.log(`Disconnected from MCP server: ${activeClient.server.name}`);
    } catch (error) {
      console.error(`Error disconnecting from ${activeClient.server.name}:`, error);
      throw error;
    }
  }

  /**
   * Check if a server is connected
   */
  isConnected(serverId: string): boolean {
    return this.activeClients.has(serverId);
  }

  /**
   * Get all available tools from all connected servers
   */
  async getAllTools(): Promise<MCPTool[]> {
    const allTools: MCPTool[] = [];

    for (const [serverId, activeClient] of this.activeClients) {
      try {
        const response = await activeClient.client.listTools();
        const tools = response.tools.map(tool => {
          const toolAny = tool as any;
          // Check if inputSchemaJson is available in _meta (preserves descriptions)
          const inputSchemaJson = toolAny._meta?.inputSchemaJson;
          const inputSchema = inputSchemaJson || tool.inputSchema;
          
          return {
            name: tool.name,
            title: tool.name,
            description: tool.description,
            inputSchema: inputSchema,
            // Use actual annotations from MCP server if present, otherwise omit
            ...(toolAny.annotations && { annotations: toolAny.annotations }),
            ...(toolAny._meta && { _meta: toolAny._meta })
          };
        });
        allTools.push(...tools);
      } catch (error) {
        console.error(`Error fetching tools from ${activeClient.server.name}:`, error);
      }
    }

    return allTools;
  }

  /**
   * Get tools from a specific server
   */
  async getToolsForServer(serverId: string): Promise<MCPTool[]> {
    const activeClient = this.activeClients.get(serverId);
    if (!activeClient) {
      throw new Error(`Server ${serverId} is not connected`);
    }

    try {
      const response = await activeClient.client.listTools();
      
      // DEBUG: Log the first tool to see its structure
      if (response.tools.length > 0) {
        console.log('[MCP Client Manager] First tool structure:', JSON.stringify(response.tools[0], null, 2));
      }
      
      return response.tools.map(tool => {
        const toolAny = tool as any;
        
        // DEBUG: Log _meta extraction
        console.log(`[MCP Client Manager] Tool ${tool.name} _meta:`, toolAny._meta);
        
        // Check if inputSchemaJson is available in _meta (preserves descriptions)
        const inputSchemaJson = toolAny._meta?.inputSchemaJson;
        const inputSchema = inputSchemaJson || tool.inputSchema;
        
        return {
          name: tool.name,
          title: tool.name,
          description: tool.description,
          inputSchema: inputSchema,
          // Use actual annotations from MCP server if present, otherwise omit
          ...(toolAny.annotations && { annotations: toolAny.annotations }),
          // Include _meta if present in the tool definition
          ...(toolAny._meta && { _meta: toolAny._meta })
        };
      });
    } catch (error) {
      console.error(`Error fetching tools from ${activeClient.server.name}:`, error);
      throw error;
    }
  }

  /**
   * Execute a tool on a connected server
   */
  async executeTool(serverId: string, toolName: string, args: any): Promise<ToolExecutionResult> {
    const activeClient = this.activeClients.get(serverId);
    if (!activeClient) {
      throw new Error(`Server ${serverId} is not connected`);
    }

    try {
      const response = await activeClient.client.callTool({
        name: toolName,
        arguments: args
      });

      const responseAny = response as any;

      return {
        content: Array.isArray(response.content) ? (response.content as any[]).map((item: any) => ({
          type: item.type,
          text: 'text' in item ? item.text : JSON.stringify(item)
        })) : [],
        success: !response.isError,
        error: response.isError ? 'Tool execution failed' : undefined,
        // Include structuredContent, _annotations and _meta if present in the response
        ...(responseAny.structuredContent && { structuredContent: responseAny.structuredContent }),
        ...(responseAny._annotations && { _annotations: responseAny._annotations }),
        ...(responseAny._meta && { _meta: responseAny._meta })
      };
    } catch (error) {
      console.error(`Error executing tool ${toolName}:`, error);
      return {
        content: [{
          type: 'text',
          text: error instanceof Error ? error.message : 'Unknown error'
        }],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get all available resources from all connected servers
   */
  async getAllResources(): Promise<MCPResource[]> {
    const allResources: MCPResource[] = [];

    for (const [serverId, activeClient] of this.activeClients) {
      try {
        const response = await activeClient.client.listResources();
        const resources = response.resources.map(resource => ({
          uri: resource.uri,
          name: resource.name,
          description: resource.description || '', // Provide default empty string if undefined
          mimeType: resource.mimeType
        }));
        allResources.push(...resources);
      } catch (error) {
        console.error(`Error fetching resources from ${activeClient.server.name}:`, error);
      }
    }

    return allResources;
  }

  /**
   * Get resources from a specific server
   */
  async getResourcesForServer(serverId: string): Promise<MCPResource[]> {
    const activeClient = this.activeClients.get(serverId);
    if (!activeClient) {
      throw new Error(`Server ${serverId} is not connected`);
    }

    try {
      const response = await activeClient.client.listResources();
      return response.resources.map(resource => ({
        uri: resource.uri,
        name: resource.name,
        description: resource.description || '', // Provide default empty string if undefined
        mimeType: resource.mimeType,
        _meta: resource._meta
      }));
    } catch (error) {
      console.error(`Error fetching resources from ${activeClient.server.name}:`, error);
      throw error;
    }
  }

  /**
   * Get a single resource with full metadata including _meta
   * Note: _meta is only available in readResource contents, not in listResources
   */
  async getResourceWithMeta(serverId: string, uri: string): Promise<MCPResource> {
    const activeClient = this.activeClients.get(serverId);
    if (!activeClient) {
      throw new Error(`Server ${serverId} is not connected`);
    }

    try {
      // Read the resource to get full contents including _meta
      const response = await activeClient.client.readResource({ uri });
      
      if (!response.contents || response.contents.length === 0) {
        throw new Error(`Resource ${uri} has no contents`);
      }

      const content = response.contents[0];
      console.log('[mcpClientManager] Resource content from MCP:', JSON.stringify(content, null, 2));

      return {
        uri: content.uri,
        name: content.uri.split('/').pop()?.replace('.html', '') || '',
        description: (content.description || '') as string, // Ensure it's a string
        mimeType: content.mimeType || 'text/html',
        _meta: content._meta
      };
    } catch (error) {
      console.error(`Error fetching resource ${uri}:`, error);
      throw error;
    }
  }

  /**
   * Read a resource from a connected server
   */
  async readResource(serverId: string, uri: string): Promise<any> {
    const activeClient = this.activeClients.get(serverId);
    if (!activeClient) {
      throw new Error(`Server ${serverId} is not connected`);
    }

    try {
      const response = await activeClient.client.readResource({ uri });
      return response.contents;
    } catch (error) {
      console.error(`Error reading resource ${uri}:`, error);
      throw error;
    }
  }

  /**
   * Disconnect all active clients (cleanup)
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.activeClients.keys()).map(id =>
      this.disconnect(id)
    );
    await Promise.allSettled(disconnectPromises);
  }

  /**
   * Get list of connected server IDs
   */
  getConnectedServerIds(): string[] {
    return Array.from(this.activeClients.keys());
  }
}

// Export singleton instance
export const mcpClientManager = new MCPClientManager();
