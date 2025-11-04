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
import { getProductById } from "../bitdefenderSearchProducts/mockProducts";

const bitdefenderGetProductDetails: Action = {
  version: '0.0.1',
  name: "Bitdefender.getProductDetails",
  isPublished: true,
  hasAemWidget: true,
  definition: {
    title: "Get Bitdefender Product Details",
    description: "Retrieve detailed information about a specific Bitdefender security product by ID. Returns comprehensive product details including features, supported platforms, trial information, and descriptions.",
    inputSchema: {
      productId: z.string()
        .trim()
        .min(1, "Product ID is required")
        .describe("The unique identifier of the Bitdefender product (e.g., 'premium-security-individual', 'total-security-individual', 'antivirus-plus', 'antivirus-mac')"),
    },
    annotations: {
      destructiveHint: false,
      openWorldHint: false,
      readOnlyHint: true,
    },
    _meta: {
      "openai/outputTemplate": "ui://aem-widget/bitdefender-product-details-widget.html",
      "openai/toolInvocation/invoking": "Loading product details",
      "openai/toolInvocation/invoked": "Product details loaded",
      "openai/widgetAccessible": true,
      "openai/resultCanProduceWidget": true,
    },
  },
  handler: async (args: { productId: string }): Promise<ActionHandlerResult> => {
    const startTime = Date.now();
    logger.info(`MCP: action=tool_invoked;tool=bitdefenderGetProductDetails;status=starting;productId=${args.productId}`);

    try {
      logger.info('MCP: action=tool_execution;tool=bitdefenderGetProductDetails;status=fetching_product');

      const product = getProductById(args.productId);

      if (!product) {
        logger.warn(`MCP: action=tool_execution;tool=bitdefenderGetProductDetails;status=product_not_found;productId=${args.productId}`);

        return {
          content: [{
            type: "text" as const,
            text: `Product not found with ID: ${args.productId}. Available product IDs: premium-security-individual, total-security-individual, antivirus-plus, antivirus-mac`
          }],
          success: false,
          error: "Product not found",
          timestamp: Date.now()
        };
      }

      logger.info(`MCP: action=tool_execution;tool=bitdefenderGetProductDetails;status=product_found;productName=${product.name}`);

      const responseText = `Retrieved details for ${product.name}. ${product.tagline}`;

      const result = {
        content: [{
          type: "text" as const,
          text: responseText
        }],
        structuredContent: {
          product: product,
          timestamp: new Date().toISOString()
        },
        success: true,
        timestamp: Date.now()
      };

      const executionTime = Date.now() - startTime;
      logger.info(`MCP: action=tool_completed;tool=bitdefenderGetProductDetails;status=success;duration_ms=${executionTime}`);

      return result;
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      logger.error(`MCP: action=tool_completed;tool=bitdefenderGetProductDetails;status=error;duration_ms=${executionTime};error=${error.message}`);

      return {
        content: [{
          type: "text" as const,
          text: `Error retrieving product details: ${error.message}`
        }],
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }
};

export default bitdefenderGetProductDetails;
