import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Select } from './ui/Select'

interface PaginationProps {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  /** URL param names — a page with two pagers needs distinct keys. */
  pageParam?: string
  pageSizeParam?: string
}

export function Pagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  hasNextPage,
  hasPreviousPage,
  onPageChange,
  onPageSizeChange,
  pageParam = 'page',
  pageSizeParam = 'pageSize',
}: PaginationProps) {
  const [searchParams, setSearchParams] = useSearchParams()

  const handlePageChange = useCallback(
    (nextPage: number) => {
      onPageChange(nextPage)
      const next = new URLSearchParams(searchParams)
      next.set(pageParam, String(nextPage))
      setSearchParams(next, { replace: true })
    },
    [onPageChange, searchParams, setSearchParams, pageParam],
  )

  const handlePageSizeChange = useCallback(
    (nextPageSize: number) => {
      onPageSizeChange(nextPageSize)
      const next = new URLSearchParams(searchParams)
      next.set(pageSizeParam, String(nextPageSize))
      next.set(pageParam, '1')
      setSearchParams(next, { replace: true })
    },
    [onPageSizeChange, searchParams, setSearchParams, pageParam, pageSizeParam],
  )

  if (totalPages <= 1) {
    return (
      <div className="mt-3 flex items-center justify-between text-xs text-faint">
        <span>Showing {totalItems} of {totalItems}</span>
      </div>
    )
  }

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalItems)

  const pageNumbers = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i)
  } else {
    pageNumbers.push(1)
    if (page > 3) pageNumbers.push(-1)
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pageNumbers.push(i)
    }
    if (page < totalPages - 2) pageNumbers.push(-2)
    pageNumbers.push(totalPages)
  }

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
      <div className="flex items-center gap-2">
        <span className="text-faint">Showing {start}–{end} of {totalItems}</span>
        <Select
          value={String(pageSize)}
          onChange={(e) => handlePageSizeChange(Number(e.target.value))}
          options={[
            { value: '10', label: '10 per page' },
            { value: '20', label: '20 per page' },
            { value: '50', label: '50 per page' },
            { value: '100', label: '100 per page' },
          ]}
          className="w-28 flex-none"
        />
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => handlePageChange(1)}
          disabled={!hasPreviousPage}
          className="px-2 py-1 text-faint hover:text-fg disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="First page"
        >
          ««
        </button>
        <button
          type="button"
          onClick={() => handlePageChange(page - 1)}
          disabled={!hasPreviousPage}
          className="px-2 py-1 text-faint hover:text-fg disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          «
        </button>
        {pageNumbers.map((num, i) =>
          num === -1 ? (
            <span key={`ellipsis-start-${i}`} className="px-2 text-faint">
              …
            </span>
          ) : num === -2 ? (
            <span key={`ellipsis-end-${i}`} className="px-2 text-faint">
              …
            </span>
          ) : (
            <button
              key={num}
              type="button"
              onClick={() => handlePageChange(num)}
              className={`px-2 py-1 rounded ${
                num === page
                  ? 'bg-accent text-white'
                  : 'text-faint hover:text-fg hover:bg-subtle'
              }`}
            >
              {num}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => handlePageChange(page + 1)}
          disabled={!hasNextPage}
          className="px-2 py-1 text-faint hover:text-fg disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          »
        </button>
        <button
          type="button"
          onClick={() => handlePageChange(totalPages)}
          disabled={!hasNextPage}
          className="px-2 py-1 text-faint hover:text-fg disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Last page"
        >
          »»
        </button>
      </div>
    </div>
  )
}