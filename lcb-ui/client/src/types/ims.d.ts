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
 * TypeScript declarations for Adobe IMS Thin Library
 *
 * IMS Thin is a lightweight authentication library providing:
 * - User sign-in/sign-out
 * - Access token retrieval
 * - Fragment value parsing (OAuth redirect parameters)
 */

/**
 * Token Information returned by IMS
 */
export interface ITokenInformation {
  token: string;
  expire: string;
  sid: string;
  userId?: string;
  impersonatorId?: string;
}

/**
 * IMS Configuration for adobeid object
 */
export interface AdobeIdConfig {
  client_id: string;
  scope: string;
  environment?: string;
  locale?: string;
  api_parameters?: {
    authorize?: {
      redirect_uri: string;
    };
  };
  onAccessToken?: (token: ITokenInformation) => void;
  onAccessTokenHasExpired?: () => void;
  onReady?: () => void;
  onError?: (error: any) => void;
}

/**
 * Adobe IMS Thin Library API
 *
 * Lightweight library with minimal footprint for token-only auth.
 * Loaded via CDN: https://auth-stg1.services.adobe.com/imslib/imslib-thin.js
 */
export interface AdobeIMSThin {
  /**
   * Initialize the IMS library
   * Must be called after setting window.adobeid configuration
   */
  initialize(): void;

  /**
   * Check if user is signed in
   * @returns true if user has a valid access token
   */
  isSignedInUser(): boolean;

  /**
   * Get the current access token
   * @returns Token information or null if not signed in
   */
  getAccessToken(): ITokenInformation | null;

  /**
   * Get fragment values from URL (OAuth redirect parameters)
   * @returns Object with OAuth parameters (access_token, token_type, expires_in, etc.)
   */
  fragmentValues(): Record<string, string> | null;

  /**
   * Sign in the user
   * Opens OAuth flow in popup or redirect
   * @param params Optional sign-in parameters
   * @param nonce Optional nonce for CSRF protection
   */
  signIn(params?: any, nonce?: string): void;

  /**
   * Sign out the user
   * Clears access token and session
   */
  signOut(): void;
}

/**
 * IMS Factory interface
 * The IMS Thin library exposes a factory that creates IMS instances
 */
export interface AdobeImsFactory {
  /**
   * Creates an IMS library instance
   * @returns IMS Thin library instance
   */
  createIMSLib(): AdobeIMSThin;
}

/**
 * Global Window interface augmentation
 * Adds Adobe IMS library to window object
 */
declare global {
  interface Window {
    /**
     * IMS Configuration object
     * Set this before calling adobeImsFactory.createIMSLib()
     */
    adobeid?: AdobeIdConfig;

    /**
     * IMS Factory
     * Available after CDN script is loaded
     * Use createIMSLib() to create an IMS instance
     */
    adobeImsFactory?: AdobeImsFactory;

    /**
     * IMS Thin Library instance (legacy, not used with factory pattern)
     * Available after CDN script is loaded
     */
    adobeIMSThin?: AdobeIMSThin;
  }
}

export {};
