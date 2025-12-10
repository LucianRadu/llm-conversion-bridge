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

// Product details from https://frescopa.coffee/coffee (exact content from product pages)
const COFFEE_DETAILS: Record<string, any> = {
  "hbdr212": {
    id: "hbdr212",
    sku: "HBDR212",
    name: "House Blend - Dark Roast",
    price: "$14.99",
    imageUrl: "https://delivery-p149891-e1546482.adobeaemcloud.com/adobe/assets/urn:aaid:aem:5f861728-7e97-4513-ab01-d6d174f244d6",
    shortDescription: "A bold blend of Arabica and Robusta beans, offering a deep taste with notes of dark chocolate, toasted nuts, and a hint of smokiness.",
    longDescription: "A masterfully crafted blend that delivers a bold and intense coffee experience. This exceptional dark roast is made from the finest Arabica and Robusta beans, carefully selected and roasted to perfection to bring out their rich and robust flavors. The House Blend Dark Roast offers a deep, full-bodied taste with notes of dark chocolate, toasted nuts, and a hint of smokiness, creating a complex and satisfying flavor profile. Each bag is meticulously sealed to preserve the freshness and quality of the beans, ensuring that every cup you brew is as delightful as the first. Whether you're enjoying a strong morning coffee or a rich after-dinner espresso, our House Blend Dark Roast Bagged Coffee promises to elevate your coffee moments with its exquisite taste and invigorating aroma.",
    category: "Bagged Coffee"
  },
  "hbex213": {
    id: "hbex213",
    sku: "HBEX213",
    name: "House Blend - Espresso",
    price: "$14.99",
    imageUrl: "https://delivery-p149891-e1546481.adobeaemcloud.com/adobe/assets/urn:aaid:aem:dbeb9144-875c-4965-8af5-36c96c436c28",
    shortDescription: "A rich and full-bodied coffee experience with notes of dark chocolate, caramel, and nuttiness, ensuring every cup is delightful and aromatic.",
    longDescription: "A meticulously crafted blend that embodies the perfect balance of flavor and aroma. This exceptional espresso blend combines the finest Arabica and Robusta beans, roasted to perfection to deliver a rich and full-bodied coffee experience. The House Blend offers a harmonious fusion of bold and smooth flavors, with notes of dark chocolate, caramel, and a hint of nuttiness, creating a complex and satisfying taste profile. Each bag is carefully sealed to preserve the freshness and quality of the beans, ensuring that every cup you brew is as delightful as the first. Whether you're enjoying a morning espresso shot or a creamy latte, our House Blend Espresso Bagged Coffee promises to elevate your coffee moments with its exquisite taste and invigorating aroma.",
    category: "Bagged Coffee"
  },
  "hbmr211": {
    id: "hbmr211",
    sku: "HBMR211",
    name: "House Blend - Medium Roast",
    price: "$14.99",
    imageUrl: "https://delivery-p149891-e1546481.adobeaemcloud.com/adobe/assets/urn:aaid:aem:d6363ad1-7b18-4bf6-859c-899108e7fe5e",
    shortDescription: "A smooth and bold notes of caramel, toasted nuts, and fruitiness, ensuring a flavorful and aromatic coffee experience.",
    longDescription: "A perfectly balanced blend that offers a delightful coffee experience. This medium roast is crafted from the finest Arabica and Robusta beans, carefully selected and roasted to bring out their natural flavors. The House Blend Medium Roast features a harmonious combination of smooth and bold notes, with hints of caramel, toasted nuts, and a touch of fruitiness.",
    category: "Bagged Coffee"
  },
  "pod311": {
    id: "pod311",
    sku: "POD311",
    name: "Morning Muse - Light Roast",
    price: "$3.99",
    imageUrl: "https://delivery-p149891-e1546481.adobeaemcloud.com/adobe/assets/urn:aaid:aem:0eff15fc-5599-4b47-8b52-cd1a788bc2da",
    shortDescription: "A Colombian roast with caramel, chocolate, and cherry flavor.",
    longDescription: "Discover the exquisite taste of our Colombian roast, a coffee that embodies the rich and vibrant flavors of Colombia's finest beans. This exceptional roast is infused with the delightful notes of caramel, chocolate, and cherry, creating a harmonious blend that is both indulgent and invigorating. The smooth caramel adds a touch of sweetness, while the rich chocolate provides a deep, velvety undertone. The subtle hint of cherry brings a fruity brightness that perfectly balances the overall flavor profile. Each sip of this Colombian roast offers a luxurious and satisfying coffee experience, making it the perfect choice for any time of day. Whether you're starting your morning or enjoying a relaxing afternoon break, this blend promises to elevate your coffee moments with its irresistible taste and aroma.",
    category: "Coffee Pods"
  },
  "pod341": {
    id: "pod341",
    sku: "POD341",
    name: "Midnight Oil - Dark Roast",
    price: "$3.99",
    imageUrl: "https://delivery-p149891-e1546481.adobeaemcloud.com/adobe/assets/urn:aaid:aem:0eff15fc-5599-4b47-8b52-cd1a788bc2da",
    shortDescription: "A rich blend of Robusta beans with candied hazelnut and chocolate flavor.",
    longDescription: "Experience the bold and robust flavor of our rich blend of Robusta beans, expertly crafted to deliver a truly indulgent coffee experience. Infused with the delightful notes of candied hazelnut and chocolate, this blend offers a harmonious balance of nutty sweetness and rich cocoa undertones. Each sip reveals the full-bodied character of Robusta beans, enhanced by the smooth and creamy flavors of hazelnut and chocolate, creating a luxurious and satisfying coffee that is perfect for any time of day. Whether you're enjoying a morning pick-me-up or a relaxing afternoon treat, this exquisite blend promises to elevate your coffee moments with its irresistible taste and aroma.",
    category: "Coffee Pods"
  },
  "pod351": {
    id: "pod351",
    sku: "POD351",
    name: "Afternoon Delight",
    price: "$3.99",
    imageUrl: "https://delivery-p149891-e1546481.adobeaemcloud.com/adobe/assets/urn:aaid:aem:0eff15fc-5599-4b47-8b52-cd1a788bc2da",
    shortDescription: "100% Arabica beans with French vanilla and caramel flavor.",
    longDescription: "Indulge in the rich and aromatic experience of our 100% Arabica beans, expertly infused with the delightful flavors of French vanilla and caramel. These premium coffee beans are carefully selected and roasted to perfection, ensuring a smooth and balanced taste with every sip. The subtle sweetness of French vanilla complements the rich, buttery notes of caramel, creating a harmonious blend that is both comforting and invigorating. Whether you're starting your day or enjoying a relaxing moment, this exquisite coffee offers a luxurious and flavorful escape that will elevate your coffee-drinking experience.",
    category: "Coffee Pods"
  }
};

interface GetCoffeeDetailsArgs {
  coffeeId: string;
}

async function handler(args: GetCoffeeDetailsArgs): Promise<ActionHandlerResult> {
  const startTime = Date.now();
  const { coffeeId } = args;
  
  logger.info(`MCP: action=tool_invoked;tool=getCoffeeDetails;status=starting;coffeeId=${coffeeId}`);

  try {
    // Normalize the coffeeId (lowercase)
    const normalizedId = coffeeId.toLowerCase();
    const coffee = COFFEE_DETAILS[normalizedId];

    if (!coffee) {
      const executionTime = Date.now() - startTime;
      logger.warn(`MCP: action=tool_completed;tool=getCoffeeDetails;status=not_found;coffeeId=${coffeeId};duration_ms=${executionTime}`);
      
      return {
        content: [{
          type: 'text' as const,
          text: `Coffee with ID "${coffeeId}" not found. Available IDs: ${Object.keys(COFFEE_DETAILS).join(', ')}`
        }],
        structuredContent: {
          error: 'not_found',
          coffeeId,
          availableIds: Object.keys(COFFEE_DETAILS)
        },
        success: false,
        timestamp: Date.now()
      };
    }

    const responseText = `${coffee.name} (${coffee.sku}) - ${coffee.price}\n\n${coffee.shortDescription}`;

    const result = {
      content: [{
        type: 'text' as const,
        text: responseText
      }],
      structuredContent: {
        coffee
      },
      success: true,
      timestamp: Date.now()
    };

    const executionTime = Date.now() - startTime;
    logger.info(`MCP: action=tool_completed;tool=getCoffeeDetails;status=success;coffeeId=${coffeeId};duration_ms=${executionTime}`);

    return result;
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    logger.error(`MCP: action=tool_completed;tool=getCoffeeDetails;status=error;coffeeId=${coffeeId};duration_ms=${executionTime};error=${error.message}`);

    return {
      content: [{
        type: 'text' as const,
        text: `Error in getCoffeeDetails: ${error.message}`
      }],
      success: false,
      error: error.message,
      timestamp: Date.now()
    };
  }
}

export { handler };

