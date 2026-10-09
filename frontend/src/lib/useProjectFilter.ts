import { useSearchParams } from 'react-router-dom'

/**
 * Thin wrapper around `useSearchParams` for the `projectId` filter.
 * Components can use this instead of reading/writing searchParams directly,
 * ensuring consistent encoding/decoding of the "all projects" sentinel.
 */
export function useProjectFilter() {
  const [searchParams, setSearchParams] = useSearchParams()

  const projectId = searchParams.get('projectId')
  const isAll = projectId === null

  function setProject(projectId: string | null) {
    const next = new URLSearchParams(searchParams)
    if (projectId === null) {
      next.delete('projectId')
    } else {
      next.set('projectId', projectId)
    }
    setSearchParams(next)
  }

  function clear() {
    const next = new URLSearchParams(searchParams)
    next.delete('projectId')
    setSearchParams(next)
  }

  return {
    projectId,
    isAll,
    setProject,
    clear,
  }
}