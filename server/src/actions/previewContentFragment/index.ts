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
import { widgetResourcesByUri } from "../widget-resources";

const previewContentFragment: Action = {
  version: '0.0.1',
  name: "previewContentFragment",
  isPublished: true,
  hasAemWidget: true,
  definition: {
    title: "Preview Content Fragment",
    description: "Preview a content fragment rendered with a template. Returns an HTML preview of the fragment using either a custom template or the generic template. Use this tool to see how a content fragment will look when rendered.",
    inputSchema: {
      fragmentId: z.string()
        .trim()
        .min(1, "Fragment ID is required")
        .describe("The ID of the content fragment to preview"),
      variation: z.string()
        .trim()
        .optional()
        .describe("Variation name (defaults to 'main')"),
      templateId: z.string()
        .trim()
        .optional()
        .describe("Custom template ID from Azure Blob Storage. If not provided, uses the generic template"),
      hydrated: z.boolean()
        .optional()
        .default(true)
        .describe("Request hydrated references (defaults to true)"),
      maxDepth: z.number()
        .int()
        .positive()
        .optional()
        .describe("Maximum depth for reference traversal")
    },
    annotations: {
      destructiveHint: false,
      openWorldHint: true,
      readOnlyHint: true,
    },
    _meta: {
      "openai/outputTemplate": "ui://aem-widget/preview-content-fragment.html",
      "openai/toolInvocation/invoking": "Generating content fragment preview...",
      "openai/toolInvocation/invoked": "Preview ready",
      "openai/widgetAccessible": true,
      "openai/resultCanProduceWidget": true,
    },
  },
  handler: async (args: {
    fragmentId: string;
    variation?: string;
    templateId?: string;
    hydrated?: boolean;
    maxDepth?: number;
  }): Promise<ActionHandlerResult> => {
    const startTime = Date.now();
    logger.info(`MCP: action=tool_invoked;tool=previewContentFragment;status=starting;fragmentId=${args.fragmentId}`);

    try {
      logger.info('MCP: action=tool_execution;tool=previewContentFragment;status=getting_ims_token');
      const accessToken = await getIMSToken();

      logger.info('MCP: action=tool_execution;tool=previewContentFragment;status=fetching_preview');
      const htmlContent = await fetchContentFragmentPreview(args, accessToken);

      logger.info('MCP: action=tool_execution;tool=previewContentFragment;status=preparing_widget');

      const widgetResource = widgetResourcesByUri.get("ui://aem-widget/preview-content-fragment.html");

      const result = {
        content: [
          {
            type: "text" as const,
            text: `Content fragment preview generated for fragment ID: ${args.fragmentId}`
          },
          ...(widgetResource ? [{
            type: "resource" as const,
            resource: {
              uri: widgetResource.uri,
              mimeType: widgetResource.mimeType,
              text: widgetResource.content
            }
          }] : [])
        ],
        structuredContent: {
          fragmentId: args.fragmentId,
          variation: args.variation || 'main',
          templateId: args.templateId || 'generic',
          htmlContent: htmlContent,
          timestamp: new Date().toISOString()
        },
        success: true,
        timestamp: Date.now()
      };

      const executionTime = Date.now() - startTime;
      logger.info(`MCP: action=tool_completed;tool=previewContentFragment;status=success;duration_ms=${executionTime}`);

      return result;
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      logger.error(`MCP: action=tool_completed;tool=previewContentFragment;status=error;duration_ms=${executionTime};error=${error.message}`);

      return {
        content: [{
          type: "text" as const,
          text: `Error previewing content fragment: ${error.message}. Please check the fragment ID and try again.`
        }],
        success: false,
        error: error.message,
        fragmentId: args.fragmentId,
        timestamp: Date.now()
      };
    }
  }
};

async function getIMSToken(): Promise<string> {
  // First priority: Check for direct access token
  let directToken = env("CONTENT_AI_ACCESS_TOKEN");
  if (!directToken && typeof process !== 'undefined' && process.env) {
    directToken = process.env.CONTENT_AI_ACCESS_TOKEN;
  }

  if (directToken) {
    console.log(`[previewContentFragment-ims] Using direct access token from CONTENT_AI_ACCESS_TOKEN environment variable`);
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

    console.log(`[previewContentFragment-ims] Using credentials from Fastly SecretStore`);
  } catch (secretStoreError: any) {
    // Third priority: Fallback to IMS credentials in environment variables
    console.log(`[previewContentFragment-ims] SecretStore not available (${secretStoreError.message}), falling back to environment variables`);

    clientId = env("CONTENT_AI_CLIENT_ID") || (typeof process !== 'undefined' && process.env ? process.env.CONTENT_AI_CLIENT_ID : '') || '';
    clientSecret = env("CONTENT_AI_CLIENT_SECRET") || (typeof process !== 'undefined' && process.env ? process.env.CONTENT_AI_CLIENT_SECRET : '') || '';
    scope = env("CONTENT_AI_TOKEN_SCOPE") || (typeof process !== 'undefined' && process.env ? process.env.CONTENT_AI_TOKEN_SCOPE : '') || '';

    if (!clientId || !clientSecret || !scope) {
      const errorMsg = "Could not find authentication credentials. Please set either:\n" +
                      "- CONTENT_AI_ACCESS_TOKEN (direct bearer token), or\n" +
                      "- CONTENT_AI_CLIENT_ID, CONTENT_AI_CLIENT_SECRET, and CONTENT_AI_TOKEN_SCOPE (for IMS flow)";
      console.error(`[previewContentFragment-ims] IMS setup error: ${errorMsg}`);
      throw new Error(errorMsg);
    }

    console.log(`[previewContentFragment-ims] Using IMS credentials from environment variables`);
  }

  const ims = new IMS(clientId, clientSecret, scope);
  return await ims.fetchToken();
}

async function fetchContentFragmentPreview(
  args: {
    fragmentId: string;
    variation?: string;
    templateId?: string;
    hydrated?: boolean;
    maxDepth?: number;
  },
  accessToken: string
): Promise<string> {
  // Build the URL with query parameters
  const queryParams = new URLSearchParams();

  if (args.variation) {
    queryParams.append('variation', args.variation);
  }
  if (args.templateId) {
    queryParams.append('templateId', args.templateId);
  }
  if (args.hydrated !== undefined) {
    queryParams.append('hydrated', String(args.hydrated));
  }
  if (args.maxDepth !== undefined) {
    queryParams.append('maxDepth', String(args.maxDepth));
  }

  const queryString = queryParams.toString();
  const url = `${AEM_BASE_URL}${API_ENDPOINTS.CF_PREVIEW}/${encodeURIComponent(args.fragmentId)}/preview${queryString ? `?${queryString}` : ''}`;

  console.log(`[previewContentFragment] Fetching preview from ${url}`);

  const fetchOptions: any = {
    method: HTTP_METHOD_GET,
    headers: {
      ...HEADERS_COMMON,
      Authorization: `Bearer ${accessToken}`,
      'Accept': 'text/html',
      'x-adobe-accept-unsupported-api': '1',
      'x-aem-affinity-type': 'api',
      'x-api-key': 'exc_app',
      'x-gw-ims-org-id': '8EFA1C3367FCF5FF0A494208@AdobeOrg'
    },
    // Only specify backend if configured, otherwise use dynamic backend resolution
    ...(PUBLISH_FASTLY_BACKEND ? { backend: PUBLISH_FASTLY_BACKEND } : {})
  };

  logRequestDetails("previewContentFragment", url, fetchOptions, "remote");
  const response = await fetch(url, fetchOptions);
  logResponseHeaders("previewContentFragment", response);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[previewContentFragment] Error: ${response.status} - ${errorText}`);
    throw new Error(`Preview request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return await response.text();
}

export default previewContentFragment;

