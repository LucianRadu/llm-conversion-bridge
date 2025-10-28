/*
 * ADOBE CONFIDENTIAL
 * ___________________
 * Copyright 2025 Adobe
 * All Rights Reserved.
 * NOTICE: All information contained herein is, and remains
 * the property of Adobe and its suppliers, if any. The intellectual
 * and technical concepts contained herein are proprietary to Adobe and its suppliers and are protected by all applicable intellectual property laws, including trade secret and copyright laws.
 *  Dissemination of this information or reproduction of this material is strictly forbidden unless prior written permission is obtained from Adobe.
 */

/// <reference types="@fastly/js-compute" />

// Polyfill AbortController for Fastly Compute runtime
if (typeof globalThis.AbortController === 'undefined') {
  class AbortController {
    signal: AbortSignal;
    constructor() {
      this.signal = new AbortSignal();
    }
    abort(reason?: any) {
      this.signal._abort(reason);
    }
  }
  class AbortSignal extends EventTarget {
    aborted: boolean;
    reason: any;
    constructor() {
      super();
      this.aborted = false;
      this.reason = undefined;
    }
    _abort(reason?: any) {
      if (this.aborted) return;
      this.aborted = true;
      this.reason = reason || new Error('AbortError');
      this.dispatchEvent(new Event('abort'));
    }
    throwIfAborted() {
      if (this.aborted) {
        throw this.reason;
      }
    }
  }
  (globalThis as any).AbortController = AbortController;
  (globalThis as any).AbortSignal = AbortSignal;
}

// Import uuid first to use in crypto polyfill
import { v4 as uuidv4 } from "uuid";

// Polyfill crypto.randomUUID for Fastly Compute runtime (required by MCP SDK)
if (typeof globalThis.crypto?.randomUUID !== 'function') {
  if (!globalThis.crypto) {
    (globalThis as any).crypto = {};
  }
  globalThis.crypto.randomUUID = () => uuidv4() as `${string}-${string}-${string}-${string}-${string}`;
}

import { env } from "fastly:env";
import { createMCPServer } from "./mcp-server";
import { SessionManager } from "./session-manager";
import { ErrorCode, JSON_RPC_VERSION, MCP_REQUEST_TIMEOUT, MCP_TRANSPORT_PATH } from "./constants/mcp";
import { logger } from "./utils/logger";

// Create MCP server using our centralized server creation function
const server = createMCPServer();

// Create singleton SessionManager instance with default 15-minute TTL
const sessionManager = new SessionManager();

// Global variable to track current session ID for logging
let currentSessionId: string | null = null;

/**
 * MCP-compliant StreamableHTTP Transport for Fastly Compute@Edge
 * Follows official MCP StreamableHTTP specification with JSON response mode
 */
class FastlyStreamableHTTPTransport {
  public readonly sessionId: string;
  public onmessage: ((message: any) => void) | null = null;
  public onclose: (() => void) | null = null;
  public onerror: ((error: Error) => void) | null = null;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  async start() {
    // No-op for Fastly
  }

  async close() {
    if (this.onclose) {
      this.onclose();
    }
  }

  async send(message: any): Promise<void> {
    // Store the response - will be returned by processRequest
    this.pendingResponse = message;
  }

  private pendingResponse: any = null;

  async processRequest(jsonRpcMessage: any): Promise<any> {
    // Set current session ID for tool logging
    currentSessionId = this.sessionId;

    // Handle notifications (no response expected)
    if (jsonRpcMessage?.method?.startsWith('notifications/')) {
      logger.info('StreamableHTTP: Processing notification');
      if (this.onmessage) {
        this.onmessage(jsonRpcMessage);
      }
      return null; // Notifications return null
    }

    // Handle regular requests
    logger.info(`StreamableHTTP: action=processing;request=${jsonRpcMessage?.method};session=${this.sessionId}`);

    // Reset pending response
    this.pendingResponse = null;

    // Call onmessage to trigger MCP server processing
    if (this.onmessage) {
      this.onmessage(jsonRpcMessage);
    }

    // Wait a bit for the response to be set by send()
    await new Promise(resolve => setTimeout(resolve, 10));

    // Return the response that was set by send()
    const response = this.pendingResponse;
    logger.info(`StreamableHTTP: action=returning;status=${response ? 'success' : 'null'};session=${this.sessionId}`);

    // Clear session ID after processing
    currentSessionId = null;

    return response;
  }
}

// Store transport instances by session ID
const transports = new Map<string, FastlyStreamableHTTPTransport>();

/**
 * Creates a standardized error response for Fastly
 */
function createErrorResponse(code: ErrorCode, message: string, id: any = null, status: number = 400): Response {
  const timestamp = new Date().toISOString();
  return new Response(JSON.stringify({
    jsonrpc: JSON_RPC_VERSION,
    error: {
      code,
      message: `${message} (ts-server ${timestamp})`
    },
    id
  }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Creates a JSON response following StreamableHTTP spec
 */
function createStreamableResponse(data: any, sessionId: string): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Include session ID in response headers (StreamableHTTP spec)
  if (sessionId) {
    headers['mcp-session-id'] = sessionId;
  }

  // Handle null responses (notifications)
  if (data === null) {
    return new Response('', {
      status: 202, // Accepted
      headers
    });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers
  });
}



async function handleMCPRequest(req: Request): Promise<Response> {
  try {
    const sessionId = req.headers.get('mcp-session-id');
    const sessionLog = sessionId ? `;session=${sessionId}` : '';
    logger.info(`StreamableHTTP: action=received;method=${req.method}${sessionLog}`);

    // Handle GET requests (for SSE streaming - return simple response)
    if (req.method === 'GET') {
      if (!sessionId) {
        return createErrorResponse(
          ErrorCode.InvalidRequest,
          "GET requests require mcp-session-id header"
        );
      }

      const sessionExists = await sessionManager.getSession(sessionId);
      if (!sessionExists) {
        return createErrorResponse(
          ErrorCode.InvalidRequest,
          "Session not found or expired"
        );
      }

      // For StreamableHTTP GET requests, return simple acknowledgment
      // (Full SSE streaming could be implemented later if needed)
      return new Response("SSE endpoint ready", {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
          'mcp-session-id': sessionId
        }
      });
    }

    // Handle POST requests (JSON-RPC messages)
    let parsedBody;
    try {
      parsedBody = await req.json();
    } catch (error) {
      logger.error('StreamableHTTP: Failed to parse JSON body:', error);
      return createErrorResponse(
        ErrorCode.ParseError,
        "Invalid JSON in request body"
      );
    }

    logger.info(`StreamableHTTP: action=processing;method=${parsedBody?.method || 'unknown'}${sessionLog}`);

    // Handle initialize request
    if (parsedBody?.method === 'initialize') {
      const newSessionId = uuidv4();
      logger.info(`StreamableHTTP: action=initializing;session=${newSessionId}`);

      // Create new transport
      const transport = new FastlyStreamableHTTPTransport(newSessionId);
      await server.connect(transport);

      // Store transport and session
      transports.set(newSessionId, transport);
      await sessionManager.setSession(newSessionId);

      // Process the initialize request
      const response = await transport.processRequest(parsedBody);
      logger.info(`StreamableHTTP: Session ${newSessionId} initialized`);
      await sessionManager.logSessionStats();

      return createStreamableResponse(response, newSessionId);
    }

    // Handle requests with existing session ID
    if (sessionId) {
      let transport = transports.get(sessionId);

      if (!transport) {
        // Check if session exists in manager
        const sessionExists = await sessionManager.getSession(sessionId);
        if (sessionExists) {
          // Recreate transport for existing session
          logger.info(`StreamableHTTP: action=recreating;transport=session;session=${sessionId}`);
          transport = new FastlyStreamableHTTPTransport(sessionId);
          await server.connect(transport);
          transports.set(sessionId, transport);
        } else {
          return createErrorResponse(
            ErrorCode.InvalidRequest,
            "Session not found or expired"
          );
        }
      } else {
        logger.info(`StreamableHTTP: Using existing transport for session: ${sessionId}`);
      }

      // Process the request
      const response = await transport.processRequest(parsedBody);
      return createStreamableResponse(response, sessionId);
    }

    // No session ID and not initialization
    return createErrorResponse(
      ErrorCode.InvalidRequest,
      "Session required - send initialize first or include mcp-session-id header"
    );

  } catch (error) {
    logger.error('StreamableHTTP: Error in request handling:', error);
    return createErrorResponse(
      ErrorCode.InternalError,
      "Internal server error",
      null,
      500
    );
  }
}

async function handleDeleteMCP(req: Request): Promise<Response> {
  try {
    logger.info('StreamableHTTP: DELETE request received');
    const sessionId = req.headers.get('mcp-session-id');

    if (sessionId) {
      // Close and remove transport
      if (transports.has(sessionId)) {
        const transport = transports.get(sessionId)!;
        await transport.close();
        transports.delete(sessionId);
        logger.info(`StreamableHTTP: Transport for session ${sessionId} closed and removed`);
      }

      // Remove session from manager
      const sessionExists = await sessionManager.getSession(sessionId);
      if (sessionExists) {
        await sessionManager.deleteSession(sessionId);
        logger.info(`StreamableHTTP: Session ${sessionId} deleted successfully`);
      } else {
        logger.info(`StreamableHTTP: Session ${sessionId} not found - already deleted or expired`);
      }
    }

    const timestamp = new Date().toISOString();
    return new Response(`Session terminated (ts-server ${timestamp})`, { status: 200 });

  } catch (error) {
    logger.error('StreamableHTTP: Error terminating session:', error);
    const errorTimestamp = new Date().toISOString();
    return new Response(`Error terminating session (ts-server ${errorTimestamp})`, { status: 500 });
  }
}

async function handleRequest(event: FetchEvent) {
  const req = event.request;
  const url = new URL(req.url);
  logger.info(`${req.method} ${url.pathname}`);
  
  try {
    // Only handle MCP transport endpoint
    if (url.pathname === MCP_TRANSPORT_PATH) {
      if (req.method === 'POST' || req.method === 'GET') {
        return await handleMCPRequest(req);
      } else if (req.method === 'DELETE') {
        return await handleDeleteMCP(req);
      }
    }
    
    // All other paths return 404
    const timestamp = new Date().toISOString();
    return new Response(`Not Found (ts-server ${timestamp})`, { status: 404 });
    
  } catch (error) {
    logger.error('Request handling error:', error);
    const errorTimestamp = new Date().toISOString();
    return new Response(`Internal Server Error (ts-server ${errorTimestamp})`, { status: 500 });
  }
}

addEventListener("fetch", (event: FetchEvent) => {
  event.respondWith(handleRequest(event));
}); 