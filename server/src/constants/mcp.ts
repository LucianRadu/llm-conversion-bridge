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

/**
 * Standard JSON-RPC error codes as defined in the specification
 */
export enum ErrorCode {
  // Standard JSON-RPC error codes
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
}

/**
 * JSON-RPC version used in MCP
 */
export const JSON_RPC_VERSION = '2.0';

/**
 * MCP request timeout in milliseconds
 */
export const MCP_REQUEST_TIMEOUT = 60000; // 60 seconds (increased for slow AEM search API)

/**
 * MCP transport endpoint path
 */
export const MCP_TRANSPORT_PATH = '/mcp-boilerplate'; 