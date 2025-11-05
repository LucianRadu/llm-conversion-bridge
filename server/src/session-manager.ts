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
  logSessionStats(): void {
    logger.info(`Session operation completed - using SimpleCache with ${this.sessionTTL}s TTL`);
  }

  /**
   * Checks if a session exists and is valid (not expired).
   * @param sessionId The session identifier to check
   * @returns boolean True if session exists, false otherwise
   */
  getSession(sessionId: string): boolean {
    try {
      logger.info(`SessionManager: Checking session ${sessionId}`);
      const sessionExists = SimpleCache.get(sessionId);
      const exists = !!sessionExists;
      logger.info(`SessionManager: Session ${sessionId} exists=${exists}`);
      return exists;
    } catch (error) {
      logger.error(`SessionManager: Error getting session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Creates or updates a session with the configured TTL.
   * @param sessionId The session identifier to create/update
   */
  setSession(sessionId: string): void {
    try {
      logger.info(`SessionManager: Creating session ${sessionId} with TTL=${this.sessionTTL}s`);
      
      // SimpleCache.set is synchronous and takes TTL as third parameter
      SimpleCache.set(sessionId, 'active', this.sessionTTL);
      
      logger.info(`SessionManager: Session ${sessionId} created successfully`);
      
      // Verify the session was set by immediately trying to get it
      const verification = SimpleCache.get(sessionId);
      logger.info(`SessionManager: Session ${sessionId} verification read: ${verification ? 'SUCCESS' : 'FAILED'}`);
    } catch (error) {
      logger.error(`SessionManager: Error setting session ${sessionId}:`, error);
      throw error; // Re-throw to surface the error
    }
  }

  /**
   * Immediately removes a session from the cache.
   * @param sessionId The session identifier to delete
   */
  deleteSession(sessionId: string): void {
    try {
      logger.info(`SessionManager: Deleting session ${sessionId}`);
      SimpleCache.purge(sessionId);
      logger.info(`SessionManager: Session ${sessionId} deleted successfully`);
    } catch (error) {
      logger.error(`SessionManager: Error deleting session ${sessionId}:`, error);
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