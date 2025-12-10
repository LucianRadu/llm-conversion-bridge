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



/* 
 * ----------------------------------------------------------------------------
 * Customer's Code below this line built over the template.
 * ----------------------------------------------------------------------------
 */ 

import type { ActionHandlerResult } from '../../types';
import { logger } from '../../utils/logger';

// Mock Adobe shirts data (embedded for Fastly Compute@Edge compatibility)
const MOCK_SHIRTS = [
  {
    id: "button-up-carly-berry",
    name: "Button-up Shirt – Art by Carly Berry",
    price: "$60.00",
    imageUrl: "https://na1-static.api.commerce.adobe.com/VyumfC53bDYkVB6b8MXsJh/media/catalog/product/a/d/adb454_1.jpg",
    description: "Limited edition artist collaboration with Carly Berry. Lightweight cotton button-up features artwork by Carly Berry",
    color: "Black",
    sizes: ["S", "M", "L", "XL", "XXL", "3XL"]
  },
  {
    id: "bezier-tee-black",
    name: "Bezier Tee - Black",
    price: "$23.00",
    imageUrl: "https://na1-static.api.commerce.adobe.com/VyumfC53bDYkVB6b8MXsJh/media/catalog/product/a/d/adb177_zfiimwyqm69pwqrd.jpg",
    description: "Your look is always on point with this Bezier Adobe wordmark design. Black tee with gradient Bezier Adobe wordmark",
    color: "Black",
    sizes: ["XS", "S", "M", "L", "XL"]
  },
  {
    id: "bezier-tee-vintage-red",
    name: "Bezier Tee - Vintage Red",
    price: "$24.00",
    imageUrl: "https://na1-static.api.commerce.adobe.com/VyumfC53bDYkVB6b8MXsJh/media/catalog/product/a/d/adb476-red-front.jpg",
    description: "Vintage red tee with white Bezier Adobe wordmark. Relaxed, boxy fit and drop shoulders",
    color: "Vintage Red",
    sizes: ["XS", "S", "M", "L", "XL", "XXL", "3XL"]
  },
  {
    id: "bezier-tee-white",
    name: "Bezier Tee - White",
    price: "$27.00",
    imageUrl: "https://na1-static.api.commerce.adobe.com/VyumfC53bDYkVB6b8MXsJh/media/catalog/product/a/d/adb450_ecelxyjdaldsfq7m.jpg",
    description: "Heavyweight white tee with gradient Bezier Adobe wordmark. Relaxed, boxy fit with drop shoulders",
    color: "White",
    sizes: ["XS", "S", "M", "L", "XL", "XXL", "3X"]
  },
  {
    id: "adobe-life-tee",
    name: "Adobe Life Tee",
    price: "$28.00",
    imageUrl: "https://na1-static.api.commerce.adobe.com/VyumfC53bDYkVB6b8MXsJh/media/catalog/product/a/d/adb215_kinxaaegmdzr4k09.jpg",
    description: "The official uniform for your #AdobeLife. Black tee with Adobe Life graphic on the front",
    color: "Black",
    sizes: ["XS", "S", "M", "L", "XL", "XXL", "3X"]
  },
  {
    id: "adobe-for-all-tee",
    name: "Adobe for All Tee",
    price: "$16.00",
    imageUrl: "https://na1-static.api.commerce.adobe.com/VyumfC53bDYkVB6b8MXsJh/media/catalog/product/a/d/adb256_ryzf3jgqxunmeu0t.jpg",
    description: "See yourself in this tee featuring artwork by our creative director. Adobe for all printed on black tee",
    color: "Black",
    sizes: ["XS", "S", "M", "L", "XL", "XXL", "3X"]
  },
  {
    id: "womens-bezier-tee-white",
    name: "Women's Bezier Tee - White",
    price: "$25.00",
    imageUrl: "https://na1-static.api.commerce.adobe.com/VyumfC53bDYkVB6b8MXsJh/media/catalog/product/a/d/adb449_qqudowylp8rpebj1.jpg",
    description: "Heavyweight white tee with gradient Bezier Adobe wordmark. Boxier, relaxed fit. Women's sizing",
    color: "White",
    sizes: ["XS", "S", "M", "L", "XL", "XXL", "3X"]
  },
  {
    id: "travismathew-polo",
    name: "TravisMathew Polo",
    price: "$72.00",
    imageUrl: "https://na1-static.api.commerce.adobe.com/VyumfC53bDYkVB6b8MXsJh/media/catalog/product/a/d/adb157_zrcetzpl3odcrgrz.jpg",
    description: "Wrinkle resistant with four-way stretch and quick-drying technology. Black polo with gray Adobe wordmark",
    color: "Black",
    sizes: ["S", "M", "L", "XL", "XXL", "3X"]
  },
  {
    id: "womens-bezier-tee-vintage-red",
    name: "Women's Bezier Tee - Vintage Red",
    price: "$22.00",
    imageUrl: "https://na1-static.api.commerce.adobe.com/VyumfC53bDYkVB6b8MXsJh/media/catalog/product/a/d/adb448_wv3akhbcyxqihr7p.jpg",
    description: "Vintage red tee with white Bezier Adobe wordmark. Boxier, relaxed fit. Women's sizing",
    color: "Vintage Red",
    sizes: ["XS", "S", "M", "L", "XL", "XXL", "3X"]
  },
  {
    id: "brooks-brothers-polo",
    name: "Brooks Brothers Long Sleeve Polo",
    price: "$72.00",
    imageUrl: "https://na1-static.api.commerce.adobe.com/VyumfC53bDYkVB6b8MXsJh/media/catalog/product/a/d/adb445_xohzgg7qj7ljmxkv.jpg",
    description: "Stylish and comfortable long-sleeve polo. Charcoal grey half-button knit with white Adobe wordmark embroidered",
    color: "Charcoal Grey",
    sizes: ["XS", "S", "M", "L", "XL", "XXL", "3X"]
  },
  {
    id: "escape-artist-tee-sam-wilde",
    name: "Escape Artist Tee - Art by Sam Wilde",
    price: "$26.25",
    imageUrl: "https://na1-static.api.commerce.adobe.com/VyumfC53bDYkVB6b8MXsJh/media/catalog/product/a/d/adb385_n3wbaowuyczsjxtw.jpg",
    description: "Limited edition artist collaboration with Sam Wilde. Features playful, brightly colored newts on gray sueded long-sleeve tee",
    color: "Gray",
    sizes: ["XS", "S", "M", "XL", "XXL"]
  },
  {
    id: "adobe-max-25-tee",
    name: "Adobe MAX '25 Tee",
    price: "$26.00",
    imageUrl: "https://na1-static.api.commerce.adobe.com/VyumfC53bDYkVB6b8MXsJh/media/catalog/product/a/d/adb501-blk-front.jpg",
    description: "You came, you saw, you played. Black tee with black flocked MAX illustration on the back, event info on front in red",
    color: "Black",
    sizes: ["XS", "S", "M", "L", "XL", "XXL", "3XL"]
  }
];

async function handler(args: {}): Promise<ActionHandlerResult> {
  const startTime = Date.now();
  logger.info(`MCP: action=tool_invoked;tool=getAdobeShirts;status=starting`);

  try {
    logger.info(`MCP: action=tool_execution;tool=getAdobeShirts;status=loading_shirts`);

    const now = new Date();
    const responseText = `Found ${MOCK_SHIRTS.length} Adobe shirts available. Browse the collection in the widget below.`;

    const result = {
      content: [{
        type: 'text' as const,
        text: responseText
      }],
      structuredContent: {
        shirts: MOCK_SHIRTS
      },
      success: true,
      timestamp: now.getTime()
    };

    const executionTime = Date.now() - startTime;
    logger.info(`MCP: action=tool_completed;tool=getAdobeShirts;status=success;duration_ms=${executionTime};shirts_count=${MOCK_SHIRTS.length}`);

    return result;
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    logger.error(`MCP: action=tool_completed;tool=getAdobeShirts;status=error;duration_ms=${executionTime};error=${error.message}`);

    return {
      content: [{
        type: 'text' as const,
        text: `Error in getAdobeShirts: ${error.message}`
      }],
      success: false,
      error: error.message,
      timestamp: Date.now()
    };
  }
}

export { handler };
