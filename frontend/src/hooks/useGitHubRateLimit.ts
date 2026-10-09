import { useQuery } from '@tanstack/react-query'
import { dataApi } from '../api'

export function useGitHubRateLimit() {
  return useQuery({
    queryKey: ['githubRateLimit'],
    queryFn: () => dataApi.github.rateLimit(),
    staleTime: 60000, // 1 minute
  })
}