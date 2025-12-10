import { Hono } from 'hono';
import { mcpClientManager } from '../services/mcpClientManager';

const toolsRouter = new Hono();

/**
 * GET /api/tools
 * Get all tools from all connected servers
 */
toolsRouter.get('/', async (c) => {
  try {
    const tools = await mcpClientManager.getAllTools();
    return c.json({ tools });
  } catch (error) {
    console.error('Error fetching tools:', error);
    return c.json(
      { error: 'Failed to fetch tools', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * GET /api/tools/server/:serverId
 * Get tools from a specific server
 */
toolsRouter.get('/server/:serverId', async (c) => {
  try {
    const serverId = c.req.param('serverId');
    const tools = await mcpClientManager.getToolsForServer(serverId);
    return c.json({ tools });
  } catch (error) {
    console.error('Error fetching tools for server:', error);
    return c.json(
      { error: 'Failed to fetch tools', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * POST /api/tools/execute
 * Execute a tool on a connected server
 */
toolsRouter.post('/execute', async (c) => {
  try {
    const { serverId, toolName, args } = await c.req.json<{
      serverId: string;
      toolName: string;
      args: any;
    }>();

    // Validate required fields
    if (!serverId || !toolName) {
      return c.json({ error: 'Missing required fields: serverId, toolName' }, 400);
    }

    const result = await mcpClientManager.executeTool(serverId, toolName, args || {});
    return c.json({ result });
  } catch (error) {
    console.error('Error executing tool:', error);
    return c.json(
      { error: 'Failed to execute tool', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

export { toolsRouter };
