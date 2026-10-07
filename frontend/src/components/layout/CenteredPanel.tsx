import type { ReactNode } from 'react'

/** The bare centred column the auth and error screens share — no card. */
export function CenteredPanel({ children }: { children: ReactNode }) {
  return (
    <div className="grid place-items-center py-12 px-6 min-h-screen bg-canvas">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}