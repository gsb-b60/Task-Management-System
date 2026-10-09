import { useQuery } from '@tanstack/react-query'
import { dataApi } from '../api'
import { queryKeys } from '../lib/queryKeys'

export function useProject(id: string) {
  return useQuery({
    queryKey: queryKeys.project(id),
    queryFn: () => dataApi.projects.get(id),
    enabled: !!id,
  })
}