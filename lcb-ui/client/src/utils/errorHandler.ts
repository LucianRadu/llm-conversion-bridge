/**
 * Standardized error handling utilities
 * Provides consistent error message extraction, logging, and user notifications
 */

import { toastService } from '../services/toast';

/**
 * Extract error message from unknown error type
 * Handles Error objects, strings, and unknown types consistently
 */
export function getErrorMessage(error: unknown, fallback: string = 'An unexpected error occurred'): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  // Handle error objects with message property
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as { message: unknown }).message;
    if (typeof msg === 'string') {
      return msg;
    }
  }

  return fallback;
}

/**
 * Log error to console with context
 */
export function logError(context: string, error: unknown): void {
  console.error(`[${context}] Error:`, error);
}

/**
 * Show error toast notification
 */
export function showErrorToast(message: string): void {
  toastService.error(message);
}

/**
 * Standard error handling options
 */
interface ErrorHandlerOptions {
  /** Context for logging (e.g., 'loadEnvironments', 'connectServer') */
  context: string;
  /** Fallback message if error has no message */
  fallback: string;
  /** Whether to show toast notification (default: true) */
  showToast?: boolean;
  /** Whether to log to console (default: true) */
  logToConsole?: boolean;
  /** Whether to re-throw the error after handling (default: false) */
  rethrow?: boolean;
  /** Custom error message to show instead of extracted message */
  customMessage?: string;
}

/**
 * Standardized error handler
 * Handles logging, toast notifications, and message extraction consistently
 *
 * @example
 * try {
 *   await apiClient.loadData();
 * } catch (error) {
 *   handleError(error, {
 *     context: 'loadData',
 *     fallback: 'Failed to load data',
 *     showToast: true,
 *   });
 * }
 */
export function handleError(error: unknown, options: ErrorHandlerOptions): string {
  const {
    context,
    fallback,
    showToast = true,
    logToConsole = true,
    rethrow = false,
    customMessage,
  } = options;

  // Log error if enabled
  if (logToConsole) {
    logError(context, error);
  }

  // Extract error message
  const errorMessage = customMessage || getErrorMessage(error, fallback);

  // Show toast if enabled
  if (showToast) {
    showErrorToast(errorMessage);
  }

  // Re-throw if requested
  if (rethrow) {
    throw error;
  }

  return errorMessage;
}

/**
 * Error handler for API calls with state updates
 * Common pattern: set error state, show toast, optionally rethrow
 */
interface ApiErrorHandlerOptions extends ErrorHandlerOptions {
  /** Callback to update error state */
  setError?: (message: string) => void;
}

export function handleApiError(error: unknown, options: ApiErrorHandlerOptions): string {
  const { setError, ...baseOptions } = options;

  const errorMessage = handleError(error, baseOptions);

  // Update error state if callback provided
  if (setError) {
    setError(errorMessage);
  }

  return errorMessage;
}

/**
 * Create consistent error messages for common operations
 */
export const ErrorMessages = {
  // Server operations
  LOAD_SERVERS: 'Failed to load LCB servers',
  ADD_SERVER: 'Failed to add LCB server',
  UPDATE_SERVER: 'Failed to update LCB server',
  DELETE_SERVER: 'Failed to delete LCB server',
  CONNECT_SERVER: 'Failed to connect to server',
  DISCONNECT_SERVER: 'Failed to disconnect from server',

  // Action operations
  LOAD_ACTIONS: 'Failed to load actions',
  ADD_ACTION: 'Failed to add action',
  UPDATE_ACTION: 'Failed to update action',
  DELETE_ACTION: 'Failed to delete action',
  EXECUTE_ACTION: 'Failed to execute action',
  SAVE_ACTION: 'Failed to save action',

  // Resource operations
  LOAD_RESOURCES: 'Failed to load widget resources',
  ADD_RESOURCE: 'Failed to add widget resource',
  UPDATE_RESOURCE: 'Failed to update widget resource',
  DELETE_RESOURCE: 'Failed to delete widget resource',
  READ_RESOURCE: 'Failed to read resource content',

  // Environment operations
  LOAD_ENVIRONMENTS: 'Failed to load environments',
  ADD_ENVIRONMENT: 'Failed to add environment',
  UPDATE_ENVIRONMENT: 'Failed to update environment',
  DELETE_ENVIRONMENT: 'Failed to delete environment',

  // Deployment operations
  START_DEPLOYMENT: 'Failed to start deployment',
  LOAD_DEPLOYMENT: 'Failed to load deployment',
  KILL_DEPLOYMENT: 'Failed to stop deployment',

  // Flow operations
  LOAD_FLOWS: 'Failed to load conversion flows',
  ADD_FLOW: 'Failed to add conversion flow',
  UPDATE_FLOW: 'Failed to update conversion flow',
  DELETE_FLOW: 'Failed to delete conversion flow',

  // Generic operations
  SAVE_CHANGES: 'Failed to save changes',
  LOAD_DATA: 'Failed to load data',
  NETWORK_ERROR: 'Network error occurred. Please check your connection.',
  UNKNOWN_ERROR: 'An unexpected error occurred',
} as const;

/**
 * Type-safe success messages
 */
export const SuccessMessages = {
  // Server operations
  ADD_SERVER: (name: string) => `LCB server "${name}" added successfully`,
  UPDATE_SERVER: (name: string) => `LCB server "${name}" updated successfully`,
  DELETE_SERVER: (name: string) => `LCB server "${name}" deleted successfully`,
  CONNECT_SERVER: (name: string) => `Connected to ${name}`,
  DISCONNECT_SERVER: (name: string) => `Disconnected from ${name}`,

  // Action operations
  ADD_ACTION: (name: string) => `Action "${name}" created successfully`,
  UPDATE_ACTION: (name: string) => `Action "${name}" updated successfully`,
  DELETE_ACTION: (name: string) => `Action "${name}" deleted successfully`,
  EXECUTE_ACTION: (name: string) => `Action "${name}" executed successfully`,
  SAVE_ACTION: (name: string) => `Action "${name}" saved as draft`,

  // Resource operations
  ADD_RESOURCE: (name: string) => `Resource "${name}" created successfully`,
  UPDATE_RESOURCE: () => `Resource updated successfully`,
  DELETE_RESOURCE: () => `Resource deleted successfully`,
  READ_RESOURCE: (name: string) => `Resource "${name}" retrieved successfully`,

  // Environment operations
  ADD_ENVIRONMENT: (name: string) => `Environment "${name}" added successfully`,
  UPDATE_ENVIRONMENT: () => `Environment updated successfully`,
  DELETE_ENVIRONMENT: (name: string) => `Environment "${name}" deleted successfully`,

  // Deployment operations
  START_DEPLOYMENT: (env: string) => `Deploying to ${env}...`,
  COMPLETE_DEPLOYMENT: (env: string) => `Deployment to ${env} completed successfully`,
  KILL_DEPLOYMENT: () => `Deployment process killed`,

  // Flow operations
  ADD_FLOW: (name: string) => `Flow "${name}" created successfully`,
  UPDATE_FLOW: (name: string) => `Flow "${name}" updated successfully`,
  DELETE_FLOW: (name: string) => `Flow "${name}" deleted successfully`,

  // Generic
  SAVE_CHANGES: () => `Changes saved successfully`,
} as const;
