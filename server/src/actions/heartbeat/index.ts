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
import { z } from "zod";
import type { Action, ActionHandlerResult } from "../../types";
import { logger } from "../../utils/logger";

const heartbeat: Action = {
  version: '0.0.1',
  name: "Internal.heartbeat",
  isPublished: false,
  hasAemWidget: false,
  definition: {
    title: "System Heartbeat",
    description: "Returns a simple heartbeat text with current timestamp to verify the MCP server is responsive and functioning properly. Responds with plain text only, no widgets or complex formatting.",
    inputSchema: {
      // No input parameters required for heartbeat
    },
    // To disable the approval prompt for the tool
    annotations: {
      destructiveHint: false,
      openWorldHint: false,
      readOnlyHint: true,
    },
  },
  handler: async (args: {}): Promise<ActionHandlerResult> => {
    const startTime = Date.now();
    logger.info('MCP: action=tool_invoked;tool=heartbeat;status=starting');

    try {
      logger.info('MCP: action=tool_execution;tool=heartbeat;status=generating_data');

      const now = new Date();
      const utcTimestamp = now.toISOString();
      const heartbeatMessage = `last heartbeat at ${utcTimestamp} UTC`;

      const result = {
        content: [{
          type: "text" as const,
          text: heartbeatMessage
        }],
        _meta: {
          "lcb/version": heartbeat.version,
        },
        success: true,
        timestamp: now.getTime()
      };

      const executionTime = Date.now() - startTime;
      logger.info(`MCP: action=tool_completed;tool=heartbeat;status=success;duration_ms=${executionTime}`);

      return result;
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      logger.error(`MCP: action=tool_completed;tool=heartbeat;status=error;duration_ms=${executionTime};error=${error.message}`);

      return {
        content: [{
          type: "text" as const,
          text: `Error generating heartbeat: ${error.message}`
        }],
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }
};

export default heartbeat;

