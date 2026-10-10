import type { TaskStatus } from '../../api/types'

export function isBoardStatus(value: unknown): value is TaskStatus {
  return (
    value === 'TODO' || value === 'IN_PROGRESS' || value === 'DONE'
  )
}

/**
 * Where a drop lands: the column itself, or a card inside it (cards resolve
 * to their own column). Same-column drops are no-ops — the board moves
 * tasks between statuses, it does not reorder within them.
 */
export function resolveDropStatus(
  overId: string,
  overDataStatus: unknown,
  activeStatus: unknown,
): TaskStatus | null {
  const overStatus = isBoardStatus(overId)
    ? overId
    : isBoardStatus(overDataStatus)
      ? overDataStatus
      : null
  if (!overStatus || overStatus === activeStatus) return null
  return overStatus
}
