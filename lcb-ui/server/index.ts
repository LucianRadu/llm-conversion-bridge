// Load environment variables from .env file in project root
// IMPORTANT: This must be the FIRST import to ensure env vars are available
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current file (lcb-ui/server/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root (two levels up: server/ -> lcb-ui/ -> root/)
config({ path: resolve(__dirname, '../../.env') });

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serversRouter } from './src/routes/servers';
import { toolsRouter } from './src/routes/tools';
import { resourcesRouter } from './src/routes/resources';
import { actionsRouter } from './src/routes/actions';
import { widgetResourcesRouter } from './src/routes/widgetResources';
import { environmentsRouter } from './src/routes/environments';
import { changelogRouter } from './src/routes/changelog';
import openaiRouter from './src/routes/openai';
import { bashRouter } from './src/routes/bash';
import { deploymentsRouter } from './src/routes/deployments';
import { cleanupRouter } from './src/routes/cleanup';
import { healthRouter } from './src/routes/health';
import { toolPlannerRouter } from './src/routes/toolPlanner';
import { mcpClientManager, MCPClientManager } from './src/services/mcpClientManager';
import { ensureManagedServers } from './src/services/sourceServerInitializer';
import { storageService } from './src/services/storage';

// Extend Hono context to include mcpClientManager
type AppContext = {
  Variables: {
    mcpClientManager: MCPClientManager;
  };
};

const app = new Hono<AppContext>();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Make mcpClientManager available in context for all routes
app.use('*', async (c, next) => {
  c.set('mcpClientManager', mcpClientManager);
  await next();
});

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount API routes
app.route('/api/servers', serversRouter);
app.route('/api/tools', toolsRouter);
app.route('/api/resources', resourcesRouter);
app.route('/api/actions', actionsRouter);
app.route('/api/widget-resources', widgetResourcesRouter);
app.route('/api/environments', environmentsRouter);
app.route('/api/changelog', changelogRouter);
app.route('/api/openai', openaiRouter);
app.route('/api/bash', bashRouter);
app.route('/api/deployments', deploymentsRouter);
app.route('/api/cleanup', cleanupRouter);
app.route('/api/health', healthRouter);
app.route('/api/tool-planner', toolPlannerRouter);

const port = parseInt(process.env.LCB_UI_BACKEND_PORT || '3000', 10);
console.log(`LCB UI Server starting on http://localhost:${port}`);

// Initialize managed servers on startup
await ensureManagedServers();

// Migrate widget resources to new format on startup
await storageService.migrateWidgetResources();

// Cleanup on shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await mcpClientManager.disconnectAll();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  await mcpClientManager.disconnectAll();
  process.exit(0);
});

serve({
  fetch: app.fetch,
  port
});
