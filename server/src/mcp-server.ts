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

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ZodType } from 'zod';
import actions from './actions/index';
import { logger } from './utils/logger';
import { resources as widgetResources } from './actions/index-widgets';

// App name for logging (matches package.json)
const APP_NAME = 'llm-conversion-bridge';

interface ToolModule {
  name: string;
  isPublished: boolean;
  hasAemWidget: boolean;
  version: string;
  definition: {
    title: string;
    description: string;
    inputSchema: ZodType<any, any, any>;
    annotations?: {
      destructiveHint?: boolean;
      openWorldHint?: boolean;
      readOnlyHint?: boolean;
      idempotentHint?: boolean;
    };
    _meta?: Record<string, any>;
  };
  handler: (args: any) => Promise<any>;
}

export function createMCPServer(): McpServer {
  const server = new McpServer(
    {
      name: 'llm-conversion-bridge',
      version: '0.0.1'
    },
    {
      capabilities: {
        tools: {},
        resources: {}
      }
    }
  );

  const actionModules = actions as ToolModule[];
  const publishedActions = actionModules.filter(action => action.isPublished);
  const widgetActions = publishedActions.filter(action => action.hasAemWidget);

  // Log action registration with nice formatting
  console.log(`\n[${APP_NAME}] Successfully loaded server/src/actions/index.ts with ${publishedActions.length} MCP actions:`);
  publishedActions.forEach(action => {
    const widgetIndicator = action.hasAemWidget ? ' (aem-widget)' : '';
    const fileName = (action as any).fileName || `${action.name}.ts`;
    console.log(`- ${fileName} -> ${action.name} (version: ${action.version})${widgetIndicator}`);
  });

  if (widgetActions.length > 0) {
    console.log(`\n[${APP_NAME}] Widget-enabled MCP actions:`);
    widgetActions.forEach(action => {
      console.log(`- ${action.name}`);
    });
  }

  // Register widget resources using server.registerResource()
  // Following the pattern from: https://developers.openai.com/apps-sdk/build/mcp-server
  widgetResources.forEach(widgetResource => {
    logger.info(`Registering resource: ${widgetResource.uri}`);
    
    server.registerResource(
      widgetResource.name,
      widgetResource.uri,
      {},
      async () => ({
        contents: [
          {
            uri: widgetResource.uri,
            mimeType: widgetResource.mimeType,
            text: widgetResource.content,
            _meta: widgetResource._meta || {}
          }
        ]
      })
    );
  });

  // Register tools using server.registerTool()
  // Following the pattern from: https://developers.openai.com/apps-sdk/build/mcp-server
  publishedActions.forEach(action => {
    logger.info(`Registering tool: ${action.name}`);

    // Use _meta from action definition directly (if provided)
    const meta = action.definition._meta ? { ...action.definition._meta } : undefined;

    server.registerTool(
      action.name,
      {
        title: action.definition.title,
        description: action.definition.description,
        // Note: inputSchema expects ZodRawShape, but our actions use ZodObject
        // The SDK will handle validation through the underlying Server
        annotations: action.definition.annotations,
        _meta: meta && Object.keys(meta).length > 0 ? meta : undefined
      },
      async (args, extra) => {
        // Log action invocation at MCP level
        console.log(`[${APP_NAME}] action ${action.name} was invoked`);

        try {
          // Validate args using the action's inputSchema
          const validatedArgs = action.definition.inputSchema.parse(args || {});
          const result = await action.handler(validatedArgs);
          return result;
        } catch (error) {
          console.error(`Error executing action ${action.name}:`, error);
          throw error;
        }
      }
    );
  });

  return server;
} 