import type { ChangelogEntry, ChangelogEntryType } from '../../../shared/types';
import { apiClient } from './api';

const SESSION_KEY = 'lcb-session-id';

class ChangelogService {
  private sessionId: string;
  private initPromise: Promise<void> | null = null;

  constructor() {
    // Generate or retrieve session ID and clear old changelog on page refresh
    this.sessionId = this.generateSessionId();
    this.initPromise = this.initializeSession();
  }

  private generateSessionId(): string {
    const now = Date.now();

    // Check if we have existing session in sessionStorage
    const existingSessionId = sessionStorage.getItem(SESSION_KEY);

    if (!existingSessionId) {
      // Create new session
      const newSessionId = `session_${now}_${Math.random().toString(36).substring(2, 11)}`;
      sessionStorage.setItem(SESSION_KEY, newSessionId);
      return newSessionId;
    }

    return existingSessionId;
  }

  private async initializeSession(): Promise<void> {
    const existingSessionId = sessionStorage.getItem(SESSION_KEY);

    // If no existing session, this is a new app load or refresh
    if (!existingSessionId) {
      console.log('[Changelog] New session detected - clearing old changelog from database');

      try {
        // Clear old changelog for this session from database
        await apiClient.clearChangelog(this.sessionId);
      } catch (error) {
        console.error('[Changelog] Failed to clear old changelog:', error);
      }
    }
  }

  /**
   * Wait for initialization to complete
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  /**
   * Add a new changelog entry
   */
  async addEntry(
    type: ChangelogEntryType,
    actionName: string,
    description: string,
    options?: {
      fieldName?: string;
      oldValue?: any;
      newValue?: any;
      resourceUri?: string;
    }
  ): Promise<ChangelogEntry> {
    await this.ensureInitialized();

    const entry: ChangelogEntry = {
      id: `change_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date().toISOString(),
      type,
      actionName: actionName || undefined,
      resourceUri: options?.resourceUri,
      fieldName: options?.fieldName,
      oldValue: options?.oldValue,
      newValue: options?.newValue,
      description,
      committed: false,
      sessionId: this.sessionId
    };

    try {
      await apiClient.addChangelogEntry(this.sessionId, entry);

      // Dispatch event to notify components
      window.dispatchEvent(new CustomEvent('lcb-changelog-updated', { detail: { entry } }));

      return entry;
    } catch (error) {
      console.error('[Changelog] Failed to add changelog entry:', error);
      throw error;
    }
  }

  /**
   * Get all changelog entries for current session
   */
  async getAllEntries(): Promise<ChangelogEntry[]> {
    await this.ensureInitialized();

    try {
      return await apiClient.getChangelog(this.sessionId);
    } catch (error) {
      console.error('[Changelog] Failed to get changelog entries:', error);
      return [];
    }
  }

  /**
   * Get uncommitted entries only
   */
  async getUncommittedEntries(): Promise<ChangelogEntry[]> {
    const entries = await this.getAllEntries();
    return entries.filter(entry => !entry.committed);
  }

  /**
   * Get count of uncommitted entries
   */
  async getUncommittedCount(): Promise<number> {
    const entries = await this.getUncommittedEntries();
    return entries.length;
  }

  /**
   * Mark an entry as committed
   */
  async markAsCommitted(entryId: string): Promise<void> {
    await this.ensureInitialized();

    try {
      const entries = await this.getAllEntries();
      const entry = entries.find(e => e.id === entryId);
      if (entry) {
        entry.committed = true;
        await apiClient.addChangelogEntry(this.sessionId, entry);
        window.dispatchEvent(new CustomEvent('lcb-changelog-updated'));
      }
    } catch (error) {
      console.error('[Changelog] Failed to mark entry as committed:', error);
    }
  }

  /**
   * Mark all entries as committed
   */
  async markAllAsCommitted(): Promise<void> {
    await this.ensureInitialized();

    try {
      const entries = await this.getAllEntries();
      for (const entry of entries) {
        entry.committed = true;
        await apiClient.addChangelogEntry(this.sessionId, entry);
      }
      window.dispatchEvent(new CustomEvent('lcb-changelog-updated'));
    } catch (error) {
      console.error('[Changelog] Failed to mark all entries as committed:', error);
    }
  }

  /**
   * Delete a specific changelog entry by ID
   */
  async deleteEntry(entryId: string): Promise<void> {
    await this.ensureInitialized();

    try {
      const entries = await this.getAllEntries();
      const filteredEntries = entries.filter(e => e.id !== entryId);
      
      // Clear and re-add all entries except the deleted one
      await apiClient.clearChangelog(this.sessionId);
      for (const entry of filteredEntries) {
        await apiClient.addChangelogEntry(this.sessionId, entry);
      }
      
      window.dispatchEvent(new CustomEvent('lcb-changelog-updated'));
    } catch (error) {
      console.error('[Changelog] Failed to delete changelog entry:', error);
    }
  }

  /**
   * Clear all changelog entries for current session
   */
  async clearAll(): Promise<void> {
    await this.ensureInitialized();

    try {
      await apiClient.clearChangelog(this.sessionId);
      window.dispatchEvent(new CustomEvent('lcb-changelog-updated'));
    } catch (error) {
      console.error('[Changelog] Failed to clear changelog:', error);
    }
  }

  /**
   * Clear current session
   */
  async clearSession(): Promise<void> {
    try {
      await apiClient.clearChangelog(this.sessionId);
      sessionStorage.removeItem(SESSION_KEY);
      this.sessionId = this.generateSessionId();
      this.initPromise = this.initializeSession();
      await this.initPromise;
    } catch (error) {
      console.error('[Changelog] Failed to clear session:', error);
    }
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }
}

// Export singleton instance
export const changelogService = new ChangelogService();
