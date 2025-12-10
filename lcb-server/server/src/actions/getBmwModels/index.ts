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

// Mock BMW vehicle data (from https://www.bmwusa.com/special-offers-new.html)
// Using BMW press/marketing images that are publicly accessible
const MOCK_BMW_MODELS = [
  // SUVs
  {
    id: "26XD",
    model: "X3 30 xDrive",
    shortName: "X3",
    year: 2026,
    category: "SUV",
    leasePrice: 599,
    dueAtSigning: 5129,
    leaseTerm: 39,
    loyaltyCredit: 1000,
    driveType: "All-Wheel Drive",
    mpg: "33 MPG",
    imageUrl: "https://prod.cosy.bmw.cloud/bmwweb/cosySec?COSY-EU-100-733156fayVOhiL0onTdzmlDnEfbc1KVZiNV89RrhfEsWkP05qKRKdnua9FKWzL1YjXWtJNhfUt4Ws46Iq5gmvhmKU31yXqcfbYZ9WhcKYiWkP058yVAf4UQxiNHCcvwDX0KEQIJ7qIb0W3GRUQ8w4jD5lkv3PQfNwqMJfldKShts5eqKo3GIf3kLNHCOv5DLylHifGO6LTeJnTNdPumtE6Cgk1F7Gq2VzeWhcN7ShtpN1SUjn3DZXxjmqn1nw5DyLOEfmgqTJIs8NSL3uBrU1QJdSeZGjNuzVMRpzeSkNh56JuVA0ogYEYNF4HvVJ30Kc%252NK94Wxfj0LMcP81D4TSxbUEqcaF89GsLxz8UiprJ2CkGw6Zuj8JptYRS3ol67m5VdQ5YCygNzd2mlTv0IkwyX324BVwTQdjcett3azDxMsddnkq8IaYzOALUBnKkIFJGeOrABNlRCzmlhq2J",
    exploreUrl: "https://www.bmwusa.com/vehicles/x-series/x3/bmw-x3.html",
    offerExpiry: "January 2nd"
  },
  {
    id: "26XG",
    model: "X5 xDrive40i",
    shortName: "X5",
    year: 2026,
    category: "SUV",
    leasePrice: 899,
    dueAtSigning: 6369,
    leaseTerm: 39,
    loyaltyCredit: 2000,
    driveType: "All-Wheel Drive",
    mpg: "27 MPG",
    imageUrl: "https://prod.cosy.bmw.cloud/bmwweb/cosySec?COSY-EU-100-733156fayVOhiL0onTdzmlDnEfbc1KVZiNV89RrhfEsWkP05qKRVdnua9FKWzL1YjXWtJNhfUt4Ws46Iq5gmvhmKl31yXqcfbYZ9WhcKYiWkP058yVAf4UQxiNHCcvwGn0KEQIJ7qIb0W3GRUQ8w4jD5lkv3PQfNwqMJfldKShts5eqKo3GIf3kLNHCOv5D36lMifGO6LTeJnTNdPumtE6Cgk1F7Gq2VzeWhcN7ShtpN1SUjn3DZXxjmqn1nw5DyLOEOK9qTJIs1yfL3uBrEVtJdSeZG4NuzVMRpsnSkNh56q4VA0ogYAhNF4HvmSV0Kc%252y1%254Wxfj0pUcP81D4VkxbUEqcNX89GsLxSHUiprJ8z0Gw6ZuUIPptYRSGQz67m5Vpn6YCygN677mlTv0YPmyX324u8zTQdjcSIj3azDxVBidnkq8NTxzOALUPZekIFJGbhJABKup9o5FeWS6ivnKMPVYw2jWhbNmtw4Po90y7awbHi4TrYB9%25wc3ZmiiftxdRMMw178z5JttE6MJeiKMZcN8",
    exploreUrl: "https://www.bmwusa.com/vehicles/x-series/x5/bmw-x5.html",
    offerExpiry: "January 2nd"
  },
  {
    id: "26XB",
    model: "X1 xDrive28i",
    shortName: "X1",
    year: 2026,
    category: "SUV",
    leasePrice: 499,
    dueAtSigning: 4899,
    leaseTerm: 39,
    loyaltyCredit: 1000,
    driveType: "All-Wheel Drive",
    mpg: "33 MPG",
    imageUrl: "https://prod.cosy.bmw.cloud/bmwweb/cosySec?COSY-EU-100-733156fayVOhiL0onTdzmlDnEfbc1KVZiNV89RrhfEsWkP05qKR0dnua9FKWzL1YjXWtJNhfUt4Ws46Iq5gmvhmK3I%25yXqcfbYZ9WhcKYiWkP058yVAf4UQxiNHCcvwaN0KEQIJ7qIb0W3GRUQ8w4jD5lkv3PQfNwqMJfldKShts5eqKrPpw56swT7OY9hJPH4lLQoKGxyC5nvzTomvhWTLmF8stUVfk89GsLsDiUiprJq9eGw6ZuATmptYRSFxy67m5VKQOYCygNW2umlTv0YGiyX324mXwTQdjcyQp3azDxTG5dnkq83iYzOALUd1XkIFJGzh%25ABKupkbgFeWS6xHnKMPVY8%25VWhbNmUfQPo90yGKmbHi4TCE49%25wc3lC8iftxdRLww178z53etECUkgmS7slGAZECCrmoShtPo584G",
    exploreUrl: "https://www.bmwusa.com/vehicles/x-series/x1/bmw-x1.html",
    offerExpiry: "January 2nd"
  },
  {
    id: "26SA",
    model: "X7 xDrive40i",
    shortName: "X7",
    year: 2026,
    category: "SUV",
    leasePrice: 969,
    dueAtSigning: 8409,
    leaseTerm: 39,
    loyaltyCredit: 2000,
    driveType: "All-Wheel Drive",
    mpg: "25 MPG",
    imageUrl: "https://prod.cosy.bmw.cloud/bmwweb/cosySec?COSY-EU-100-7331cqgv2Z7d%25i02uCaY3MuO2ksxEa7sqmpTTQLzB6ShtN8vbCUVo%25fMLWFmdkAj5DOP725zZ8XkWfTHWpZUVjO2krlROWUmgXAeHCrms8fnOl6JQD0mbH8ELDOdqQmSBymkIVk956cxw8jwO1ZNtE6BmudhSId4k9VTCrmQ8StO8pZ2aKwfHsZcWazOSGrt3v7ifGxQ4fXyxZ4YJeAuvOpJdSeZeljuzVMRMalSkNh5Z2VVA0ogRkZNF4HvmUx0Kc%252y5e4WxfjTSUcP81D3wCxbUEqdr289GsLxjbUiprJ84KGw6ZuUcnptYRSG0l67m5VpakYCygN6qumlTv0YImyX324mbyTQdjcSIj3azDxVBidnkq8NTZzOALUPZekIFJGbhJABKup9o5FeWS6ivnKMPVYwi0WhbNmtQrPo90ysjfbH8wlD7Z9cvt3RXLifG93CiWw8j6zcPr87DWLxEalej3",
    exploreUrl: "https://www.bmwusa.com/vehicles/x-series/x7/bmw-x7.html",
    offerExpiry: "January 2nd"
  },
  // Sedans
  {
    id: "263X",
    model: "330i xDrive Sedan",
    shortName: "3 Series",
    year: 2026,
    category: "Sedan",
    leasePrice: 499,
    dueAtSigning: 4999,
    leaseTerm: 39,
    loyaltyCredit: 1000,
    driveType: "All-Wheel Drive",
    mpg: "34 MPG",
    imageUrl: "https://prod.cosy.bmw.cloud/bmwweb/cosySec?COSY-EU-100-733156fayVOhiL0onTdzmlDnEfbc1KVZiNV89RrhfEsWkP05qKaBdnua9FKWzL1YjXWtJNhfUt4Ws46Iq5gmvhmKRbgyXqcfbYZ9WhcKYiWkP058yVAf4UQxiNHCcvwGO0KEQIJ7qIb0W3GRUQ8w4jD5lkv3PQfNwqMJfldKShts5eqKo3GIf3kLNHCOv5DLylHifGO6LTeJnTNdPumtE6Cgk1F7Gq2VzeWhcN7ShtpN1SUjn3DZXxjmqn1nw5DyLOEOhUqTJIs10yL3uBrET1JdSeZG4NuzVMRpsFSkNh56rOVA0ogYLcNF4HvmFo0Kc%252y9W4WxfjTN0cP81D46lxbUEqcbA89GsLx9NUiprJ8V%25Gw6ZuUWpptYRSGAc67m5VpeIYCygN6q9mlTv0YPmyX324uAlTQdjcSQ73azDxVWCdnkq8NeqzOALU0MtkIFJGbRMABKup9ouFeWS6iHgKMPVYw2OWhbNmtw4Po90y7awbHi4TCZ49%25wc3ZlMiftxdRyMw178z5TttECUkgKH7slGAvHHCrXpF2VllZyHVo7bHgUcp",
    exploreUrl: "https://www.bmwusa.com/vehicles/3-series/3-series-sedan/bmw-3-series-sedan.html",
    offerExpiry: "January 2nd"
  },
  {
    id: "265B",
    model: "530i xDrive Sedan",
    shortName: "5 Series",
    year: 2026,
    category: "Sedan",
    leasePrice: 659,
    dueAtSigning: 6239,
    leaseTerm: 39,
    loyaltyCredit: 2000,
    driveType: "All-Wheel Drive",
    mpg: null,
    imageUrl: "https://prod.cosy.bmw.cloud/bmwweb/cosySec?COSY-EU-100-733156fayVOhiL0onTdzmlDnEfbc1KVZiNV89RrhfEsWkP05qKG1dnua9FKWzL1YjXWtJNhfUt4Ws46Iq5gmvhmKUOlyXqcfbYZ9WhcKYiWkP058yVAf4UQxiNHCcvdC30KEQIJ7qIb0W3GRUQ8w4jD5lkv3PQfNwqMJfldKShts5eqKo3GIf3kLNHCOv5DLylHifGO6LTeJnTNdPumtE6Cgk1F7Gq2VzeWhcN7ShtpN1SUjn3DZXxjmqn1nw5DyLOEfmgqTJIs8NSL3uBrU1kJdSeZGEauzVMRpD0SkNh56YvVA0ogS8wNF4HvVFp0Kc%252Nqe4Wxfj0XkcP81D4tmxbUEqgup89GsLv7zUiprJ2xLGw6ZuThPptYRS3XR67m5VdQHYCygNzfimlTv0kzjyX324B1TTQLi19mUiOgZ2",
    exploreUrl: "https://www.bmwusa.com/vehicles/5-series/sedan/bmw-5-series-sedan-overview.html",
    offerExpiry: "January 2nd"
  },
  // Electric
  {
    id: "25DA",
    model: "i4 eDrive40",
    shortName: "i4",
    year: 2025,
    category: "Electric",
    leasePrice: 399,
    dueAtSigning: 4999,
    leaseTerm: 36,
    loyaltyCredit: 2000,
    driveType: "Rear-Wheel Drive",
    mpg: "295-318 mi. range",
    imageUrl: "https://prod.cosy.bmw.cloud/bmwweb/cosySec?COSY-EU-100-7331cqgv2Z7d%25i02uCaY3MuO2ksxEa7sqmpTTQLzB6ShtN8vbCUVo%25fMLWFmdkAj5DOP72EzZ8XkWfTHWpZUVjO2krlROWUmgXAeHCrms8fnOl6JQD0mbH8ELDOdqQmSBymkIVk956cxw8jwO4CutE6BmudhSId4k9VTCrmQ8StO8pZ2aKwfHsZcWazOSGrt3v7ifGxQ4fXyxZ4YJeAuvOpJdSeZelEuzVMRr4gSkNh5Z4rVA0ogRc8NF4Hv5xQ0Kc%252g864WxfjTpUcP81D3vhxbUEqdNp89GsLz9EUiprJkCwGw6ZuA8UptYRSFQo67m5VpdIYCygN6C9mlTv0YlUyX324m8ZTQdjcybX3azDxT%25odnkq83flzOALUdNlkIFJGzOfABKupkCjFeWS6AlFKMPVY8weWhbNmUhIPo90yGCBbHi4TpE49%25wc36sQiftxdYrIw178zmZetECUkyie7slGAT%25tCrXpFOIllZQ6KIbXXRaYWB0vQ5nmPejmagOybMDCnvIT9hqxO2B3ioURIjedwHokBDMzt%2508eqhk7fZHMLoAC1%25whJHFlEcFou%25KXc7jHSfWQxC%25%25V1Pa8qqfNEbnU3110s9OGwFE4riIrHYscZwBZ2rrxRteRoyZ857M57FRUgChgH95Gvlov2hgp2XH2G4v6jQ%25jzc2YDafyRjjmqn1TWJDyeJNwSFqIbusK07L3hqsVL2JeiHZIjAeSw27BzcNpis",
    exploreUrl: "https://www.bmwusa.com/vehicles/bmw-i-series/i4/bmw-i4-gran-coupe.html",
    offerExpiry: "January 2nd"
  },
  {
    id: "265T",
    model: "i5 eDrive40",
    shortName: "i5",
    year: 2026,
    category: "Electric",
    leasePrice: 599,
    dueAtSigning: 5679,
    leaseTerm: 36,
    loyaltyCredit: 2000,
    driveType: "Rear-Wheel Drive",
    mpg: "278-310 mi. range",
    imageUrl: "https://prod.cosy.bmw.cloud/bmwweb/cosySec?COSY-EU-100-7331cqgv2Z7d%25i02uCaY3MuO2ksxEa7sqmpTTQLzB6ShtN8vbCUVo%25fMLWFmdkAj5DOP72omZ8XkWfTHWpZUVjO2krlROWUmgXAeHCrms8fnOl6JQD0mbH8ELDOdqQmSBymkIVk956cxw8jwOWCutE6BmudhSId4k9VTCrmQ8StO8pZ2aKwfHsZcWazOSGrt3v7ifGxQ4fXyxZ4YJeAuvOpJdSeZG4NuzVMRpsFSkNh56rOVA0ogYLcNF4Hvmyj0Kc%252NG74Wxfj0WYcP81D4JhxbUEqcaF89GsLxCTUiprJ8kUGw6ZujNmptYRSDXF67m5VqGSYCygNz%25imlTv0knvyX324AO1TQdjcFs73azDxKFLdnkq8hrzzOSFbZWHkJEKG%259rABNkGPA3FSr46JdoSWZ35uMwbXrG",
    exploreUrl: "https://www.bmwusa.com/vehicles/bmw-i-series/i5/bmw-i5-overview.html",
    offerExpiry: "January 2nd"
  }
];

interface GetBmwModelsArgs {
  category?: string;
}

async function handler(args: GetBmwModelsArgs): Promise<ActionHandlerResult> {
  const startTime = Date.now();
  const category = args.category || 'all';
  logger.info(`MCP: action=tool_invoked;tool=getBmwModels;status=starting;category=${category}`);

  try {
    logger.info(`MCP: action=tool_execution;tool=getBmwModels;status=loading_models`);

    // Filter by category if specified
    const filteredModels = category === 'all'
      ? MOCK_BMW_MODELS
      : MOCK_BMW_MODELS.filter(m => m.category === category);

    const now = new Date();
    const suvCount = filteredModels.filter(m => m.category === 'SUV').length;
    const sedanCount = filteredModels.filter(m => m.category === 'Sedan').length;
    const electricCount = filteredModels.filter(m => m.category === 'Electric').length;

    const categoryText = category === 'all'
      ? `${suvCount} SUVs, ${sedanCount} Sedans, and ${electricCount} Electric vehicles`
      : `${filteredModels.length} ${category} models`;

    const responseText = `Found ${filteredModels.length} BMW models: ${categoryText}. Browse the offers in the widget below.`;

    const result = {
      content: [{
        type: 'text' as const,
        text: responseText
      }],
      structuredContent: {
        models: filteredModels,
        category: category,
        totalCount: filteredModels.length
      },
      success: true,
      timestamp: now.getTime()
    };

    const executionTime = Date.now() - startTime;
    logger.info(
      `MCP: action=tool_completed;tool=getBmwModels;status=success;` +
      `duration_ms=${executionTime};model_count=${filteredModels.length};category=${category}`
    );

    return result;
  } catch (error: unknown) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(
      `MCP: action=tool_completed;tool=getBmwModels;status=error;` +
      `duration_ms=${executionTime};error=${errorMessage}`
    );

    return {
      content: [{
        type: 'text' as const,
        text: `Error in getBmwModels: ${errorMessage}`
      }],
      success: false,
      error: errorMessage,
      timestamp: Date.now()
    };
  }
}

export { handler };

