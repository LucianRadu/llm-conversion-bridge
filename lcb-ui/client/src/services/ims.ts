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

import { IMS_CONFIG } from '../constants/ims';
import { STORAGE_KEYS } from '../constants/storage';
import { encryptObject, decryptObject } from '../utils/encryption';
import type { AdobeIdConfig, ITokenInformation, AdobeIMSThin } from '../types/ims';

/**
 * Authentication Context
 * Stored context for restoring state after OAuth redirect
 */
interface AuthContext {
  returnPath: string;
  timestamp: number;
}

/**
 * IMS Service
 *
 * Singleton service for managing Adobe IMS authentication.
 * Provides methods for:
 * - Loading IMS Thin library from CDN
 * - Checking authentication status
 * - Signing in/out users
 * - Retrieving access tokens
 * - Managing authentication context across redirects
 */
class IMSService {
  private static instance: IMSService;
  private libraryLoaded = false;
  private libraryLoading = false;
  private loadPromise: Promise<void> | null = null;
  private imsInstance: AdobeIMSThin | null = null;
  private accessToken: ITokenInformation | null = null;
  private tokenCallbacks: Array<(token: ITokenInformation) => void> = [];

  // Mock authentication support
  private mockMode = false;
  private mockToken: ITokenInformation | null = null;

  private constructor() {
    // Private constructor for singleton pattern
    // Load real token from storage if available
    this.loadTokenFromStorage();
    // Check if mock mode was enabled
    this.loadMockModeFromStorage();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): IMSService {
    if (!IMSService.instance) {
      IMSService.instance = new IMSService();
    }
    return IMSService.instance;
  }

  /**
   * Load IMS Thin library from CDN
   * @returns Promise that resolves when library is loaded and initialized
   */
  public async loadLibrary(): Promise<void> {
    // Return existing promise if already loading
    if (this.libraryLoading && this.loadPromise) {
      return this.loadPromise;
    }

    // Return immediately if already loaded
    if (this.libraryLoaded && this.imsInstance) {
      return Promise.resolve();
    }

    this.libraryLoading = true;

    this.loadPromise = new Promise((resolve, reject) => {
      try {
        // Check if script already exists
        const existingScript = document.querySelector(
          `script[src="${IMS_CONFIG.CDN_URL}"]`
        );

        if (existingScript) {
          // Script exists, check if IMS factory is ready
          if (window.adobeImsFactory) {
            this.initializeIMS();
            this.libraryLoaded = true;
            this.libraryLoading = false;
            resolve();
            return;
          }
        }

        // Create script element
        const script = document.createElement('script');
        script.src = IMS_CONFIG.CDN_URL;
        script.async = true;

        script.onload = () => {
          console.log('[IMS Service] Library loaded from CDN');

          // Wait for adobeImsFactory to be available
          const checkInterval = setInterval(() => {
            if (window.adobeImsFactory) {
              clearInterval(checkInterval);
              clearTimeout(timeoutId);

              // Initialize IMS instance from factory
              this.initializeIMS();

              this.libraryLoaded = true;
              this.libraryLoading = false;
              console.log('[IMS Service] Library initialized');
              resolve();
            }
          }, 100);

          // Timeout after 5 seconds
          const timeoutId = setTimeout(() => {
            clearInterval(checkInterval);
            if (!this.libraryLoaded) {
              this.libraryLoading = false;
              reject(new Error('IMS library initialization timeout'));
            }
          }, 5000);
        };

        script.onerror = () => {
          this.libraryLoading = false;
          const error = new Error('Failed to load IMS library from CDN');
          console.error('[IMS Service]', error);
          reject(error);
        };

        // Append script to document
        document.head.appendChild(script);
      } catch (error) {
        this.libraryLoading = false;
        console.error('[IMS Service] Error loading library:', error);
        reject(error);
      }
    });

    return this.loadPromise;
  }

  /**
   * Initialize IMS instance from factory
   * Creates the IMS instance using adobeImsFactory.createIMSLib()
   */
  private initializeIMS(): void {
    if (!window.adobeImsFactory) {
      throw new Error('IMS factory not available');
    }

    // Configure IMS before creating instance
    this.configureIMS();

    // Create IMS instance from factory
    this.imsInstance = window.adobeImsFactory.createIMSLib();
    console.log('[IMS Service] IMS instance created from factory');

    // Initialize the instance
    this.imsInstance.initialize();
    console.log('[IMS Service] IMS instance initialized');
  }

  /**
   * Configure IMS library
   * Sets window.adobeid configuration object
   */
  private configureIMS(): void {
    const config: AdobeIdConfig = {
      client_id: IMS_CONFIG.CLIENT_ID,
      scope: IMS_CONFIG.SCOPE,
      environment: IMS_CONFIG.ENVIRONMENT,
      api_parameters: {
        authorize: {
          redirect_uri: IMS_CONFIG.REDIRECT_URI,
        },
      },
      onReady: () => {
        console.log('[IMS Service] IMS ready');
      },
      onAccessToken: (token: ITokenInformation) => {
        // Store the token when received from IMS
        this.accessToken = token;
        console.log('[IMS Service] Access token received and stored', {
          expire: token.expire,
          userId: token.userId,
          hasToken: !!this.accessToken,
        });

        // Save real token to localStorage for persistence
        this.saveTokenToStorage(token);

        // Notify all registered callbacks
        this.tokenCallbacks.forEach(callback => callback(token));
        this.tokenCallbacks = []; // Clear after calling
      },
      onAccessTokenHasExpired: () => {
        console.log('[IMS Service] Access token expired');
        // Clear stored token when it expires
        this.accessToken = null;

        // Remove expired token from localStorage
        try {
          localStorage.removeItem(STORAGE_KEYS.REAL_IMS_TOKEN);
          console.log('[IMS Service] Expired token removed from localStorage');
        } catch (error) {
          console.error('[IMS Service] Failed to remove expired token:', error);
        }
      },
      onError: (error: any) => {
        console.error('[IMS Service] IMS error:', error);
      },
    };

    window.adobeid = config;
    console.log('[IMS Service] Configuration set', {
      clientId: config.client_id,
      environment: config.environment,
      redirectUri: config.api_parameters?.authorize?.redirect_uri,
    });
  }

  /**
   * Check if user is authenticated
   * @returns true if user has valid access token (real or mock)
   */
  public isAuthenticated(): boolean {
    if (this.mockMode && this.mockToken) {
      return true;
    }
    return this.accessToken !== null;
  }

  /**
   * Get current access token
   * @returns Token information or null if not authenticated
   */
  public getAccessToken(): ITokenInformation | null {
    // Return real token if available (even in mock mode)
    if (this.accessToken) {
      return this.accessToken;
    }
    // Fall back to mock token if in mock mode
    if (this.mockMode && this.mockToken) {
      return this.mockToken;
    }
    return null;
  }

  /**
   * Sign in user
   * Opens OAuth flow (popup or redirect based on IMS config)
   * @param context Optional context to restore after redirect (e.g., return path)
   */
  public signIn(context?: AuthContext): void {
    if (!this.libraryLoaded || !this.imsInstance) {
      throw new Error('IMS library not loaded');
    }

    // Store context for restoration after redirect
    if (context) {
      this.saveAuthContext(context);
    }

    console.log('[IMS Service] Initiating sign-in');
    this.imsInstance.signIn();
  }

  /**
   * Sign out user
   * Clears access token and session
   */
  public signOut(): void {
    if (!this.libraryLoaded || !this.imsInstance) {
      return;
    }

    console.log('[IMS Service] Signing out');
    this.imsInstance.signOut();

    // Clear stored token from memory
    this.accessToken = null;

    // Clear token from localStorage
    try {
      localStorage.removeItem(STORAGE_KEYS.REAL_IMS_TOKEN);
      console.log('[IMS Service] Real token removed from localStorage');
    } catch (error) {
      console.error('[IMS Service] Failed to remove token from localStorage:', error);
    }

    // Clear mock mode if active
    this.disableMockAuth();

    // Clear auth context
    this.clearAuthContext();
  }

  /**
   * Complete logout
   * Clears ALL authentication data (real tokens, mock tokens, auth context)
   * Use this for full logout with redirect
   *
   * NOTE: Does NOT call imsInstance.signOut() to avoid redirect loop.
   * The IMS signOut() method redirects to Adobe IMS logout, which then
   * redirects back to /auth/callback, causing the AuthCallbackPage to show
   * an error since tokens are already cleared.
   */
  public logout(): void {
    console.log('[IMS Service] Performing complete logout');

    // Skip calling imsInstance.signOut() to avoid redirect loop
    // We only need to clear local tokens, not perform Adobe IMS server logout

    // Clear memory
    this.accessToken = null;
    this.mockToken = null;
    this.mockMode = false;

    // Clear localStorage (real token)
    try {
      localStorage.removeItem(STORAGE_KEYS.REAL_IMS_TOKEN);
      console.log('[IMS Service] Real token removed from localStorage');
    } catch (error) {
      console.error('[IMS Service] Failed to remove token from localStorage:', error);
    }

    // Clear sessionStorage (mock mode, auth context)
    try {
      sessionStorage.removeItem(STORAGE_KEYS.MOCK_AUTH_MODE);
      sessionStorage.removeItem(IMS_CONFIG.STORAGE_KEY);
      console.log('[IMS Service] Mock mode and auth context removed from sessionStorage');
    } catch (error) {
      console.error('[IMS Service] Failed to remove from sessionStorage:', error);
    }

    console.log('[IMS Service] Complete logout finished - all tokens cleared');
  }

  /**
   * Get fragment values from OAuth redirect
   * @returns OAuth parameters or null
   */
  public getFragmentValues(): Record<string, string> | null {
    if (!this.libraryLoaded || !this.imsInstance) {
      return null;
    }

    return this.imsInstance.fragmentValues();
  }

  /**
   * Save authentication context to sessionStorage
   * @param context Context to save
   */
  private saveAuthContext(context: AuthContext): void {
    try {
      sessionStorage.setItem(
        IMS_CONFIG.STORAGE_KEY,
        JSON.stringify(context)
      );
      console.log('[IMS Service] Auth context saved', context);
    } catch (error) {
      console.error('[IMS Service] Failed to save auth context:', error);
    }
  }

  /**
   * Get authentication context from sessionStorage
   * @returns Saved context or null
   */
  public getAuthContext(): AuthContext | null {
    try {
      const stored = sessionStorage.getItem(IMS_CONFIG.STORAGE_KEY);
      if (!stored) {
        return null;
      }

      const context = JSON.parse(stored) as AuthContext;
      console.log('[IMS Service] Auth context retrieved', context);
      return context;
    } catch (error) {
      console.error('[IMS Service] Failed to get auth context:', error);
      return null;
    }
  }

  /**
   * Clear authentication context from sessionStorage
   */
  public clearAuthContext(): void {
    try {
      sessionStorage.removeItem(IMS_CONFIG.STORAGE_KEY);
      console.log('[IMS Service] Auth context cleared');
    } catch (error) {
      console.error('[IMS Service] Failed to clear auth context:', error);
    }
  }

  /**
   * Wait for access token to be received
   * Returns a promise that resolves when onAccessToken callback fires
   * @param timeout Maximum time to wait in milliseconds (default: 10000)
   * @returns Promise that resolves with token information
   */
  public waitForToken(timeout: number = 10000): Promise<ITokenInformation> {
    // If already authenticated, return immediately
    if (this.accessToken) {
      console.log('[IMS Service] Token already available');
      return Promise.resolve(this.accessToken);
    }

    console.log('[IMS Service] Waiting for token callback...');

    // Otherwise, wait for callback
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        console.error(
          `[IMS Service] Token timeout - no token received within ${timeout}ms`
        );
        reject(
          new Error(`Token timeout - no token received within ${timeout}ms`)
        );
      }, timeout);

      this.tokenCallbacks.push((token) => {
        clearTimeout(timeoutId);
        console.log('[IMS Service] Token received via callback');
        resolve(token);
      });
    });
  }

  /**
   * Process fragment values from OAuth redirect
   * Manually extracts and stores token from URL fragment
   * Call this after OAuth redirect when onAccessToken callback doesn't fire
   * @returns true if token was found and stored
   */
  public processFragmentToken(): boolean {
    if (!this.libraryLoaded || !this.imsInstance) {
      console.error('[IMS Service] Cannot process fragment - library not loaded');
      return false;
    }

    const fragmentValues = this.imsInstance.fragmentValues();

    if (!fragmentValues || !fragmentValues.access_token) {
      console.log('[IMS Service] No access token in fragment');
      return false;
    }

    console.log('[IMS Service] Processing fragment token manually');

    // Calculate expiration timestamp
    // NOTE: Adobe IMS returns expires_in in MILLISECONDS (not seconds as per RFC 6749)
    // This is confirmed by Adobe's own imslib implementation (TokenService.ts:328)
    // and verified with actual token expiration (e.g., 28371841ms = ~8 hours)
    const expiresInMs = parseInt(fragmentValues.expires_in) || 0;
    const expireDate = new Date(Date.now() + expiresInMs);

    // Create token information object
    const tokenInfo: ITokenInformation = {
      token: fragmentValues.access_token,
      expire: expireDate.toISOString(),
      // sid is not available in OAuth fragment values
      // In Adobe IMS, sid is extracted from the decoded JWT token payload
      // Since we're using Thin library for simplicity, leave sid empty
      sid: '',
      userId: undefined,
      impersonatorId: undefined,
    };

    // Store the token
    this.accessToken = tokenInfo;

    console.log('[IMS Service] Fragment token processed and stored', {
      expire: tokenInfo.expire,
      hasToken: !!this.accessToken,
    });

    // Save real token to localStorage for persistence
    this.saveTokenToStorage(tokenInfo);

    // Notify any waiting callbacks
    this.tokenCallbacks.forEach(callback => callback(tokenInfo));
    this.tokenCallbacks = [];

    return true;
  }

  /**
   * Save token to localStorage for persistence across page refreshes
   * Token is encrypted before storage for security
   * @param token Token information to save
   */
  private saveTokenToStorage(token: ITokenInformation): void {
    try {
      const encrypted = encryptObject(token);
      localStorage.setItem(STORAGE_KEYS.REAL_IMS_TOKEN, encrypted);
      console.log('[IMS Service] Real token encrypted and saved to localStorage');
    } catch (error) {
      console.error('[IMS Service] Failed to save token to localStorage:', error);
    }
  }

  /**
   * Load token from localStorage
   * Token is decrypted after loading
   * Called on service initialization
   */
  private loadTokenFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.REAL_IMS_TOKEN);
      if (stored) {
        // Decrypt token
        const token = decryptObject<ITokenInformation>(stored);

        if (!token) {
          console.error('[IMS Service] Failed to decrypt token, removing');
          localStorage.removeItem(STORAGE_KEYS.REAL_IMS_TOKEN);
          return;
        }

        // Check if token is expired
        const expireDate = new Date(token.expire);
        const now = new Date();

        if (expireDate > now) {
          this.accessToken = token;
          console.log('[IMS Service] Real token decrypted and loaded from localStorage', {
            expire: token.expire,
            isValid: true,
          });
        } else {
          console.log('[IMS Service] Stored token expired, removing', {
            expire: token.expire,
          });
          localStorage.removeItem(STORAGE_KEYS.REAL_IMS_TOKEN);
        }
      }
    } catch (error) {
      console.error('[IMS Service] Failed to load token from localStorage:', error);
    }
  }

  /**
   * Load mock mode state from sessionStorage
   */
  private loadMockModeFromStorage(): void {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEYS.MOCK_AUTH_MODE);
      if (stored === 'true') {
        // Re-enable mock mode and generate new token
        this.mockMode = true;
        this.generateMockToken();
        console.log('[IMS Service] Mock mode restored from sessionStorage');
      }
    } catch (error) {
      console.error('[IMS Service] Failed to load mock mode from sessionStorage:', error);
    }
  }

  /**
   * Check if mock authentication mode is active
   * @returns true if mock mode is enabled
   */
  public isMockMode(): boolean {
    return this.mockMode;
  }

  /**
   * Check if real authentication exists (token in storage or memory)
   * @returns true if real IMS token is available
   */
  public hasRealAuthentication(): boolean {
    // Check memory first
    if (this.accessToken !== null) {
      return true;
    }

    // Check localStorage (decrypt token)
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.REAL_IMS_TOKEN);
      if (stored) {
        const token = decryptObject<ITokenInformation>(stored);
        if (!token) {
          return false;
        }
        const expireDate = new Date(token.expire);
        const now = new Date();
        return expireDate > now;
      }
    } catch (error) {
      console.error('[IMS Service] Failed to check real authentication:', error);
    }

    return false;
  }

  /**
   * Enable mock authentication mode
   * Generates a mock token for testing purposes
   */
  public enableMockAuth(): void {
    this.mockMode = true;
    this.generateMockToken();

    // Save to sessionStorage
    try {
      sessionStorage.setItem(STORAGE_KEYS.MOCK_AUTH_MODE, 'true');
      console.log('[IMS Service] Mock authentication enabled');
    } catch (error) {
      console.error('[IMS Service] Failed to save mock mode to sessionStorage:', error);
    }
  }

  /**
   * Disable mock authentication mode
   * Clears mock token and restores real authentication if available
   */
  public disableMockAuth(): void {
    this.mockMode = false;
    this.mockToken = null;

    // Remove from sessionStorage
    try {
      sessionStorage.removeItem(STORAGE_KEYS.MOCK_AUTH_MODE);
      console.log('[IMS Service] Mock authentication disabled');

      // If real token exists in storage, reload it
      if (!this.accessToken) {
        this.loadTokenFromStorage();
      }
    } catch (error) {
      console.error('[IMS Service] Failed to remove mock mode from sessionStorage:', error);
    }
  }

  /**
   * Generate a realistic mock token for testing
   * Matches the structure of real IMS tokens
   */
  private generateMockToken(): void {
    const now = Date.now();
    const expireDate = new Date(now + 86400000); // 24 hours from now

    this.mockToken = {
      token: 'eyJhbGciOiJSUzI1NiIsIng1dSI6Imltc19uYTEta2V5LTEuY2VyIiwidHlwIjoiSldUIiwia2lkIjoiaW1zX25hMS1rZXktMSJ9.MOCK_TOKEN_FOR_TESTING_DO_NOT_USE_IN_PRODUCTION_THIS_IS_A_SIMULATED_AUTHENTICATION_TOKEN.' + btoa(JSON.stringify({ mockMode: true, generated: now })),
      expire: expireDate.toISOString(),
      sid: `v2-v0.48.0-1-mock-${Math.random().toString(36).substring(2, 10)}`,
      userId: 'mock-user-12345@AdobeID',
      impersonatorId: undefined,
    };

    console.log('[IMS Service] Mock token generated', {
      expire: this.mockToken.expire,
      sid: this.mockToken.sid,
    });
  }
}

/**
 * Export singleton instance
 */
export const imsService = IMSService.getInstance();
