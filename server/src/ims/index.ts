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

import { IMS_URL, IMS_FASTLY_BACKEND } from "../constants";
import { SimpleCache } from 'fastly:cache';

/**
 * IMS (Identity Management System) class for handling Adobe IMS token operations
 */
export class IMS {
  private clientId: string;
  private clientSecret: string;
  private scope: string;

  /**
   * Creates an instance of IMS
   * @param clientId - The IMS client ID
   * @param clientSecret - The IMS client secret
   * @param scope - The IMS token scope
   */
  constructor(clientId: string, clientSecret: string, scope: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.scope = scope;
  }

  /**
   * Fetches an IMS access token using client credentials flow
   * @returns Promise<string> The access token
   * @throws Error if token fetch fails
   */
  async fetchToken(): Promise<string> {
    const imsTokenUrl = IMS_URL;
    const imsParams = {
      grant_type: "client_credentials",
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: this.scope
    };

    const cacheKey = `${this.clientId}-${this.scope}`;
    console.log(`[IMS] Checking cache for key: ${cacheKey}`);
    
    let accessToken = SimpleCache.get(cacheKey);
    if (accessToken) {
      console.log(`[IMS] Cache hit for key: ${cacheKey}`);
      return await accessToken.text();
    }

    const imsBody = new URLSearchParams(imsParams).toString();
    const imsFetchOptions: any = {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: imsBody,
      backend: IMS_FASTLY_BACKEND
    };
    console.log(`[IMS] Fetching token from IMS URL: ${imsTokenUrl}`);
    const imsResponse = await fetch(imsTokenUrl, imsFetchOptions);

    if (!imsResponse.ok) {
      const errorText = await imsResponse.text();
      const errorMsg = `IMS token request failed: ${imsResponse.status} ${imsResponse.statusText} - ${errorText}`;
      console.error(`[IMS] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    const imsData = await imsResponse.json();
    // subtract 1 hour from expires_in, default to 1 hour
    const expiresIn = imsData?.expires_in ? imsData.expires_in - 3600 : 3600; 
    
    SimpleCache.set(cacheKey, imsData.access_token, expiresIn);

    if (!imsData.access_token) {
      const errorMsg = "IMS token response missing access_token";
      console.error(`[IMS] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    console.log(`[IMS] Successfully fetched IMS token.`);
    
    return imsData.access_token;
  }
} 