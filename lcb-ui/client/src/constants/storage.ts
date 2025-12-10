/**
 * Centralized storage keys used throughout the application
 * Organized by storage type (localStorage vs sessionStorage)
 */
export const STORAGE_KEYS = {
  // ============================================================================
  // LocalStorage Keys - Persist across browser sessions
  // ============================================================================

  // Server selection
  SELECTED_SERVER_ID: 'lcb-selected-server-id',

  // User preferences
  AUTO_OPEN_AEM_WIDGETS: 'lcb-auto-open-aem-widgets',
  AUTO_OPEN_AEM_RESOURCES: 'lcb-auto-open-aem-resources',

  // Per-server data (use with serverId)
  ACTIONS_PREFIX: 'lcb-actions-', // Usage: lcb-actions-${serverId}
  FLOWS_PREFIX: 'lcb-flows-', // Usage: lcb-flows-${serverId}

  // Helper functions for per-server keys
  ACTIONS: (serverId: string) => `lcb-actions-${serverId}`,
  FLOWS: (serverId: string) => `lcb-flows-${serverId}`,

  // Changelog
  CHANGELOG: 'lcb-changelog',
  CHANGELOG_SESSION: 'lcb-changelog-session-id',

  // Uncommitted changes
  UNCOMMITTED_DISMISSED_COUNT: 'lcb-uncommitted-dismissed-count',

  // IMS Authentication
  REAL_IMS_TOKEN: 'lcb-ims-real-token',

  // ============================================================================
  // SessionStorage Keys - Cleared on browser close
  // ============================================================================

  // Loading state cache
  TOOLS_LOADED_FOR_SERVER: 'lcb-tools-loaded-for-server',
  RESOURCES_LOADED_FOR_SERVER: 'lcb-resources-loaded-for-server',

  // Page state restoration (for refresh detection)
  ACTIONS_PAGE_SELECTED_ACTION: 'lcb-actions-page-selected-action',
  ACTIONS_PAGE_IS_REFRESH: 'lcb-actions-page-is-refresh',
  RESOURCES_PAGE_SELECTED_RESOURCE: 'lcb-resources-page-selected-resource',
  ENVIRONMENTS_PAGE_SELECTED_ENV: 'lcb-environments-page-selected-env',

  // Debug settings
  SANDBOX_MODE: 'lcb-sandbox-mode',
  MOCK_AUTH_MODE: 'lcb-mock-auth-mode',
} as const;
