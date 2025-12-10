import { Hono } from 'hono';
import { storageService } from '../services/storage';
import { mcpClientManager } from '../services/mcpClientManager';
import type { MCPServer } from '../../../shared/types';

const serversRouter = new Hono();

/**
 * GET /api/servers
 * List all configured MCP servers
 */
serversRouter.get('/', async (c) => {
  try {
    const servers = await storageService.getServers();

    // Update status for each server based on connection state
    const serversWithStatus = servers.map(server => ({
      ...server,
      status: mcpClientManager.isConnected(server.id) ? 'connected' : 'disconnected'
    })) as MCPServer[];

    return c.json({ servers: serversWithStatus });
  } catch (error) {
    console.error('Error fetching servers:', error);
    return c.json(
      { error: 'Failed to fetch servers', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * GET /api/servers/:id
 * Get a specific server by ID
 */
serversRouter.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const server = await storageService.getServer(id);

    if (!server) {
      return c.json({ error: 'Server not found' }, 404);
    }

    // Update status based on connection state
    const serverWithStatus = {
      ...server,
      status: mcpClientManager.isConnected(server.id) ? 'connected' : 'disconnected'
    } as MCPServer;

    return c.json({ server: serverWithStatus });
  } catch (error) {
    console.error('Error fetching server:', error);
    return c.json(
      { error: 'Failed to fetch server', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * POST /api/servers
 * Add a new MCP server
 */
serversRouter.post('/', async (c) => {
  try {
    const server = await c.req.json<MCPServer>();

    // Validate required fields
    if (!server.id || !server.name || !server.url || !server.transport) {
      return c.json({ error: 'Missing required fields: id, name, url, transport' }, 400);
    }

    // Add server to storage
    const servers = await storageService.addServer({
      ...server,
      status: 'disconnected'
    });

    return c.json({ server, servers }, 201);
  } catch (error) {
    console.error('Error adding server:', error);
    return c.json(
      { error: 'Failed to add server', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * PUT /api/servers/:id
 * Update an existing MCP server
 */
serversRouter.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json<Partial<MCPServer>>();

    // Update server in storage
    const servers = await storageService.updateServer(id, updates);
    const updatedServer = servers.find(s => s.id === id);

    if (!updatedServer) {
      return c.json({ error: 'Server not found after update' }, 500);
    }

    return c.json({ server: updatedServer, servers });
  } catch (error) {
    console.error('Error updating server:', error);
    return c.json(
      { error: 'Failed to update server', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * DELETE /api/servers/:id
 * Remove an MCP server
 */
serversRouter.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    // Disconnect if connected
    if (mcpClientManager.isConnected(id)) {
      await mcpClientManager.disconnect(id);
    }

    // Remove from storage
    const servers = await storageService.removeServer(id);

    return c.json({ servers });
  } catch (error) {
    console.error('Error deleting server:', error);
    return c.json(
      { error: 'Failed to delete server', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * POST /api/servers/:id/connect
 * Manually connect to a server
 */
serversRouter.post('/:id/connect', async (c) => {
  const id = c.req.param('id');
  const server = await storageService.getServer(id);

  if (!server) {
    return c.json({ error: 'Server not found' }, 404);
  }

  try {
    // Try to connect
    const sessionId = await mcpClientManager.connect(server);

    // Update status, save last connected timestamp, and session ID
    const lastConnectedAt = new Date().toISOString();
    await storageService.updateServer(id, {
      status: 'connected',
      lastConnectedAt,
      sessionId
    });

    return c.json({ server: { ...server, status: 'connected', lastConnectedAt, sessionId } });
  } catch (error) {
    console.error('Error connecting to server:', error);

    // Provide more descriptive error messages
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      const errMsg = error.message.toLowerCase();
      const cause = (error as any).cause;
      const serverType = server.serverType === 'local-managed' ? 'local' : 'remote';

      // Check for connection refused
      if (errMsg.includes('econnrefused') || (cause && cause.code === 'ECONNREFUSED')) {
        errorMessage = `Cannot connect to ${serverType} server "${server.name}". Make sure the server is running and accessible.`;
      } else if (errMsg.includes('fetch failed')) {
        errorMessage = `Connection failed to ${serverType} server "${server.name}". The server may not be started or is unreachable.`;
      } else {
        errorMessage = error.message;
      }
    }

    return c.json(
      { error: 'Failed to connect', message: errorMessage },
      500
    );
  }
});

/**
 * POST /api/servers/:id/disconnect
 * Manually disconnect from a server
 */
serversRouter.post('/:id/disconnect', async (c) => {
  try {
    const id = c.req.param('id');
    const server = await storageService.getServer(id);

    if (!server) {
      return c.json({ error: 'Server not found' }, 404);
    }

    // Disconnect
    await mcpClientManager.disconnect(id);

    // Update status and clear session ID
    await storageService.updateServer(id, { status: 'disconnected', sessionId: undefined });

    return c.json({ server: { ...server, status: 'disconnected', sessionId: undefined } });
  } catch (error) {
    console.error('Error disconnecting from server:', error);
    return c.json(
      { error: 'Failed to disconnect', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

export { serversRouter };
