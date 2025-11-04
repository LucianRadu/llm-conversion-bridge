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

const helloWorldEDS: Action = {
  version: '0.0.1',
  name: "helloWorldEDS",
  isPublished: false,
  hasAemWidget: true,
  definition: {
    title: "Hello World EDS",
    description: "Returns a Hello World EDS message with timestamp in a nice visual widget with rounded corners and centered styling. Displays current server time in an interactive card format.",
    inputSchema: {
      // No input parameters required for hello world widget
    },
    // To disable the approval prompt for the widget
    annotations: {
      destructiveHint: false,
      openWorldHint: false,
      readOnlyHint: true,
    },
    _meta: {
      "openai/outputTemplate": "ui://aem-widget/hello-world-eds-widget.html",
      "openai/toolInvocation/invoking": "Saying hello world from EDS",
      "openai/toolInvocation/invoked": "Said hello world from EDS",
      "openai/widgetAccessible": true,
      "openai/resultCanProduceWidget": true,
    },
  },
  handler: async (args: {}): Promise<ActionHandlerResult> => {
    const startTime = Date.now();
    logger.info('MCP: action=tool_invoked;tool=helloWorldEDS;status=starting');

    try {
      logger.info('MCP: action=tool_execution;tool=helloWorldEDS;status=generating_data');

      const now = new Date();
      const utcTimestamp = now.toISOString();
      const localTime = now.toLocaleString();
      const responseText = `Hello World EDS widget displayed with timestamp ${utcTimestamp}`;

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
};

export default helloWorldEDS;
