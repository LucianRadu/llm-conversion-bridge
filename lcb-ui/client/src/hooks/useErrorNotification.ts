import { useCallback } from 'react';
import { toastService } from '../services/toast';
import { handleApiError } from '../utils/errorHandler';

export interface UseErrorNotificationOptions {
  successMessage?: string;
  errorContext?: string;
  onSuccess?: (result?: any) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for standardized error/success notifications with async operations
 * Reduces boilerplate by wrapping try/catch/toast logic
 *
 * Usage:
 * const { handleAsync } = useErrorNotification();
 *
 * const handleLoadData = async () => {
 *   const data = await handleAsync(
 *     () => apiClient.getData(),
 *     {
 *       successMessage: 'Data loaded',
 *       onSuccess: (data) => setData(data),
 *       errorContext: 'Failed to load data'
 *     }
 *   );
 * };
 */
export function useErrorNotification() {
  const handleAsync = useCallback(
    async <T,>(
      asyncFn: () => Promise<T>,
      options: UseErrorNotificationOptions = {}
    ): Promise<T | null> => {
      try {
        const result = await asyncFn();

        // Show success toast if provided
        if (options.successMessage) {
          toastService.success(options.successMessage);
        }

        // Call success callback
        if (options.onSuccess) {
          options.onSuccess(result);
        }

        return result;
      } catch (error) {
        // Handle error with standardized error handler
        const errorMsg = handleApiError(
          error,
          {
            context: options.errorContext || 'operation',
            fallback: 'Operation failed'
          }
        );

        // Show error toast
        toastService.error(errorMsg);

        // Call error callback
        if (options.onError) {
          options.onError(error as Error);
        }

        return null;
      }
    },
    []
  );

  return { handleAsync };
}

