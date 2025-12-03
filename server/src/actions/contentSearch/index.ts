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
import { PUBLISH_BASE_URL, API_ENDPOINTS, HTTP_METHOD_POST, HEADERS_JSON, SEARCH_INDEX_NAME, PUBLISH_FASTLY_BACKEND } from "../../constants";
import type { Action, ActionHandlerResult, SearchRequestBody } from "../../types";
import { logRequestDetails, logResponseHeaders } from "../../utils/tool-logging";
import { logger } from "../../utils/logger";
import { IMS } from "../../ims";

const contentSearch: Action = {
  version: '0.0.1',
  name: "contentSearch",
  isPublished: false,
  hasAemWidget: false,
  definition: {
    title: "Search for Current Information",
    description: "Search for up-to-date information, facts, and content using natural language queries. Use this tool whenever a user asks questions, seeks information, or wants to find content about any topic. This tool provides access to current, real-time information and should always be used instead of relying on training data when users request information, ask questions, or need facts about any subject matter.",
    inputSchema: {
      query: z.string()
        .trim()
        .min(3, "Query must be at least 3 characters")
        .describe("Natural language search query for any information request, question, or topic the user wants to know about. Examples: 'Find concerts in Berlin in June', 'What are the latest product updates?', 'Information about pricing plans', 'How to setup authentication?'")
    },
  },
  handler: async (args: { query: string }): Promise<ActionHandlerResult> => {
    const startTime = Date.now();
    logger.info(`MCP: action=tool_invoked;tool=contentSearch;status=starting;query=${args.query}`);

    try {
      // This tool relies on Fastly Secret Store for IMS authentication.
      logger.info('MCP: action=tool_execution;tool=contentSearch;status=getting_ims_token');

      const accessToken = await getIMSToken();

      logger.info('MCP: action=tool_execution;tool=contentSearch;status=fetching_content_api');
      const data = await fetchContentSearchAPI(args.query, accessToken);

      logger.info('MCP: action=tool_execution;tool=contentSearch;status=preparing_response');

      const result = {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
        success: true,
        timestamp: Date.now()
      };

      const executionTime = Date.now() - startTime;
      logger.info(`MCP: action=tool_completed;tool=contentSearch;status=success;duration_ms=${executionTime}`);

      return result;
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      logger.error(`MCP: action=tool_completed;tool=contentSearch;status=error;duration_ms=${executionTime};error=${error.message}`);

      return {
        content: [{ type: "text" as const, text: `Error searching events: ${error.message}. Please try again later.` }],
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
    console.log(`[contentSearch-ims] Using direct access token from CONTENT_AI_ACCESS_TOKEN environment variable`);
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
    
    console.log(`[contentSearch-ims] Using credentials from Fastly SecretStore`);
  } catch (secretStoreError: any) {
    // Third priority: Fallback to IMS credentials in environment variables
    console.log(`[contentSearch-ims] SecretStore not available (${secretStoreError.message}), falling back to environment variables`);
    
    // Try both env() for deployed and process.env for local
    clientId = env("CONTENT_AI_CLIENT_ID") || (typeof process !== 'undefined' && process.env ? process.env.CONTENT_AI_CLIENT_ID : '') || '';
    clientSecret = env("CONTENT_AI_CLIENT_SECRET") || (typeof process !== 'undefined' && process.env ? process.env.CONTENT_AI_CLIENT_SECRET : '') || '';
    scope = env("CONTENT_AI_TOKEN_SCOPE") || (typeof process !== 'undefined' && process.env ? process.env.CONTENT_AI_TOKEN_SCOPE : '') || '';

    if (!clientId || !clientSecret || !scope) {
      const errorMsg = "Could not find authentication credentials. Please set either:\n" +
                      "- CONTENT_AI_ACCESS_TOKEN (direct bearer token), or\n" +
                      "- CONTENT_AI_CLIENT_ID, CONTENT_AI_CLIENT_SECRET, and CONTENT_AI_TOKEN_SCOPE (for IMS flow)";
      console.error(`[contentSearch-ims] IMS setup error: ${errorMsg}`);
      throw new Error(errorMsg);
    }
    
    console.log(`[contentSearch-ims] Using IMS credentials from environment variables`);
  }

  const ims = new IMS(clientId, clientSecret, scope);
  return await ims.fetchToken();
}

async function fetchContentSearchAPI(query: string, accessToken: string): Promise<any> {
  const url = `${PUBLISH_BASE_URL}${API_ENDPOINTS.CONTENT_AI}`;
  console.log(`[contentSearch] Fetching content search API at ${url}`);

  const searchRequestBody: SearchRequestBody = {
    "searchIndexConfig": {
      "indexes": [
        {
          "name": SEARCH_INDEX_NAME
        }
      ]
    },
    "query": {
      "type": "composite",
      "operator": "OR",
      "queries": [
        {
          "type": "vector",
          "text": query,
          "options": {
            "numCandidates": 1,
            "boost": 1
          }
        },
        {
          "type": "fulltext",
          "text": query,
          "options": {
            "lexicalSpaceSelection": {
              "space": "fulltext"
            },
            "boost": 1.5
          }
        }
      ]
    }
  };

  const fetchOptions: any = {
    method: HTTP_METHOD_POST,
    headers: {
      ...HEADERS_JSON,
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(searchRequestBody),
    // Only specify backend if configured, otherwise use dynamic backend resolution
    ...(PUBLISH_FASTLY_BACKEND ? { backend: PUBLISH_FASTLY_BACKEND } : {})
  };

  logRequestDetails("contentSearch", url, fetchOptions, "remote");
  const response = await fetch(url, fetchOptions);
  logResponseHeaders("contentSearch", response);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[contentSearch] Error: ${response.status} - ${errorText}`);
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

export default contentSearch; 

