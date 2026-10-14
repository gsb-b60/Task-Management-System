type SpinnerProps = {
  className?: string
}

/** The two-tone arc from the mockup, kept as SVG so it scales with the font. */
export function Spinner({ className = 'w-5 h-5' }: SpinnerProps) {
  return (
    <svg viewBox="0 0 16 16" className={`${className} animate-spin`} aria-hidden="true">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" fill="none" />
      <path
        d="M14 8a6 6 0 0 0-6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

/**
 * The session check splash — spinner only. Rendering protected content
 * before `/me` resolves flashes the login form on every hard refresh,
 * so this blocks everything without explaining itself.
 */
export function Splash() {
  return (
    <div className="min-h-screen grid place-items-center bg-canvas">
      <div className="text-center" data-testid="session-splash">
        <Spinner className="w-8 h-8 mx-auto text-fg" />
      </div>
    </div>
  )
}