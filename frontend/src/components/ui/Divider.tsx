export function Divider({ label = 'or' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 my-5">
      <span className="h-px flex-1 bg-line" />
      <span className="text-[11px] text-faint">{label}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}

/**
 * Four segments, not a percentage. SC-01 keeps this coarse on purpose — a
 * precise "82%" invites trust in a score the server never computes.
 */
export function PasswordStrength({ score, label }: { score: number; label: string }) {
  return (
    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-faint" aria-live="polite">
      <span className="flex items-center gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((segment) => (
          <span
            key={segment}
            className={`w-4 h-1 rounded-full ${segment <= score ? 'bg-ok' : 'bg-line'}`}
          />
        ))}
      </span>
      {label}
    </div>
  )
}