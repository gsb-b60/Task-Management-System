import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

interface PaginationProps {
  page: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  onPageChange: (page: number) => void
  /** URL param names — a page with two pagers needs distinct keys. */
  pageParam?: string
}

export function Pagination({
  page,
  totalPages,
  hasNextPage,
  hasPreviousPage,
  onPageChange,
  pageParam = 'page',
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

  if (totalPages <= 1) {
    return null
  }

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
    <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
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