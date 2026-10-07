import { useQuery } from '@tanstack/react-query'
import { dataApi } from '../api'

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => dataApi.projects.list(),
  })
}

export function useGitHubRateLimit() {
  return useQuery({
    queryKey: ['github', 'rate-limit'],
    queryFn: () => dataApi.github.rateLimit(),
  })
}