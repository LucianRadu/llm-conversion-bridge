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

import type { ActionHandlerResult } from '../../types';
import { logger } from '../../utils/logger';

// Mock Frescopa Coffee data (from https://frescopa.coffee/coffee)
// Images served from Adobe AEM delivery CDN
const MOCK_COFFEE = [
  // Bagged Coffee
  {
    id: "hbdr212",
    name: "House Blend - Dark Roast",
    price: "$14.99",
    imageUrl: "https://delivery-p149891-e1546482.adobeaemcloud.com/adobe/assets/urn:aaid:aem:5f861728-7e97-4513-ab01-d6d174f244d6",
    description: "A bold blend of Arabica and Robusta beans, offering a deep taste with notes of dark chocolate, toasted nuts, and a hint of smokiness.",
    category: "Bagged Coffee",
    roastType: "Dark Roast"
  },
  {
    id: "hbex213",
    name: "House Blend - Espresso",
    price: "$14.99",
    imageUrl: "https://delivery-p149891-e1546481.adobeaemcloud.com/adobe/assets/urn:aaid:aem:dbeb9144-875c-4965-8af5-36c96c436c28",
    description: "A rich and full-bodied coffee experience with notes of dark chocolate, caramel, and nuttiness, ensuring every cup is delightful and aromatic.",
    category: "Bagged Coffee",
    roastType: "Espresso"
  },
  {
    id: "hbmr211",
    name: "House Blend - Medium Roast",
    price: "$14.99",
    imageUrl: "https://delivery-p149891-e1546481.adobeaemcloud.com/adobe/assets/urn:aaid:aem:d6363ad1-7b18-4bf6-859c-899108e7fe5e",
    description: "A smooth and bold notes of caramel, toasted nuts, and fruitiness, ensuring a flavorful and aromatic coffee experience.",
    category: "Bagged Coffee",
    roastType: "Medium Roast"
  },
  // Coffee Pods
  {
    id: "pod311",
    name: "Morning Muse - Light Roast",
    price: "$3.99",
    imageUrl: "https://delivery-p149891-e1546481.adobeaemcloud.com/adobe/assets/urn:aaid:aem:0eff15fc-5599-4b47-8b52-cd1a788bc2da",
    description: "A Colombian roast with caramel, chocolate, and cherry flavor.",
    category: "Coffee Pods",
    roastType: "Light Roast"
  },
  {
    id: "pod341",
    name: "Midnight Oil - Dark Roast",
    price: "$3.99",
    imageUrl: "https://delivery-p149891-e1546481.adobeaemcloud.com/adobe/assets/urn:aaid:aem:0eff15fc-5599-4b47-8b52-cd1a788bc2da",
    description: "A rich blend of Robusta beans with candied hazelnut and chocolate flavor.",
    category: "Coffee Pods",
    roastType: "Dark Roast"
  },
  {
    id: "pod351",
    name: "Afternoon Delight",
    price: "$3.99",
    imageUrl: "https://delivery-p149891-e1546481.adobeaemcloud.com/adobe/assets/urn:aaid:aem:0eff15fc-5599-4b47-8b52-cd1a788bc2da",
    description: "100% Arabica beans with French vanilla and caramel flavor.",
    category: "Coffee Pods",
    roastType: "Medium Roast"
  }
];

async function handler(args: {}): Promise<ActionHandlerResult> {
  const startTime = Date.now();
  logger.info(`MCP: action=tool_invoked;tool=getCoffeeList;status=starting`);

  try {
    logger.info(`MCP: action=tool_execution;tool=getCoffeeList;status=loading_coffee`);

    const now = new Date();
    const baggedCoffee = MOCK_COFFEE.filter(c => c.category === "Bagged Coffee");
    const coffeePods = MOCK_COFFEE.filter(c => c.category === "Coffee Pods");

    const responseText = `Found ${MOCK_COFFEE.length} Frescopa coffee products: ${baggedCoffee.length} Bagged Coffee and ${coffeePods.length} Coffee Pods. Browse the collection in the widget below.`;

    const result = {
      content: [{
        type: 'text' as const,
        text: responseText
      }],
      structuredContent: {
        coffee: MOCK_COFFEE
      },
      success: true,
      timestamp: now.getTime()
    };

    const executionTime = Date.now() - startTime;
    logger.info(`MCP: action=tool_completed;tool=getCoffeeList;status=success;duration_ms=${executionTime};coffee_count=${MOCK_COFFEE.length}`);

    return result;
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    logger.error(`MCP: action=tool_completed;tool=getCoffeeList;status=error;duration_ms=${executionTime};error=${error.message}`);

    return {
      content: [{
        type: 'text' as const,
        text: `Error in getCoffeeList: ${error.message}`
      }],
      success: false,
      error: error.message,
      timestamp: Date.now()
    };
  }
}

export { handler };

