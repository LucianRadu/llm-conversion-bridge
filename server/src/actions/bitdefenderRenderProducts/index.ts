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

const bitdefenderRenderProducts: Action = {
  version: '0.0.1',
  name: "Bitdefender.renderProducts",
  isPublished: true,
  hasAemWidget: true,
  definition: {
    title: "Render Bitdefender Products",
    description: "Render multiple Bitdefender security products with a highlighted recommendation. Returns product details for all specified products with the recommended product marked for emphasis. After calling this tool, present a summary only of the recommended product and why it was choosed.",
    inputSchema: {
      productIds: z.array(z.string().trim().min(1))
        .min(1, "At least one product ID is required")
        .describe("Array of Bitdefender product IDs to render (e.g., ['premium-security-individual', 'total-security-individual', 'antivirus-plus'])"),
      recommendedProductId: z.string()
        .trim()
        .min(1, "Recommended product ID is required")
        .describe("The product ID that should be highlighted as the recommendation (must be one of the product IDs in the productIds array)"),
    },
    annotations: {
      destructiveHint: false,
      openWorldHint: false,
      readOnlyHint: true,
    },
    _meta: {
      "openai/outputTemplate": "ui://aem-widget/bitdefender-render-products-widget.html",
      "openai/toolInvocation/invoking": "Loading product recommendations",
      "openai/toolInvocation/invoked": "Product recommendations loaded",
      "openai/widgetAccessible": true,
      "openai/resultCanProduceWidget": true,
    },
  },
  handler: async (args: { productIds: string[], recommendedProductId: string }): Promise<ActionHandlerResult> => {
    const startTime = Date.now();
    logger.info(`MCP: action=tool_invoked;tool=bitdefenderRenderProducts;status=starting;productCount=${args.productIds.length};recommendedProductId=${args.recommendedProductId}`);

    try {
      const responseText = `Rendering ${args.productIds.length} Bitdefender product(s) with ${args.recommendedProductId} as the recommended option.`;

      const result = {
        content: [{
          type: "text" as const,
          text: responseText
        }],
        structuredContent: {
          productIds: args.productIds,
          recommendedProductId: args.recommendedProductId
        },
        success: true,
        timestamp: Date.now()
      };

      const executionTime = Date.now() - startTime;
      logger.info(`MCP: action=tool_completed;tool=bitdefenderRenderProducts;status=success;duration_ms=${executionTime}`);

      return result;
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      logger.error(`MCP: action=tool_completed;tool=bitdefenderRenderProducts;status=error;duration_ms=${executionTime};error=${error.message}`);

      return {
        content: [{
          type: "text" as const,
          text: `Error rendering products: ${error.message}`
        }],
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }
};

export default bitdefenderRenderProducts;
