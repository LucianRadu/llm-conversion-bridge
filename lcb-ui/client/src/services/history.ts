/**
 * Generic History Service for tracking MCP requests/responses
 * Can be used for Actions, Widget Resources, etc.
 */

import type { HistoryEntry, MCPRequest, MCPResponse } from '../../../shared/types';

export type { HistoryEntry } from '../../../shared/types';

export type HistoryType = 'actions' | 'widgetResources';

class HistoryService {
  private histories: Map<HistoryType, HistoryEntry[]> = new Map();

  constructor() {
    // Initialize empty histories
    this.histories.set('actions', []);
    this.histories.set('widgetResources', []);
  }

  /**
   * Add entry to specific history type
   */
  addEntry(
    type: HistoryType,
    operationName: string,
    request: MCPRequest,
    response: MCPResponse
  ): HistoryEntry {
    const entry: HistoryEntry = {
      id: Date.now().toString(),
      timestamp: new Date(),
      operationName,
      request,
      response
    };

    const history = this.histories.get(type) || [];

    // Check for duplicate within 1 second (React StrictMode protection)
    if (history.length > 0) {
      const lastEntry = history[0];
      const timeDiff = entry.timestamp.getTime() - lastEntry.timestamp.getTime();
      if (lastEntry.operationName === operationName && timeDiff < 1000) {
        return lastEntry; // Skip duplicate
      }
    }

    // Add to beginning (most recent first)
    this.histories.set(type, [entry, ...history]);

    return entry;
  }

  /**
   * Get all entries for specific history type
   */
  getEntries(type: HistoryType): HistoryEntry[] {
    return this.histories.get(type) || [];
  }

  /**
   * Clear history for specific type
   */
  clearHistory(type: HistoryType): void {
    this.histories.set(type, []);
  }

  /**
   * Clear all histories
   */
  clearAll(): void {
    this.histories.set('actions', []);
    this.histories.set('widgetResources', []);
  }
}

// Export singleton instance
export const historyService = new HistoryService();
