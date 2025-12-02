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
import { SecretStore } from "fastly:secret-store";
// @ts-ignore
import { env } from "fastly:env";
import { API_ENDPOINTS, HTTP_METHOD_GET, HEADERS_COMMON, PUBLISH_FASTLY_BACKEND } from "../../constants";

// Hardcoded base URL - bypasses environment variable issues with AEM Edge Compute
const AEM_BASE_URL = "https://author-p77504-e175976-cmstg.adobeaemcloud.com";
import type { Action, ActionHandlerResult } from "../../types";
import { logRequestDetails, logResponseHeaders } from "../../utils/tool-logging";
import { logger } from "../../utils/logger";
import { IMS } from "../../ims";

const searchContentFragments: Action = {
  version: '0.0.1',
  name: "searchContentFragments",
  isPublished: true,
  hasAemWidget: false,
  definition: {
    title: "Search Content Fragments",
    description: "Search for AEM content fragments using structured queries with filters and sorting. Supports full-text search across fragment title, description, and field values, plus filtering by path, status, model, tags, dates, and authors. Use this tool to find specific content fragments in AEM based on various criteria.",
    inputSchema: {
      query: z.string()
        .trim()
        .min(1, "Query JSON is required")
        .describe("JSON string containing ContentFragmentSearchPattern with filter and sort. Example: {\"filter\":{\"path\":\"/content/dam\",\"fullText\":{\"text\":\"keyword\"},\"status\":[\"PUBLISHED\"]},\"sort\":[{\"on\":\"modifiedOrCreated\",\"order\":\"DESC\"}]}. The fullText search looks in fragment title, description, and all field values."),
      limit: z.number()
        .optional()
        .default(20)
        .describe("Maximum number of results (1-50, default: 20)"),
      projection: z.enum(["summary", "full"])
        .optional()
        .default("summary")
        .describe("Level of detail in results: 'summary' for basic info, 'full' for complete fragment data including all fields and variations")
    },
  },
  handler: async (args: { query: string; limit?: number; projection?: string }): Promise<ActionHandlerResult> => {
    const startTime = Date.now();
    logger.info(`MCP: action=tool_invoked;tool=searchContentFragments;status=starting;query=${args.query}`);

    try {
      // Validate and parse the query JSON
      let queryObj;
      try {
        queryObj = JSON.parse(args.query);
      } catch (parseError) {
        logger.error(`MCP: action=tool_execution;tool=searchContentFragments;status=invalid_json;error=${parseError}`);
        return {
          content: [{ type: "text" as const, text: `Invalid JSON query: ${parseError}. Please provide a valid JSON string.` }],
          success: false,
          error: "Invalid JSON format",
          timestamp: Date.now()
        };
      }

      logger.info('MCP: action=tool_execution;tool=searchContentFragments;status=getting_ims_token');
      const accessToken = await getIMSToken();

      logger.info('MCP: action=tool_execution;tool=searchContentFragments;status=fetching_cf_api');
      const data = await fetchContentFragmentSearchAPI(args.query, args.limit || 20, args.projection || "summary", accessToken);

      logger.info('MCP: action=tool_execution;tool=searchContentFragments;status=preparing_response');

      const result = {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
        success: true,
        timestamp: Date.now()
      };

      const executionTime = Date.now() - startTime;
      logger.info(`MCP: action=tool_completed;tool=searchContentFragments;status=success;duration_ms=${executionTime}`);

      return result;
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      logger.error(`MCP: action=tool_completed;tool=searchContentFragments;status=error;duration_ms=${executionTime};error=${error.message}`);

      return {
        content: [{ type: "text" as const, text: `Error searching content fragments: ${error.message}. Please try again later.` }],
        success: false,
        error: error.message,
        query: args.query,
        timestamp: Date.now()
      };
    }
  }
};

async function getIMSToken(): Promise<string> {
  // First priority: Check for direct access token (simplest for local testing)
  // Try both env() for deployed and process.env for local
  let directToken = env("CONTENT_AI_ACCESS_TOKEN");
  if (!directToken && typeof process !== 'undefined' && process.env) {
    directToken = process.env.CONTENT_AI_ACCESS_TOKEN;
  }

  if (directToken) {
    console.log(`[searchContentFragments-ims] Using direct access token from CONTENT_AI_ACCESS_TOKEN environment variable`);
    return directToken;
  }

  let clientId: string;
  let clientSecret: string;
  let scope: string;

  try {
    // Second priority: Try Fastly SecretStore (deployed environment)
    const secrets = new SecretStore('secret_default');
    const clientIdHandle = await secrets.get('CONTENT_AI_CLIENT_ID');
    const clientSecretHandle = await secrets.get('CONTENT_AI_CLIENT_SECRET');
    const scopeHandle = await secrets.get('CONTENT_AI_TOKEN_SCOPE');

    if (!clientIdHandle || !clientSecretHandle || !scopeHandle) {
      throw new Error("Secrets not found in SecretStore");
    }

    clientId = clientIdHandle.plaintext();
    clientSecret = clientSecretHandle.plaintext();
    scope = scopeHandle.plaintext();
    
    console.log(`[searchContentFragments-ims] Using credentials from Fastly SecretStore`);
  } catch (secretStoreError: any) {
    // Third priority: Fallback to IMS credentials in environment variables
    console.log(`[searchContentFragments-ims] SecretStore not available (${secretStoreError.message}), falling back to environment variables`);
    
    // Try both env() for deployed and process.env for local
    clientId = env("CONTENT_AI_CLIENT_ID") || (typeof process !== 'undefined' && process.env ? process.env.CONTENT_AI_CLIENT_ID : '') || '';
    clientSecret = env("CONTENT_AI_CLIENT_SECRET") || (typeof process !== 'undefined' && process.env ? process.env.CONTENT_AI_CLIENT_SECRET : '') || '';
    scope = env("CONTENT_AI_TOKEN_SCOPE") || (typeof process !== 'undefined' && process.env ? process.env.CONTENT_AI_TOKEN_SCOPE : '') || '';

    if (!clientId || !clientSecret || !scope) {
      const errorMsg = "Could not find authentication credentials. Please set either:\n" +
                      "- CONTENT_AI_ACCESS_TOKEN (direct bearer token), or\n" +
                      "- CONTENT_AI_CLIENT_ID, CONTENT_AI_CLIENT_SECRET, and CONTENT_AI_TOKEN_SCOPE (for IMS flow)";
      console.error(`[searchContentFragments-ims] IMS setup error: ${errorMsg}`);
      throw new Error(errorMsg);
    }
    
    console.log(`[searchContentFragments-ims] Using IMS credentials from environment variables`);
  }

  const ims = new IMS(clientId, clientSecret, scope);
  return await ims.fetchToken();
}

async function fetchContentFragmentSearchAPI(query: string, limit: number, projection: string, accessToken: string): Promise<any> {
  // URL encode the query parameter
  const encodedQuery = encodeURIComponent(query);
  const url = `${AEM_BASE_URL}${API_ENDPOINTS.CF_SEARCH}?query=${encodedQuery}&limit=${limit}&projection=${projection}`;
  
  console.log(`[searchContentFragments] Fetching content fragment search API at ${url}`);

  const fetchOptions: any = {
    method: HTTP_METHOD_GET,
    headers: {
      ...HEADERS_COMMON,
      Authorization: `Bearer ${accessToken}`,
      // AEM-specific headers required for proper routing and performance
      'x-adobe-accept-unsupported-api': '1',
      'x-aem-affinity-type': 'api',
      'x-api-key': 'exc_app',
      'x-gw-ims-org-id': '8EFA1C3367FCF5FF0A494208@AdobeOrg'
    },
    // Only specify backend if configured, otherwise use dynamic backend resolution
    ...(PUBLISH_FASTLY_BACKEND ? { backend: PUBLISH_FASTLY_BACKEND } : {})
  };

  logRequestDetails("searchContentFragments", url, fetchOptions, "remote");
  const response = await fetch(url, fetchOptions);
  logResponseHeaders("searchContentFragments", response);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[searchContentFragments] Error: ${response.status} - ${errorText}`);
    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  const responseText = await response.text();
  let data: any;
  try {
    data = JSON.parse(responseText);
  } catch (parseError) {
    data = { message: responseText };
  }
  return data;
}

export default searchContentFragments;

