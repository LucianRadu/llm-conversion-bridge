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
import { BUILD_TIME_ENV } from "./env-constants";

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
export const MCP_REQUEST_TIMEOUT = 30000; // 30 seconds

/**
 * MCP transport endpoint path
 * Extracted from AEM_COMPUTE_SERVICE environment variable at runtime
 * Format: p<project>-e<env>-<service-name> → /<service-name>
 * 
 * IMPORTANT: This is a function to defer evaluation until runtime (not during WASM build)
 * Call this function instead of using a constant
 */
let _mcpTransportPath: string | null = null;
export function getMCP_TRANSPORT_PATH(): string {
  if (_mcpTransportPath !== null) {
    return _mcpTransportPath;
  }
  
  // Try runtime env() first (works in production Fastly Compute@Edge)
  // Fall back to build-time constant (works in local Viceroy)
  const envValue = env("AEM_COMPUTE_SERVICE") || BUILD_TIME_ENV.AEM_COMPUTE_SERVICE;
  
  if (!envValue) {
    throw new Error(
      'AEM_COMPUTE_SERVICE environment variable is required. ' +
      'Format: p<project>-e<env>-<service-name>'
    );
  }
  
  // Extract service name after second dash: pXXXXXX-eXXXXXX-<service-name>
  const match = envValue.match(/^[^-]+-[^-]+-(.+)$/);
  if (!match) {
    throw new Error(
      `Invalid AEM_COMPUTE_SERVICE format: "${envValue}". ` +
      'Expected format: p<project>-e<env>-<service-name>'
    );
  }
  
  _mcpTransportPath = `/${match[1]}`;
  return _mcpTransportPath;
}

/**
 * MCP session time-to-live in seconds (30 minutes)
 */
export const SESSION_TTL_SECONDS = 1800; // 30 minutes 