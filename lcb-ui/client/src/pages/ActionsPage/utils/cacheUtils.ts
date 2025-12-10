/**
 * Build cache key for tools loaded for a specific server+session combination
 */
export function buildCacheKey(serverId: string, sessionId: string | undefined | null): string {
  return `${serverId}:${sessionId || 'no-session'}`;
}

/**
 * Check if tools should be refreshed from server
 */
export function shouldRefreshCache(
  forceRefresh: boolean,
  sessionLoadedServer: string | null,
  cacheKey: string
): boolean {
  return forceRefresh || sessionLoadedServer !== cacheKey;
}

/**
 * Detect if current navigation is a page refresh (browser reload) vs React Router navigation
 */
export function isPageRefresh(): boolean {
  try {
    const navigationType = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return navigationType?.type === 'reload';
  } catch {
    return false;
  }
}
