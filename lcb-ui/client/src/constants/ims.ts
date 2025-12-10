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
 * Adobe Identity Management Services (IMS) Configuration
 *
 * Production environment configuration for IMS authentication.
 * Using IMS Thin library for lightweight, token-only authentication.
 */

export const IMS_CONFIG = {
  /**
   * Client ID from Adobe IMS Console (Production environment)
   * Client Name: "llm-conversion-bridge"
   */
  CLIENT_ID: 'llm-conversion-bridge',

  /**
   * IMS Environment
   * prod = Production environment
   * Note: Using prod environment but stage CDN as prod library is not publicly accessible
   */
  ENVIRONMENT: 'prod' as const,

  /**
   * CDN URL for IMS Thin library
   * Lightweight version with minimal footprint (signIn, signOut, token access only)
   * Using stage CDN as production library is not publicly accessible
   */
  CDN_URL: 'https://auth-stg1.services.adobe.com/imslib/imslib-thin.js',

  /**
   * OAuth Scopes
   * - AdobeID: Basic Adobe ID authentication
   * - openid: OpenID Connect support
   */
  SCOPE: 'AdobeID,openid',

  /**
   * OAuth Redirect URI
   * Must match exactly what's configured in IMS Console
   * Uses HTTPS as required by IMS
   */
  REDIRECT_URI: `https://localhost:${import.meta.env.LCB_UI_FRONTEND_PORT || '4545'}/auth/callback`,

  /**
   * IMS API Endpoints
   * Production: https://ims-na1.adobelogin.com
   * Validate endpoint: https://ims-na1.adobelogin.com/ims/validate_token/v1
   */
  API_BASE_URL: 'https://ims-na1.adobelogin.com',

  /**
   * Token Storage Key
   * Used to store authentication context in sessionStorage
   */
  STORAGE_KEY: 'lcb-ims-auth-context',
} as const;

/**
 * IMS Configuration Type
 */
export type IMSConfig = typeof IMS_CONFIG;
