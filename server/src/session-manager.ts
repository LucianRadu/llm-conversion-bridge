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

/**
 * Manages MCP session lifecycle using Fastly's SimpleCache with automatic TTL expiration.
 * This prevents indefinite session growth by automatically cleaning up expired sessions.
 */
export class SessionManager {
  private readonly sessionTTL: number;

  /**
   * Creates a new SessionManager instance.
   * @param ttlSeconds Session time-to-live in seconds. Defaults to 900 (15 minutes).
   */
  constructor(ttlSeconds: number = 900) { // 15 minutes default
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
   * @param sessionId The session identifier to check
   * @returns Promise<boolean> True if session exists, false otherwise
   */
  async getSession(sessionId: string): Promise<boolean> {
    try {
      const sessionExists = await SimpleCache.get(sessionId);
      return !!sessionExists;
    } catch (error) {
      logger.error('Error getting session:', error);
      return false;
    }
  }

  /**
   * Creates or updates a session with the configured TTL.
   * @param sessionId The session identifier to create/update
   */
  async setSession(sessionId: string): Promise<void> {
    try {
      await SimpleCache.getOrSet(sessionId, async () => ({
        value: 'active',
        ttl: this.sessionTTL
      }));
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