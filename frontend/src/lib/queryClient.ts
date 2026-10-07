import { QueryClient } from '@tanstack/react-query'
import { isApiError } from '../api/client'

/**
 * 4xx responses will not improve on retry, so they fail fast; 5xx and network
 * failures get two attempts.
 */
function retry(failureCount: number, error: unknown): boolean {
  if (isApiError(error) && error.status >= 400 && error.status < 500) return false
  return failureCount < 2
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry,
        // List queries are cheap to revalidate on their own terms; refetching
        // every time the window regains focus adds load for no benefit.
        refetchOnWindowFocus: false,
        staleTime: 30_000,
      },
      mutations: {
        retry: false,
      },
    },
  })
}