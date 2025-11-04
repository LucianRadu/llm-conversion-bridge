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

const heartbeatWidget: Action = {
  version: '0.0.1',
  name: "Internal.heartbeatWidget",
  isPublished: false,
  hasAemWidget: true,
  definition: {
    title: "Heartbeat Widget",
    description: "Returns a heartbeat timestamp in a nice visual widget with rounded corners and centered styling. Displays current server time in an interactive card format.",
    inputSchema: {
      // No input parameters required for heartbeat widget
    },
    // To disable the approval prompt for the widget
    annotations: {
      destructiveHint: false,
      openWorldHint: false,
      readOnlyHint: true,
    },
    _meta: {
      "openai/outputTemplate": "ui://aem-widget/heartbeat-widget.html",
      "openai/toolInvocation/invoking": "Generating heartbeat widget",
      "openai/toolInvocation/invoked": "Heartbeat widget ready",
      "openai/widgetAccessible": true,
      "openai/resultCanProduceWidget": true,
    },
  },
  handler: async (args: {}): Promise<ActionHandlerResult> => {
    const startTime = Date.now();
    logger.info('MCP: action=tool_invoked;tool=heartbeatWidget;status=starting');

    try {
      logger.info('MCP: action=tool_execution;tool=heartbeatWidget;status=generating_data');

      const now = new Date();
      const utcTimestamp = now.toISOString();
      const localTime = now.toLocaleString();
      const responseText = `Heartbeat widget displayed with timestamp ${utcTimestamp}`;

      logger.info('MCP: action=tool_execution;tool=heartbeatWidget;status=preparing_widget');

      const result = {
        content: [{
          type: "text" as const,
          text: responseText
        }],
        structuredContent: {
          timestamp: utcTimestamp,
          localTime: localTime,
          serverTime: now.getTime(),
          message: "Server is alive and responding"
        },
        success: true,
        timestamp: now.getTime()
      };

      const executionTime = Date.now() - startTime;
      logger.info(`MCP: action=tool_completed;tool=heartbeatWidget;status=success;duration_ms=${executionTime}`);

      return result;
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      logger.error(`MCP: action=tool_completed;tool=heartbeatWidget;status=error;duration_ms=${executionTime};error=${error.message}`);

      return {
        content: [{
          type: "text" as const,
          text: `Error generating heartbeat widget: ${error.message}`
        }],
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }
};

export default heartbeatWidget;

