import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Select } from '../ui/Select'
import { IconArrowUp, IconArrowDown } from '../ui/Icons'

const SORT_OPTIONS = [
  { value: 'dueDate', label: 'Due date' },
  { value: 'createdAt', label: 'Created' },
  { value: 'priority', label: 'Priority' },
  { value: 'title', label: 'Title' },
] as const

interface TaskSortProps {
  sortBy: string
  sortOrder: 'asc' | 'desc'
  onSortByChange: (sortBy: string) => void
  onSortOrderChange: (sortOrder: 'asc' | 'desc') => void
}

export function TaskSort({ sortBy, sortOrder, onSortByChange, onSortOrderChange }: TaskSortProps) {
  const [searchParams, setSearchParams] = useSearchParams()

  const writeUrl = useCallback(
    (nextSortBy: string, nextSortOrder: string) => {
      const next = new URLSearchParams(searchParams)
      next.set('sortBy', nextSortBy)
      next.set('sortOrder', nextSortOrder)
      next.set('page', '1')
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const handleSortByChange = useCallback(
    (value: string) => {
      onSortByChange(value)
      writeUrl(value, sortOrder)
    },
    [onSortByChange, sortOrder, writeUrl],
  )

  const handleOrderToggle = useCallback(() => {
    const nextOrder = sortOrder === 'asc' ? 'desc' : 'asc'
    onSortOrderChange(nextOrder)
    writeUrl(sortBy, nextOrder)
  }, [onSortOrderChange, sortBy, sortOrder, writeUrl])

  return (
    <div className="flex items-center gap-2">
      <div className="w-[160px]">
        <Select
          aria-label="Sort by"
          value={sortBy}
          onChange={(e) => handleSortByChange(e.target.value)}
          options={SORT_OPTIONS}
        />
      </div>
      <button
        type="button"
        onClick={handleOrderToggle}
        aria-label={sortOrder === 'asc' ? 'Sort descending' : 'Sort ascending'}
        title={sortOrder === 'asc' ? 'Ascending — switch to descending' : 'Descending — switch to ascending'}
        className="p-1.5 text-faint hover:text-fg rounded border border-line bg-canvas hover:bg-subtle"
      >
        {sortOrder === 'asc' ? (
          <IconArrowUp className="w-4 h-4" />
        ) : (
          <IconArrowDown className="w-4 h-4" />
        )}
      </button>
    </div>
  )
}
