import { useQuery } from '@tanstack/react-query'
import { dataApi } from '../api'
import { queryKeys } from '../lib/queryKeys'

export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects(),
    queryFn: () => dataApi.projects.list(),
  })
}