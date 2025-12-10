/**
 * UI-related constants used throughout the application
 * Timing values, animations, and visual feedback settings
 */

// ============================================================================
// Timing Constants
// ============================================================================

export const UI = {
  // Delays
  SCROLL_DELAY_MS: 100,

  // Animation durations
  FLASH_DURATION_MS: 2000,

  // Thresholds
  HISTORY_DUPLICATE_THRESHOLD_MS: 1000,
} as const;

// ============================================================================
// Copy Status Types
// ============================================================================

export const COPY_STATUS = {
  IDLE: 'idle',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

export type CopyStatusType = typeof COPY_STATUS[keyof typeof COPY_STATUS];

// ============================================================================
// Badge Priority Constants
// ============================================================================

export const BADGE_PRIORITY = {
  DELETED: 3,
  NOT_DEPLOYED: 2,
  EDITED: 1,
} as const;
