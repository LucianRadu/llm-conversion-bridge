import { Hono } from 'hono';
import { mcpClientManager } from '../services/mcpClientManager';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { storageService } from '../services/storage';

const resourcesRouter = new Hono();

/**
 * GET /api/resources
 * Get all resources from all connected servers
 */
resourcesRouter.get('/', async (c) => {
  try {
    const resources = await mcpClientManager.getAllResources();
    return c.json({ resources });
  } catch (error) {
    console.error('Error fetching resources:', error);
    return c.json(
      { error: 'Failed to fetch resources', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * GET /api/resources/server/:serverId
 * Get resources from a specific server
 */
resourcesRouter.get('/server/:serverId', async (c) => {
  try {
    const serverId = c.req.param('serverId');
    const resources = await mcpClientManager.getResourcesForServer(serverId);
    return c.json({ resources });
  } catch (error) {
    console.error('Error fetching resources for server:', error);
    return c.json(
      { error: 'Failed to fetch resources', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * GET /api/resources/server/:serverId/resource
 * Get a single resource with full metadata from a connected server
 */
resourcesRouter.get('/server/:serverId/resource', async (c) => {
  try {
    const serverId = c.req.param('serverId');
    const uri = c.req.query('uri');

    // Validate required fields
    if (!serverId || !uri) {
      return c.json({ error: 'Missing required fields: serverId, uri' }, 400);
    }

    const resource = await mcpClientManager.getResourceWithMeta(serverId, uri);
    return c.json({ resource });
  } catch (error) {
    console.error('Error fetching resource:', error);
    return c.json(
      { error: 'Failed to fetch resource', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * POST /api/resources/read
 * Read a resource from a connected server
 */
resourcesRouter.post('/read', async (c) => {
  try {
    const { serverId, uri } = await c.req.json<{
      serverId: string;
      uri: string;
    }>();

    // Validate required fields
    if (!serverId || !uri) {
      return c.json({ error: 'Missing required fields: serverId, uri' }, 400);
    }

    const contents = await mcpClientManager.readResource(serverId, uri);
    return c.json({ contents });
  } catch (error) {
    console.error('Error reading resource:', error);
    return c.json(
      { error: 'Failed to read resource', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * GET /api/resources/eds-url/:serverId/:resourceUri
 * Extract EDS URL from widget template.html file
 * Returns { edsUrl: string } on success or { error: string, templatePath?: string } on failure
 */
resourcesRouter.get('/eds-url/:serverId/:resourceUri', async (c) => {
  try {
    const serverId = c.req.param('serverId');
    const resourceUri = decodeURIComponent(c.req.param('resourceUri'));

    console.log('[Resources] Extracting EDS URL for resource:', { serverId, resourceUri });

    // Extract action name from URI (e.g., ui://eds-widget/hello-world-widget.html -> hello-world)
    const uriMatch = resourceUri.match(/ui:\/\/eds-widget\/(.+)\.html/);
    if (!uriMatch) {
      console.log('[Resources] Not an EDS widget URI, skipping');
      return c.json({ error: 'Not an EDS widget URI' });
    }

    let actionNameKebab = uriMatch[1]; // e.g., "hello-world-eds-widget"
    console.log('[Resources] Extracted action name (kebab):', actionNameKebab);

    // Remove common suffixes: -widget, -eds-widget
    actionNameKebab = actionNameKebab.replace(/-eds-widget$/, '').replace(/-widget$/, '');
    console.log('[Resources] Action name after removing suffixes:', actionNameKebab);

    // Get the server to find its source project path
    const servers = await storageService.getServers();
    const server = servers.find(s => s.id === serverId);

    if (!server || !server.sourceProjectPath) {
      console.log('[Resources] Server not found or no source path');
      return c.json({ error: 'Server not found or no source path configured' });
    }

    // Convert kebab-case to camelCase for folder name (e.g., hello-world-eds -> helloWorldEDS)
    // Special handling: "eds" at the end should become "EDS" (all caps)
    const actionFolderName = actionNameKebab
      .replace(/-eds$/, '-EDS') // Handle -eds at end -> -EDS
      .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()) // Convert to camelCase
      .replace(/-([A-Z]+)/g, (_, letters) => letters); // Remove dash before uppercase
    console.log('[Resources] Action folder name (camelCase):', actionFolderName);

    // Construct path to template.html
    const templatePath = join(
      process.cwd(),
      '..',
      server.sourceProjectPath,
      'server',
      'src',
      'actions',
      actionFolderName,
      'widget',
      'template.html'
    );

    console.log('[Resources] Looking for template at:', templatePath);

    if (!existsSync(templatePath)) {
      console.log('[Resources] Template file not found');
      return c.json({
        error: 'Template file not found',
        templatePath
      });
    }

    // Read template file
    const templateContent = readFileSync(templatePath, 'utf-8');
    console.log('[Resources] Template file read successfully, length:', templateContent.length);

    // Extract EDS URL from aem-embed element
    // Looking for: <aem-embed url="https://main--eds-001--george-cgg.aem.live/eds-widgets/hello-world"></aem-embed>
    const aemEmbedMatch = templateContent.match(/<aem-embed\s+url="([^"]+)"/);

    if (aemEmbedMatch) {
      const edsUrl = aemEmbedMatch[1];
      console.log('[Resources] Extracted EDS URL:', edsUrl);
      return c.json({ edsUrl });
    }

    console.log('[Resources] No aem-embed url found in template');
    return c.json({
      error: 'No aem-embed element with url attribute found in template',
      templatePath
    });

  } catch (error) {
    console.error('[Resources] Error extracting EDS URL:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

export { resourcesRouter };
