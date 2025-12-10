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
import type { ActionHandlerResult } from "../../types";
import { logger } from "../../utils/logger";

// Handler function - schema is defined in schema.json and compiled by codegen
async function handler(args: {}): Promise<ActionHandlerResult> {
  const startTime = Date.now();
  logger.info('MCP: action=tool_invoked;tool=helloWorldEDS;status=starting');

  try {
    logger.info('MCP: action=tool_execution;tool=helloWorldEDS;status=generating_data');

    const now = new Date();
    const utcTimestamp = now.toISOString();
    const localTime = now.toLocaleString();
    const responseText = `Hello World from EDS at ${utcTimestamp}`;

    logger.info('MCP: action=tool_execution;tool=helloWorldEDS;status=preparing_widget');

    const result = {
      content: [{
        type: "text" as const,
        text: responseText
      }],
      structuredContent: {
        key1: "some value",
        key2: "some other value"
      },
      success: true,
      timestamp: now.getTime()
    };

    const executionTime = Date.now() - startTime;
    logger.info(`MCP: action=tool_completed;tool=helloWorldEDS;status=success;duration_ms=${executionTime}`);

    return result;
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    logger.error(`MCP: action=tool_completed;tool=helloWorldEDS;status=error;duration_ms=${executionTime};error=${error.message}`);

    return {
      content: [{
        type: "text" as const,
        text: `Error generating Hello World EDS widget: ${error.message}`
      }],
      success: false,
      error: error.message,
      timestamp: Date.now()
    };
  }
}

export { handler };
