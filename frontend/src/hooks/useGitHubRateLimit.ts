import { useQuery } from '@tanstack/react-query'
import { dataApi } from '../api'
import { queryKeys } from '../lib/queryKeys'

export function useGitHubRateLimit() {
  return useQuery({
    queryKey: queryKeys.githubRateLimit(),
    queryFn: () => dataApi.github.rateLimit(),
    staleTime: 60000, // 1 minute
  })
}