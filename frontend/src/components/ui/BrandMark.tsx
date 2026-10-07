type BrandMarkProps = {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const WRAPPERS: Record<NonNullable<BrandMarkProps['size']>, string> = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-6 h-6',
}

const GLYPHS: Record<NonNullable<BrandMarkProps['size']>, string> = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-3.5 h-3.5',
}

/** Moon-and-cat wordmark, taken from the mockup so the app matches it. */
export function BrandMark({ size = 'md', className = '' }: BrandMarkProps) {
  return (
    <span
      className={`${WRAPPERS[size]} rounded-full border border-line bg-subtle flex items-center justify-center flex-none ${className}`}
    >
      <svg viewBox="0 0 24 24" className={GLYPHS[size]} fill="none" aria-hidden="true">
        <path
          d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
          fill="currentColor"
        />
        <g stroke="#fff" strokeWidth="1.35" strokeLinecap="round">
          <path d="M6.3 15.2q1.3-1.5 2.6 0" />
          <path d="M8.9 15.6q1.3-1.5 2.6 0" />
          <path d="M8.2 17.3q1.5 1.6 3 0" />
        </g>
        <circle cx="6.4" cy="18.1" r="0.7" fill="#fff" opacity=".5" />
        <path d="M19.5 2.2l1.1 2.2 2.2 1.1-2.2 1.1-1.1 2.2-1.1-2.2-2.2-1.1 2.2-1.1z" fill="currentColor" opacity=".55" />
        <path d="M21.6 10.9l.7 1.4 1.4.7-1.4.7-.7 1.4-.7-1.4-1.4-.7 1.4-.7z" fill="currentColor" opacity=".4" />
      </svg>
    </span>
  )
}