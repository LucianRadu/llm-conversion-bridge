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

/**
 * Azure AI Gateway response structure (success case)
 */
interface AzureAIResponse {
  status?: string;
  user_id?: string;
  output_text?: string;
  error?: string;
  message?: string;
}

const toolPlannerRouter = new Hono();

/**
 * POST /
 * Proxy request to external Tool Planner API endpoint (Azure AI Gateway)
 *
 * Request body: { "prompt": string, "imsToken": string }
 * Response: Detailed request/response information
 */
toolPlannerRouter.post('/', async (c) => {
  try {
    const endpoint = process.env.TOOL_PLANNER_ENDPOINT;

    if (!endpoint) {
      console.error('[Tool Planner] TOOL_PLANNER_ENDPOINT not configured');
      return c.json(
        { error: 'Tool Planner endpoint not configured' },
        500
      );
    }

    // Get prompt and IMS token from request body
    const body = await c.req.json();
    const { prompt, imsToken } = body;

    if (!prompt || typeof prompt !== 'string') {
      return c.json(
        { error: 'Missing or invalid "prompt" parameter' },
        400
      );
    }

    if (!imsToken || typeof imsToken !== 'string') {
      return c.json(
        { error: 'Missing or invalid "imsToken" parameter. User must be authenticated.' },
        401
      );
    }

    console.log('[Tool Planner] Calling external endpoint:', endpoint);
    console.log('[Tool Planner] Prompt length:', prompt.length);
    console.log('[Tool Planner] IMS token present:', !!imsToken);

    // Prepare request details with Authorization header
    const requestHeaders = {
      'Authorization': `Bearer ${imsToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Build request payload in Azure AI Gateway format
    const requestPayload = {
      input: [
        {
          role: 'user',
          content: prompt
        }
      ]
    };

    // Make POST request to external endpoint
    const startTime = Date.now();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestPayload),
    });
    const duration = Date.now() - startTime;

    // Capture response headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // Parse response body
    // Use unknown for type safety at JSON.parse, then assign to union type
    let responseData: AzureAIResponse | string;
    const responseText = await response.text();
    try {
      const parsed: unknown = JSON.parse(responseText);
      // TypeScript now knows this could be anything from JSON.parse
      responseData = parsed as AzureAIResponse;
    } catch {
      // Fallback to plain text if JSON parsing fails
      responseData = responseText;
    }

    console.log('[Tool Planner] Response received:', response.status, response.statusText);

    // Truncate Authorization token for security in returned data
    // Only show first 4 characters to confirm token exists without exposing JWT structure
    const sanitizedHeaders = { ...requestHeaders };
    if (sanitizedHeaders.Authorization) {
      const token = sanitizedHeaders.Authorization.replace('Bearer ', '');
      sanitizedHeaders.Authorization = `Bearer ${token.substring(0, 4)}...`;
    }

    // Return detailed request/response information
    return c.json({
      success: response.ok,
      request: {
        method: 'POST',
        url: endpoint,
        headers: sanitizedHeaders,
        payload: requestPayload
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        payload: responseData,
        duration: `${duration}ms`
      }
    });
  } catch (error) {
    console.error('[Tool Planner] Error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        request: {
          method: 'POST',
          url: process.env.TOOL_PLANNER_ENDPOINT || 'NOT_CONFIGURED',
          error: 'Request failed before completion'
        }
      },
      500
    );
  }
});

export { toolPlannerRouter };
