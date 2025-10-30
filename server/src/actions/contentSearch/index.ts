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
import { PUBLISH_BASE_URL, API_ENDPOINTS, HTTP_METHOD_POST, HEADERS_JSON, SEARCH_INDEX_NAME } from "../../constants";
import type { Action, ActionHandlerResult, SearchRequestBody } from "../../types";
import { logRequestDetails, logResponseHeaders } from "../../utils/tool-logging";
import { logger } from "../../utils/logger";
import { IMS } from "../../ims";

const contentSearch: Action = {
  version: '0.0.1',
  name: "contentSearch",
  isPublished: true,
  hasAemWidget: false,
  definition: {
    title: "Search for Current Information",
    description: "Search for up-to-date information, facts, and content using natural language queries. Use this tool whenever a user asks questions, seeks information, or wants to find content about any topic. This tool provides access to current, real-time information and should always be used instead of relying on training data when users request information, ask questions, or need facts about any subject matter.",
    inputSchema: {
      query: z.string()
        .refine(val => val.length > 0, "Query cannot be empty")
        .refine(val => val.trim().length > 0, "Query cannot contain only whitespace")
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
      const data = await fetchContentSearchAPI(args.query || '', accessToken);

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
        query: args.query || '',
        timestamp: Date.now()
      };
    }
  }
};

async function getIMSToken(): Promise<string> {
  const secrets = new SecretStore('secret_default');
  const clientIdHandle = await secrets.get('CONTENT_AI_CLIENT_ID');
  const clientSecretHandle = await secrets.get('CONTENT_AI_CLIENT_SECRET');
  const scopeHandle = await secrets.get('CONTENT_AI_TOKEN_SCOPE');

  if (!clientIdHandle || !clientSecretHandle || !scopeHandle) {
    const errorMsg = "Could not find one or more of: CONTENT_AI_CLIENT_ID, CONTENT_AI_CLIENT_SECRET, CONTENT_AI_TOKEN_SCOPE in secret store 'secret_default'.";
    console.error(`[contentSearch-ims] IMS setup error: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const clientId = clientIdHandle.plaintext();
  const clientSecret = clientSecretHandle.plaintext();
  const scope = scopeHandle.plaintext();

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
          "text": query || '',
          "options": {
            "numCandidates": 1,
            "boost": 1
          }
        },
        {
          "type": "fulltext",
          "text": query || '',
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

