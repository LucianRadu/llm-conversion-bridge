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

export function logRequestDetails(tool: string, url: string, options: any, backendMode: string) {
  console.log(`[${tool}] REQUEST DETAILS:`);
  console.log(`[${tool}]   URL: ${url}`);
  console.log(`[${tool}]   Method: ${options.method}`);
  console.log(`[${tool}]   Backend Mode: ${backendMode}`);
  if (options.headers) {
    const headersToLog = { ...options.headers };
    // Find authorization key case-insensitively and redact its value
    for (const key in headersToLog) {
      if (key.toLowerCase() === 'authorization') {
        headersToLog[key] = headersToLog[key] ? '[PRESENT]' : '[NOT PRESENT]';
      }
    }
    console.log(`[${tool}]   Headers: ${JSON.stringify(headersToLog, null, 2)}`);
  }
  if (options.body) {
    console.log(`[${tool}]   Body: ${options.body}`);
  }
  if (options.backend) {
    console.log(`[${tool}]   Backend: ${options.backend}`);
  }
}

export function logResponseHeaders(tool: string, response: Response) {
  console.log(`[${tool}] RESPONSE DETAILS:`);
  console.log(`[${tool}]   Status: ${response.status} ${response.statusText}`);
  console.log(`[${tool}]   Response Headers:`);
  for (const [key, value] of response.headers.entries()) {
    console.log(`[${tool}]     ${key}: ${value}`);
  }
} 