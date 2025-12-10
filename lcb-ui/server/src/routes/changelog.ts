import { Hono } from 'hono';
import { storageService, type ChangelogEntry } from '../services/storage';

const changelogRouter = new Hono();

/**
 * GET /api/changelog/:sessionId
 * Get changelog entries for a session
 */
changelogRouter.get('/:sessionId', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const changelog = await storageService.getChangelog(sessionId);
    return c.json({ changelog });
  } catch (error) {
    console.error('Error fetching changelog:', error);
    return c.json(
      { error: 'Failed to fetch changelog', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * POST /api/changelog/:sessionId
 * Add a changelog entry for a session
 */
changelogRouter.post('/:sessionId', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const entry = await c.req.json<ChangelogEntry>();

    if (!entry.id || !entry.timestamp || !entry.type) {
      return c.json({ error: 'Missing required fields: id, timestamp, type' }, 400);
    }

    await storageService.addChangelogEntry(sessionId, entry);
    const changelog = await storageService.getChangelog(sessionId);

    return c.json({ entry, changelog }, 201);
  } catch (error) {
    console.error('Error adding changelog entry:', error);
    return c.json(
      { error: 'Failed to add changelog entry', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * DELETE /api/changelog/:sessionId
 * Clear changelog for a session
 */
changelogRouter.delete('/:sessionId', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    await storageService.clearChangelog(sessionId);
    return c.json({ success: true });
  } catch (error) {
    console.error('Error clearing changelog:', error);
    return c.json(
      { error: 'Failed to clear changelog', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * DELETE /api/changelog
 * Clear all old changelogs (cleanup utility)
 */
changelogRouter.delete('/', async (c) => {
  try {
    await storageService.clearOldChangelogs();
    return c.json({ success: true });
  } catch (error) {
    console.error('Error clearing all changelogs:', error);
    return c.json(
      { error: 'Failed to clear all changelogs', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

export { changelogRouter };
