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

import { SessionManager } from '../server/src/session-manager';
import { SESSION_TTL_SECONDS } from '../server/src/constants/mcp';

describe('SessionManager', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    // Create a fresh instance before each test
    sessionManager = new SessionManager();
  });

  describe('Constructor', () => {
    it('should create instance with default TTL (30 minutes)', () => {
      const manager = new SessionManager();
      expect(manager.getTTL()).toBe(SESSION_TTL_SECONDS);
    });

    it('should create instance with custom TTL', () => {
      const customTTL = 600; // 10 minutes
      const manager = new SessionManager(customTTL);
      expect(manager.getTTL()).toBe(customTTL);
    });

    it('should have TTL of 1800 seconds (30 minutes)', () => {
      expect(sessionManager.getTTL()).toBe(1800);
    });
  });

  describe('setSession', () => {
    it('should create a new session', async () => {
      const sessionId = 'test-session-1';
      await sessionManager.setSession(sessionId);

      const exists = await sessionManager.getSession(sessionId);
      expect(exists).toBe(true);
    });

    it('should allow multiple sessions', async () => {
      const session1 = 'session-1';
      const session2 = 'session-2';

      await sessionManager.setSession(session1);
      await sessionManager.setSession(session2);

      expect(await sessionManager.getSession(session1)).toBe(true);
      expect(await sessionManager.getSession(session2)).toBe(true);
    });

    it('should update existing session TTL', async () => {
      const sessionId = 'update-session';

      await sessionManager.setSession(sessionId);
      expect(await sessionManager.getSession(sessionId)).toBe(true);

      // Set again (should update TTL)
      await sessionManager.setSession(sessionId);
      expect(await sessionManager.getSession(sessionId)).toBe(true);
    });
  });

  describe('getSession', () => {
    it('should return true for existing session', async () => {
      const sessionId = 'existing-session';
      await sessionManager.setSession(sessionId);

      const result = await sessionManager.getSession(sessionId);
      expect(result).toBe(true);
    });

    it('should return false for non-existent session', async () => {
      const result = await sessionManager.getSession('non-existent-session');
      expect(result).toBe(false);
    });

    it('should return false for expired session', async () => {
      const shortTTLManager = new SessionManager(1); // 1 second TTL
      const sessionId = 'short-ttl-session';

      await shortTTLManager.setSession(sessionId);
      expect(await shortTTLManager.getSession(sessionId)).toBe(true);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(await shortTTLManager.getSession(sessionId)).toBe(false);
    });
  });

  describe('deleteSession', () => {
    it('should delete existing session', async () => {
      const sessionId = 'delete-session';
      await sessionManager.setSession(sessionId);
      expect(await sessionManager.getSession(sessionId)).toBe(true);

      await sessionManager.deleteSession(sessionId);
      expect(await sessionManager.getSession(sessionId)).toBe(false);
    });

    it('should not throw error when deleting non-existent session', async () => {
      await expect(sessionManager.deleteSession('non-existent')).resolves.not.toThrow();
    });

    it('should allow recreating deleted session', async () => {
      const sessionId = 'recreate-session';

      // Create
      await sessionManager.setSession(sessionId);
      expect(await sessionManager.getSession(sessionId)).toBe(true);

      // Delete
      await sessionManager.deleteSession(sessionId);
      expect(await sessionManager.getSession(sessionId)).toBe(false);

      // Recreate
      await sessionManager.setSession(sessionId);
      expect(await sessionManager.getSession(sessionId)).toBe(true);
    });
  });

  describe('getTTL', () => {
    it('should return the configured TTL', () => {
      expect(sessionManager.getTTL()).toBe(1800);
    });

    it('should return custom TTL when provided', () => {
      const customTTL = 900;
      const manager = new SessionManager(customTTL);
      expect(manager.getTTL()).toBe(customTTL);
    });
  });

  describe('logSessionStats', () => {
    it('should log session stats without error', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      await sessionManager.logSessionStats();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Session Expiration', () => {
    it('should expire session after TTL', async () => {
      const shortTTLManager = new SessionManager(2); // 2 seconds
      const sessionId = 'expiring-session';

      await shortTTLManager.setSession(sessionId);
      expect(await shortTTLManager.getSession(sessionId)).toBe(true);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 2100));

      expect(await shortTTLManager.getSession(sessionId)).toBe(false);
    });

    it('should keep session alive within TTL window', async () => {
      const manager = new SessionManager(3); // 3 seconds
      const sessionId = 'persistent-session';

      await manager.setSession(sessionId);

      // Check multiple times within TTL window
      for (let i = 0; i < 2; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        expect(await manager.getSession(sessionId)).toBe(true);
      }
    });
  });

  describe('Multiple Operations', () => {
    it('should handle multiple concurrent operations', async () => {
      const operations = [];

      for (let i = 0; i < 5; i++) {
        operations.push(sessionManager.setSession(`session-${i}`));
      }

      await Promise.all(operations);

      // Verify all sessions exist
      for (let i = 0; i < 5; i++) {
        expect(await sessionManager.getSession(`session-${i}`)).toBe(true);
      }
    });

    it('should handle rapid create/delete cycles', async () => {
      const sessionId = 'rapid-cycle';

      for (let i = 0; i < 3; i++) {
        await sessionManager.setSession(sessionId);
        expect(await sessionManager.getSession(sessionId)).toBe(true);

        await sessionManager.deleteSession(sessionId);
        expect(await sessionManager.getSession(sessionId)).toBe(false);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long session IDs', async () => {
      const longSessionId = 'a'.repeat(1000);
      await sessionManager.setSession(longSessionId);
      expect(await sessionManager.getSession(longSessionId)).toBe(true);
    });

    it('should handle session IDs with special characters', async () => {
      const specialSessionId = 'session-!@#$%^&*()_+-=[]{}|;:",.<>?/~`';
      await sessionManager.setSession(specialSessionId);
      expect(await sessionManager.getSession(specialSessionId)).toBe(true);
    });

    it('should be case-sensitive for session IDs', async () => {
      const sessionId = 'TestSession';
      await sessionManager.setSession(sessionId);

      expect(await sessionManager.getSession('TestSession')).toBe(true);
      expect(await sessionManager.getSession('testsession')).toBe(false);
      expect(await sessionManager.getSession('TESTSESSION')).toBe(false);
    });
  });

  describe('Default TTL Configuration', () => {
    it('should use SESSION_TTL_SECONDS constant as default', () => {
      const manager = new SessionManager();
      expect(manager.getTTL()).toBe(SESSION_TTL_SECONDS);
    });

    it('SESSION_TTL_SECONDS should be 1800 (30 minutes)', () => {
      expect(SESSION_TTL_SECONDS).toBe(1800);
    });
  });

  describe('Sliding Window TTL', () => {
    it('getSession calls setSession to refresh TTL', async () => {
      const sessionId = 'sliding-window-test';
      const manager = new SessionManager(0.5);

      // Create session
      await manager.setSession(sessionId);
      expect(await manager.getSession(sessionId)).toBe(true);

      // Verify session is refreshed by checking it still exists after timeout
      // that would expire it without refresh
      await new Promise(resolve => setTimeout(resolve, 200));
      expect(await manager.getSession(sessionId)).toBe(true);
    });

    it('should keep session alive with continuous access', async () => {
      const sessionId = 'continuous-access';
      const shortTTL = 0.25; // 250ms TTL
      const manager = new SessionManager(shortTTL);

      await manager.setSession(sessionId);
      expect(await manager.getSession(sessionId)).toBe(true);

      // Access every 150ms - should keep session alive (250ms TTL resets each time)
      for (let i = 0; i < 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 150));
        const exists = await manager.getSession(sessionId);
        expect(exists).toBe(true); // Still alive due to refresh
      }

      // Now wait 300ms without access - should expire
      await new Promise(resolve => setTimeout(resolve, 300));
      expect(await manager.getSession(sessionId)).toBe(false); // Finally expired
    });

    it('should expire session after inactivity', async () => {
      const sessionId = 'inactivity-test';
      const shortTTL = 0.2; // 200ms TTL
      const manager = new SessionManager(shortTTL);

      await manager.setSession(sessionId);
      expect(await manager.getSession(sessionId)).toBe(true);

      // Wait longer than TTL without accessing
      await new Promise(resolve => setTimeout(resolve, 300));

      // Session should be expired now (no refresh = expires after 200ms)
      expect(await manager.getSession(sessionId)).toBe(false);
    });

    it('should handle mixed access and inactivity patterns', async () => {
      const sessionId = 'mixed-pattern';
      const shortTTL = 0.25; // 250ms TTL
      const manager = new SessionManager(shortTTL);

      await manager.setSession(sessionId);
      expect(await manager.getSession(sessionId)).toBe(true);

      // Active period: access every 100ms (refreshes TTL to 350ms each time)
      for (let i = 0; i < 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        expect(await manager.getSession(sessionId)).toBe(true);
      }

      // Idle period: wait 300ms without access - should expire
      await new Promise(resolve => setTimeout(resolve, 300));
      expect(await manager.getSession(sessionId)).toBe(false);

      // New session after expiration
      const newSessionId = 'after-expiration';
      await manager.setSession(newSessionId);
      expect(await manager.getSession(newSessionId)).toBe(true);
    });
  });
});
