/**
 * Custom window events used for cross-component communication
 */
export const APP_EVENTS = {
  // Server lifecycle events
  SERVER_SELECTED: 'lcb-server-selected',
  SERVER_CONNECTED: 'lcb-server-connected',
  SERVER_DISCONNECTED: 'lcb-server-disconnected',

  // Changelog events
  CHANGELOG_UPDATED: 'lcb-changelog-updated',

  // Deployment events
  DEPLOYMENT_STARTED: 'lcb-deployment-started',
  DEPLOYMENT_COMPLETED: 'lcb-deployment-completed',
  DEPLOYMENT_FAILED: 'lcb-deployment-failed'
} as const;

// Alias for backward compatibility and consistency with other pages
export const EVENTS = APP_EVENTS;

/**
 * Type-safe event dispatcher
 */
export function dispatchAppEvent(eventName: keyof typeof APP_EVENTS, detail?: any) {
  window.dispatchEvent(new CustomEvent(APP_EVENTS[eventName], { detail }));
}

/**
 * Type-safe event listener
 */
export function addAppEventListener(
  eventName: keyof typeof APP_EVENTS,
  handler: (event: CustomEvent) => void
) {
  window.addEventListener(APP_EVENTS[eventName], handler as EventListener);
}

/**
 * Type-safe event listener removal
 */
export function removeAppEventListener(
  eventName: keyof typeof APP_EVENTS,
  handler: (event: CustomEvent) => void
) {
  window.removeEventListener(APP_EVENTS[eventName], handler as EventListener);
}
