import { Hono } from 'hono';
import { storageService } from '../services/storage';
import type { Deployment } from '../../../shared/types';

export const deploymentsRouter = new Hono();

/**
 * GET /api/deployments/:environmentId
 * Get all deployments for an environment
 */
deploymentsRouter.get('/:environmentId', async (c) => {
  try {
    const environmentId = c.req.param('environmentId');
    const deployments = await storageService.getDeployments(environmentId);

    return c.json({ deployments });
  } catch (error) {
    console.error('[Deployments API] Failed to fetch deployments:', error);
    return c.json(
      {
        error: 'Failed to fetch deployments',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});

/**
 * GET /api/deployments/:environmentId/last
 * Get last deployment for an environment
 */
deploymentsRouter.get('/:environmentId/last', async (c) => {
  try {
    const environmentId = c.req.param('environmentId');
    const deployment = await storageService.getLastDeployment(environmentId);

    return c.json({ deployment });
  } catch (error) {
    console.error('[Deployments API] Failed to fetch last deployment:', error);
    return c.json(
      {
        error: 'Failed to fetch last deployment',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});

/**
 * POST /api/deployments/:environmentId
 * Create a new deployment
 */
deploymentsRouter.post('/:environmentId', async (c) => {
  try {
    const environmentId = c.req.param('environmentId');
    const body = await c.req.json();
    
    const deployment: Deployment = {
      id: `deploy-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      environmentId,
      serverId: body.serverId,
      status: body.status || 'running',
      command: body.command || '',
      output: body.output || '',
      startedAt: body.startedAt || new Date().toISOString(),
      sessionId: body.sessionId
    };

    const created = await storageService.createDeployment(deployment);
    console.log('[Deployments API] Created deployment:', created.id);

    return c.json(created);
  } catch (error) {
    console.error('[Deployments API] Failed to create deployment:', error);
    return c.json(
      {
        error: 'Failed to create deployment',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});

/**
 * GET /api/deployments/:environmentId/:deploymentId
 * Get a single deployment
 */
deploymentsRouter.get('/:environmentId/:deploymentId', async (c) => {
  try {
    const environmentId = c.req.param('environmentId');
    const deploymentId = c.req.param('deploymentId');
    const deployment = await storageService.getDeployment(environmentId, deploymentId);

    if (!deployment) {
      return c.json({ error: 'Deployment not found' }, 404);
    }

    return c.json({ deployment });
  } catch (error) {
    console.error('[Deployments API] Failed to fetch deployment:', error);
    return c.json(
      {
        error: 'Failed to fetch deployment',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});

/**
 * PATCH /api/deployments/:environmentId/:deploymentId
 * Update a deployment (status, output, completedAt, sessionId)
 */
deploymentsRouter.patch('/:environmentId/:deploymentId', async (c) => {
  try {
    const environmentId = c.req.param('environmentId');
    const deploymentId = c.req.param('deploymentId');
    const updates = await c.req.json();

    const deployment = await storageService.getDeployment(environmentId, deploymentId);

    if (!deployment) {
      return c.json({ error: 'Deployment not found' }, 404);
    }

    // Update deployment with provided fields
    const updated: Deployment = {
      ...deployment,
      ...updates
    };

    await storageService.updateDeployment(environmentId, deploymentId, updated);
    console.log('[Deployments API] Updated deployment:', deploymentId, 'with status:', updated.status);

    return c.json({ deployment: updated });
  } catch (error) {
    console.error('[Deployments API] Failed to update deployment:', error);
    return c.json(
      {
        error: 'Failed to update deployment',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});
