import { useState, useCallback } from 'react';
import type { MCPServer } from '../../../shared/types';
import { apiClient } from '../services/api';

/**
 * Hook for managing server state with loading and error handling
 */
export function useServerState() {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadServers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getServers();

      // Sort servers alphabetically by name
      const sortedServers = [...data].sort((a, b) => {
        return a.name.localeCompare(b.name);
      });

      setServers(sortedServers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load servers');
      setServers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { servers, loading, error, loadServers, setServers, setError };
}
