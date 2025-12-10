/*
 * ADOBE CONFIDENTIAL
 * ___________________
 * Copyright 2025 Adobe
 * All Rights Reserved.
 * NOTICE: All information contained herein is, and remains
 * the property of Adobe and its suppliers, if any. The intellectual
 * and technical concepts contained herein are proprietary to Adobe
 * and its suppliers and are protected by all applicable intellectual
 * property laws, including trade secret and copyright laws.
 *  Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe.
 */

import { Hono } from 'hono';
import { storageService } from '../services/storage';
import { mcpClientManager } from '../services/mcpClientManager';
import { ensureManagedServers } from '../services/sourceServerInitializer';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';

const cleanupRouter = new Hono();

/**
 * POST /api/cleanup/clean-room
 * COMPLETELY DELETE db.json and reinitialize from scratch
 * This simulates a fresh start like when run.sh is executed
 */
cleanupRouter.post('/clean-room', async (c) => {
  try {
    console.log('[Cleanup] Starting clean room operation - DELETING ENTIRE DATABASE...');

    // Get all servers first to disconnect managed servers
    const allServers = await storageService.getServers();
    const managedServerIds = allServers
      .filter(s => s.serverType === 'local-managed' || s.serverType === 'remote-managed')
      .map(s => s.id);

    // Disconnect any managed servers from MCP client manager
    for (const serverId of managedServerIds) {
      if (mcpClientManager.isConnected(serverId)) {
        mcpClientManager.disconnect(serverId);
        console.log('[Cleanup] Disconnected managed server:', serverId);
      }
    }

    // DELETE THE ENTIRE db.json FILE
    const dbFilePath = join(process.cwd(), '..', 'db.json');
    if (existsSync(dbFilePath)) {
      console.log('[Cleanup] Deleting db.json file:', dbFilePath);
      unlinkSync(dbFilePath);
      console.log('[Cleanup] ✓ db.json deleted');
    }

    // Reset the storage service singleton to force reinitialization
    await storageService.resetDatabase();
    console.log('[Cleanup] ✓ Database reset and reinitialized');

    // Re-initialize managed servers (will create them fresh)
    console.log('[Cleanup] Re-initializing managed servers...');
    await ensureManagedServers();
    console.log('[Cleanup] ✓ Managed servers re-initialized');

    console.log('[Cleanup] Clean room operation completed successfully - Fresh database created');
    return c.json({
      success: true,
      message: 'Clean room completed - database deleted and reinitialized',
      managedServersRemoved: managedServerIds.length
    }, 200);
  } catch (error) {
    console.error('[Cleanup] Error during clean room operation:', error);
    return c.json(
      {
        error: 'Failed to clean room',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});

export { cleanupRouter };

