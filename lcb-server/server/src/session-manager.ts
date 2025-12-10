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

/// <reference types="@fastly/js-compute" />

import { SimpleCache } from 'fastly:cache';
import { logger } from './utils/logger';
import { SESSION_TTL_SECONDS } from './constants/mcp';

/**
 * Manages MCP session lifecycle using Fastly's SimpleCache with automatic TTL expiration.
 * This prevents indefinite session growth by automatically cleaning up expired sessions.
 * Implements sliding window TTL: each access resets the expiration timer.
 */
export class SessionManager {
  private readonly sessionTTL: number;

  /**
   * Creates a new SessionManager instance.
   * @param ttlSeconds Session time-to-live in seconds. Defaults to SESSION_TTL_SECONDS (30 minutes).
   */
  constructor(ttlSeconds: number = SESSION_TTL_SECONDS) {
    this.sessionTTL = ttlSeconds;
  }

  /**
   * Logs session operation statistics.
   * Note: SimpleCache doesn't provide enumeration, so we log operations rather than counts.
   */
  async logSessionStats(): Promise<void> {
    logger.info(`Session operation completed - using SimpleCache with ${this.sessionTTL}s TTL`);
  }

  /**
   * Checks if a session exists and is valid (not expired).
   * Implements sliding window: automatically refreshes TTL on each access.
   * @param sessionId The session identifier to check
   * @returns Promise<boolean> True if session exists, false otherwise
   */
  async getSession(sessionId: string): Promise<boolean> {
    try {
      const sessionExists = await SimpleCache.get(sessionId);
      if (sessionExists) {
        // Sliding window: refresh TTL by re-setting the session
        // This extends expiration by another SESSION_TTL_SECONDS from now
        await this.setSession(sessionId);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error getting session:', error);
      return false;
    }
  }

  /**
   * Creates or updates a session with the configured TTL.
   * Uses SimpleCache.set() to force TTL updates on existing sessions.
   * This ensures sliding window TTL works correctly - each call resets the expiration.
   * @param sessionId The session identifier to create/update
   */
  async setSession(sessionId: string): Promise<void> {
    try {
      // Use set() instead of getOrSet() to force TTL update on existing sessions
      // getOrSet() would only set if key doesn't exist, leaving old TTL unchanged
      // SimpleCache.set(key, value, ttlSeconds)
      await SimpleCache.set(sessionId, 'active', this.sessionTTL);
    } catch (error) {
      logger.error('Error setting session:', error);
    }
  }

  /**
   * Immediately removes a session from the cache.
   * @param sessionId The session identifier to delete
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      await SimpleCache.purge(sessionId, { scope: "global" });
    } catch (error) {
      logger.error('Error deleting session:', error);
    }
  }

  /**
   * Gets the configured session TTL.
   * @returns The session TTL in seconds
   */
  getTTL(): number {
    return this.sessionTTL;
  }
} 