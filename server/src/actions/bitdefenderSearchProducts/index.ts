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
import { MOCK_PRODUCTS } from "./mockProducts";

const bitdefenderSearchProducts: Action = {
  version: '0.0.1',
  name: "Bitdefender.searchProducts",
  isPublished: true,
  hasAemWidget: false,
  definition: {
    title: "Search Bitdefender Products",
    description: "Browse and search through available Bitdefender security products including Premium Security, Total Security, Antivirus Plus, and Mac protection. Returns product details with features, platforms, and trial information. After calling this tool, call the renderProducts tool to render the products in a widget.",
    inputSchema: {
      category: z.enum(['individual', 'business', 'enterprise', 'all'])
        .default('all')
        .describe("Filter products by category: 'individual', 'business', 'enterprise', or 'all' for no filter"),
      platform: z.string()
        .trim()
        .optional()
        .describe("Filter products by platform (e.g., 'Windows', 'Mac', 'Android', 'iOS')"),
    },
    annotations: {
      destructiveHint: false,
      openWorldHint: false,
      readOnlyHint: true,
    }
  },
  handler: async (args: { category?: string; platform?: string }): Promise<ActionHandlerResult> => {
    const startTime = Date.now();
    logger.info(`MCP: action=tool_invoked;tool=bitdefenderSearchProducts;status=starting;category=${args.category || 'all'};platform=${args.platform || 'none'}`);

    try {
      logger.info('MCP: action=tool_execution;tool=bitdefenderSearchProducts;status=filtering_products');

      let filteredProducts = MOCK_PRODUCTS;

      // Filter by category
      if (args.category && args.category !== 'all') {
        filteredProducts = filteredProducts.filter(p => p.category === args.category);
      }

      // Filter by platform
      if (args.platform) {
        filteredProducts = filteredProducts.filter(p =>
          p.platforms.some(platform =>
            platform.toLowerCase() === args.platform!.toLowerCase()
          )
        );
      }

      logger.info(`MCP: action=tool_execution;tool=bitdefenderSearchProducts;status=found_products;count=${filteredProducts.length}`);

      const responseText = `Found ${filteredProducts.length} Bitdefender product(s)${args.category && args.category !== 'all' ? ` in category '${args.category}'` : ''}${args.platform ? ` for platform '${args.platform}'` : ''}`;

      const result = {
        content: [{
          type: "text" as const,
          text: responseText
        }],
        structuredContent: {
          products: filteredProducts,
          totalCount: filteredProducts.length,
          filters: {
            category: args.category || 'all',
            platform: args.platform || null
          },
          followUpInstruction: "Please render the products in a widget"
        },
        success: true,
        timestamp: Date.now()
      };

      const executionTime = Date.now() - startTime;
      logger.info(`MCP: action=tool_completed;tool=bitdefenderSearchProducts;status=success;duration_ms=${executionTime}`);

      return result;
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      logger.error(`MCP: action=tool_completed;tool=bitdefenderSearchProducts;status=error;duration_ms=${executionTime};error=${error.message}`);

      return {
        content: [{
          type: "text" as const,
          text: `Error searching Bitdefender products: ${error.message}`
        }],
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }
};

export default bitdefenderSearchProducts;
