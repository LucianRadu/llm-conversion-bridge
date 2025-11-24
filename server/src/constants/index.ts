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

// @ts-ignore
import { env } from "fastly:env";

// ===============================
// APPLICATION CONSTANTS
// ===============================

export const APP_NAME = "MCP-Client";
export const APP_VERSION = "1.0.0";

// User Agent string for API requests
export const USER_AGENT = `${APP_NAME}/${APP_VERSION}`;

// ===============================
// URL CONSTANTS
// ===============================

// Base URLs (replace pXXXXXX-eXXXXXX with your actual AEM Cloud Service IDs)
export const PUBLISH_BASE_URL = env("PUBLISH_BASE_URL") || 'https://publish-pXXXXXX-eXXXXXX.adobeaemcloud.com';
export const PUBLISH_FASTLY_BACKEND = env("PUBLISH_FASTLY_BACKEND") || '';

// IMS-related constants
// TODO: THIS AND THE ABOVE DO NOT WORK - DOES NOT GET THE VALUE FROM FASTLY.TOML
export const IMS_FASTLY_BACKEND = env("IMS_FASTLY_BACKEND") || 'ims-prod';
export const IMS_URL = 'https://ims-na1.adobelogin.com/ims/token/v3';

// API endpoint paths
export const API_BASE_PATH = '/bin/api';

// MCP transport endpoint
export const MCP_TRANSPORT_PATH = '/mcp-boilerplate';

export const API_ENDPOINTS = {
  CONTENT_AI: `/adobe/experimental/contentai-expires-20251231/contentAI/search`,
  CF_SEARCH: `/adobe/sites/cf/fragments/search`
} as const;

// Search
export const SEARCH_INDEX_NAME = 'llm-conversion-accelerator-mcp';

// ===============================
// HTTP CONSTANTS
// ===============================

// HTTP Methods
export const HTTP_METHOD_GET = 'GET';
export const HTTP_METHOD_POST = 'POST';

// Content Type constants
export const CONTENT_TYPE_JSON = 'application/json';
export const CONTENT_TYPE_FORM_URLENCODED = 'application/x-www-form-urlencoded';

// HTTP Header names
export const HEADER_CONTENT_TYPE = 'Content-Type';
export const HEADER_ACCEPT = 'Accept';
export const HEADER_USER_AGENT = 'AEM-Edge-MCP';
export const HEADER_MCP_SESSION_ID = 'mcp-session-id';

// Common header values
type HeadersType = { [key: string]: string };
export const HEADERS_COMMON: HeadersType = {
  [HEADER_ACCEPT]: CONTENT_TYPE_JSON,
  [HEADER_USER_AGENT]: USER_AGENT
};

export const HEADERS_JSON: HeadersType = {
  ...HEADERS_COMMON,
  [HEADER_CONTENT_TYPE]: CONTENT_TYPE_JSON
};

export const HEADERS_FORM: HeadersType = {
  ...HEADERS_COMMON,
  [HEADER_CONTENT_TYPE]: CONTENT_TYPE_FORM_URLENCODED
}; 