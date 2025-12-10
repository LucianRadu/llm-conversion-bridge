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
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe.
 */

import { Hono } from 'hono';

export const healthRouter = new Hono();

/**
 * GET /api/health/check?url=http://127.0.0.1:7676/${AEM_COMPUTE_SERVICE}
 * Check if a server is responding (bypasses CORS)
 * Note: Path is dynamically extracted from AEM_COMPUTE_SERVICE env var
 */
healthRouter.get('/check', async (c) => {
  try {
    const url = c.req.query('url');
    
    if (!url) {
      return c.json({ error: 'URL parameter is required' }, 400);
    }

    console.log(`[Health Check] Checking server at: ${url}`);

    // Try to connect to the server
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'lcb-ui-health-check', version: '1.0.0' }
        }
      })
    });

    const isHealthy = response.status >= 200 && response.status < 500;
    
    console.log(`[Health Check] Server status: ${response.status}, healthy: ${isHealthy}`);

    return c.json({
      healthy: isHealthy,
      status: response.status,
      url
    });
  } catch (error: any) {
    console.error('[Health Check] Error:', error.message);
    return c.json({
      healthy: false,
      error: error.message
    });
  }
});

