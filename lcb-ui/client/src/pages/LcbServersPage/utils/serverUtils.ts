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

import type { MCPServer } from '../../../../../shared/types';
import { STORAGE_KEYS } from '../../../constants/storage';
import { safeRemoveSessionStorage } from '../../../utils/storage';

/**
 * Filter servers by name or description
 * Requires minimum 3 characters to activate filtering
 */
export const filterServers = (servers: MCPServer[], filterText: string): MCPServer[] => {
  if (filterText.length < 3) {
    return servers;
  }

  const searchTerm = filterText.toLowerCase();

  return servers.filter(server => {
    if (server.name.toLowerCase().includes(searchTerm)) {
      return true;
    }

    if (server.description && server.description.toLowerCase().includes(searchTerm)) {
      return true;
    }

    return false;
  });
};

/**
 * Sort servers by priority: local-managed > remote-managed > remote-external
 */
export const sortServers = (servers: MCPServer[]): MCPServer[] => {
  return [...servers].sort((a, b) => {
    const getPriority = (server: MCPServer): number => {
      if (server.serverType === 'local-managed') return 1;
      if (server.serverType === 'remote-managed') return 2;
      if (server.serverType === 'remote-external') return 3;
      return 4;
    };

    const priorityA = getPriority(a);
    const priorityB = getPriority(b);

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    return 0;
  });
};

/**
 * Clear all page-specific session storage selections
 * Called when connecting to a different server
 */
export const clearAllPageSelections = (): void => {
  safeRemoveSessionStorage(STORAGE_KEYS.ACTIONS_PAGE_SELECTED_ACTION);
  safeRemoveSessionStorage(STORAGE_KEYS.RESOURCES_PAGE_SELECTED_RESOURCE);
  safeRemoveSessionStorage(STORAGE_KEYS.ENVIRONMENTS_PAGE_SELECTED_ENV);
};

/**
 * Format last connected timestamp as relative time
 * Examples: "Just now", "5 mins ago", "2 hours ago", "3 days ago"
 */
export const formatLastConnected = (isoString?: string): string => {
  if (!isoString) return 'Never';

  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  // For older dates, show formatted date
  return date.toLocaleDateString();
};
