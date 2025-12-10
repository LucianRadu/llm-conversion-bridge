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

/// <reference types="@fastly/js-compute" />

import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { SessionManager } from './session-manager';
import { ErrorCode, getMCP_TRANSPORT_PATH, JSON_RPC_VERSION, MCP_REQUEST_TIMEOUT } from './constants/mcp';
import { HEADER_CONTENT_TYPE, HEADER_MCP_SESSION_ID, CONTENT_TYPE_JSON } from './constants';
import { createMCPServer } from './mcp-server';

declare var process: any;

class FastlyComputeTransport {
  sessionId: string;
  onmessage: ((msg: any) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  pendingResponse: any;
  responseResolver: ((msg: any) => void) | null;
  
  constructor() {
    this.sessionId = uuidv4();
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
    this.pendingResponse = null;
    this.responseResolver = null;
  }

  async start() {}

  async close() {
    if (this.onclose) {
      this.onclose();
    }
  }

  async send(message: any) {
    this.pendingResponse = message;
    if (this.responseResolver) {
      this.responseResolver(message);
      this.responseResolver = null;
    }
  }

  async processRequest(jsonrpcMessage: any): Promise<any> {
    // Check if this is a notification
    const isNotification = jsonrpcMessage?.method?.startsWith('notifications/');
    
    if (isNotification) {
      if (this.onmessage) {
        this.onmessage(jsonrpcMessage);
      }
      return null;
    }
    
    // For regular requests, use the timeout pattern
    const processPromise = new Promise((resolve) => {
      this.responseResolver = resolve;
      if (this.onmessage) {
        this.onmessage(jsonrpcMessage);
      }
    });
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Request timeout'));
      }, MCP_REQUEST_TIMEOUT);
    });

    return Promise.race([processPromise, timeoutPromise]).catch((error) => {
      this.responseResolver = null;
      return {
        jsonrpc: JSON_RPC_VERSION,
        id: jsonrpcMessage?.id || null,
        error: {
          code: ErrorCode.InternalError,
          message: 'Request timeout'
        }
      };
    });
  }
}

// Create MCP server instance
const mcpServer = createMCPServer();

// Create SessionManager instance with 3-minute TTL to match original behavior
const sessionManager = new SessionManager(180); // 3 minutes in seconds

/**
 * Creates and connects a new transport instance
 */
async function createAndConnectTransport(): Promise<FastlyComputeTransport> {
  const transport = new FastlyComputeTransport();
  await mcpServer.connect(transport);
  return transport;
}

async function handleMCPRequest(req: Request, res: Response): Promise<void> {
  try {
    const sessionId = req.headers[HEADER_MCP_SESSION_ID] as string;
    
    // Handle initialize request - creates new session
    if (req.body?.method === 'initialize') {
      const newSessionId = uuidv4();
      const transport = await createAndConnectTransport();
      await sessionManager.setSession(newSessionId);
      
      const response = await transport.processRequest(req.body);
      
      res.setHeader(HEADER_MCP_SESSION_ID, newSessionId);
      res.setHeader(HEADER_CONTENT_TYPE, CONTENT_TYPE_JSON);
      res.status(200).json(response);
      return;
    }
    
    // Handle requests with existing session ID
    if (sessionId) {
      const sessionExists = await sessionManager.getSession(sessionId);
      let transport: FastlyComputeTransport;
      
      if (sessionExists) {
        // Create a new transport for this request
        transport = await createAndConnectTransport();
      } else {
        // Session doesn't exist, create new one
        transport = await createAndConnectTransport();
        await sessionManager.setSession(sessionId);
      }
      
      const response = await transport.processRequest(req.body);
      
      res.setHeader(HEADER_CONTENT_TYPE, CONTENT_TYPE_JSON);
      res.status(200).json(response);
      return;
    }
    
    // No session ID provided - return error
    res.status(400).json({
      jsonrpc: '2.0',
      id: req.body?.id || null,
      error: {
        code: ErrorCode.InvalidRequest,
        message: 'Session required - send initialize first'
      }
    });
    
  } catch (error: any) {
    console.error('Error in MCP request:', error);
    res.status(500).json({ 
      jsonrpc: '2.0',
      id: req.body?.id || null,
      error: { 
        code: ErrorCode.InternalError, 
        message: error.message || 'Internal server error' 
      } 
    });
  }
}

function main(): void {
  // Log service version
  console.log('FASTLY_SERVICE_VERSION:', process.env.FASTLY_SERVICE_VERSION || 'development');

  const app = express();
  app.use(express.json());

  // Modern Streamable HTTP endpoint (2025-03-26 spec compliant)
  const mcpPath = getMCP_TRANSPORT_PATH();
  app.post(mcpPath, handleMCPRequest);

  app.delete(mcpPath, async (req: Request, res: Response) => {
    try {
      const sessionId = req.headers[HEADER_MCP_SESSION_ID] as string;
      
      if (!sessionId) {
        res.status(400).send('Bad request');
        return;
      }
      
      // Use SessionManager to delete the session
      await sessionManager.deleteSession(sessionId);
      
      res.status(200).send('OK');
      
    } catch (error) {
      console.error(`Error in DELETE ${mcpPath}:`, error);
      res.status(500).send('Internal server error');
    }
  });

  app.all(mcpPath, async (req: Request, res: Response) => {
    res.status(200).send('sorry - not supported request atm');
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`MCP Server listening on port ${port}`);
    console.log(`Modern endpoint: http://localhost:${port}${mcpPath}`);
  });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});

main(); 