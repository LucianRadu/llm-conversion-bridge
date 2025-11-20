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
import { widgetResourcesByUri } from "../widget-resources";

const systemStatusWidget: Action = {
  version: '0.0.1',
  name: "Internal.systemStatusWidget",
  isPublished: true,
  hasAemWidget: true,
  definition: {
    title: "System Status Widget",
    description: "Displays system status dashboard with CPU, memory, uptime, and active sessions metrics in a visual widget.",
    inputSchema: {
      // No input parameters required for system status widget
    },
    // To disable the approval prompt for the widget
    annotations: {
      destructiveHint: false,
      openWorldHint: false,
      readOnlyHint: true,
    },
    _meta: {
      "openai/outputTemplate": "ui://aem-widget/system-status-widget.html",
      "openai/toolInvocation/invoking": "Generating system status widget",
      "openai/toolInvocation/invoked": "System status widget ready",
      "openai/widgetAccessible": true,
      "openai/resultCanProduceWidget": true,
    },
  },
  handler: async (args: {}): Promise<ActionHandlerResult> => {
    const startTime = Date.now();
    logger.info('MCP: action=tool_invoked;tool=systemStatusWidget;status=starting');

    try {
      logger.info('MCP: action=tool_execution;tool=systemStatusWidget;status=generating_data');

      const now = new Date();
      const utcTimestamp = now.toISOString();

      // Mock system metrics
      const cpuUsage = Math.floor(Math.random() * 40 + 30); // 30-70%
      const memoryUsage = Math.floor(Math.random() * 30 + 50); // 50-80%
      const uptime = '3d 14h 25m';
      const sessions = Math.floor(Math.random() * 5 + 2); // 2-7 sessions

      const responseText = `System Status: CPU ${cpuUsage}%, Memory ${memoryUsage}%, Uptime ${uptime}, ${sessions} active sessions`;

      logger.info('MCP: action=tool_execution;tool=systemStatusWidget;status=preparing_widget');

      // Get the widget HTML resource
      const widgetResource = widgetResourcesByUri.get("ui://aem-widget/system-status-widget.html");

      const result = {
        content: [
          {
            type: "text" as const,
            text: responseText
          },
          ...(widgetResource ? [{
            type: "resource" as const,
            resource: {
              uri: widgetResource.uri,
              mimeType: widgetResource.mimeType,
              text: widgetResource.content
            }
          }] : [])
        ],
        structuredContent: {
          timestamp: utcTimestamp,
          cpuUsage,
          memoryUsage,
          uptime,
          sessions,
          status: "operational"
        },
        success: true,
        timestamp: now.getTime()
      };

      const executionTime = Date.now() - startTime;
      logger.info(`MCP: action=tool_completed;tool=systemStatusWidget;status=success;duration_ms=${executionTime}`);

      return result;
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      logger.error(`MCP: action=tool_completed;tool=systemStatusWidget;status=error;duration_ms=${executionTime};error=${error.message}`);

      return {
        content: [{
          type: "text" as const,
          text: `Error generating system status widget: ${error.message}`
        }],
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }
};

export default systemStatusWidget;


