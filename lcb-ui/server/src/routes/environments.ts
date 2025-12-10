import { Hono } from 'hono';
import { storageService } from '../services/storage';
import type { Environment } from '../../../shared/types';

export const environmentsRouter = new Hono();

/**
 * GET /api/environments/:serverId
 * Get all environments for a server
 */
environmentsRouter.get('/:serverId', async (c) => {
  try {
    const serverId = c.req.param('serverId');
    const environments = await storageService.getEnvironments(serverId);
    return c.json({ environments });
  } catch (error) {
    console.error('Error fetching environments:', error);
    return c.json(
      { error: 'Failed to fetch environments', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * POST /api/environments/:serverId
 * Add a new environment for a server
 */
environmentsRouter.post('/:serverId', async (c) => {
  try {
    const serverId = c.req.param('serverId');
    const environment: Environment = await c.req.json();

    const environments = await storageService.addEnvironment(serverId, environment);
    return c.json({ environments });
  } catch (error) {
    console.error('Error adding environment:', error);
    return c.json(
      { error: 'Failed to add environment', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * PUT /api/environments/:serverId/:envId
 * Update an environment
 */
environmentsRouter.put('/:serverId/:envId', async (c) => {
  try {
    const serverId = c.req.param('serverId');
    const envId = c.req.param('envId');
    const updates: Partial<Environment> = await c.req.json();

    await storageService.updateEnvironment(serverId, envId, updates);
    const environments = await storageService.getEnvironments(serverId);
    return c.json({ environments });
  } catch (error) {
    console.error('Error updating environment:', error);
    return c.json(
      { error: 'Failed to update environment', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * DELETE /api/environments/:serverId/:envId
 * Delete an environment
 */
environmentsRouter.delete('/:serverId/:envId', async (c) => {
  try {
    const serverId = c.req.param('serverId');
    const envId = c.req.param('envId');

    await storageService.deleteEnvironment(serverId, envId);
    const environments = await storageService.getEnvironments(serverId);
    return c.json({ environments });
  } catch (error) {
    console.error('Error deleting environment:', error);
    return c.json(
      { error: 'Failed to delete environment', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});
