import { parseDateOnly, clamp01 } from './dateOnly'

export type RoadmapScale = 'week' | 'month' | 'quarter'

export interface RoadmapWindow {
  start: Date
  end: Date
}

export interface BarGeometry {
  left: number // 0–1
  width: number // 0–1
  clamped: boolean
}

const MIN_BAR_WIDTH = 0.015 // ~2% so single-day tasks stay clickable

/**
 * Compute the window start/end for a given scale and anchor date.
 * Window always includes the anchor date (default: today).
 */
export function computeWindow(
  scale: RoadmapScale,
  anchor: Date = new Date(),
  range: 'current' | '30d' | '90d' | '180d' | '365d' = '90d',
): RoadmapWindow {
  const start = new Date(anchor)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)

  switch (range) {
    case 'current':
      // Current month/quarter/week containing anchor
      if (scale === 'week') {
        const day = start.getDay()
        start.setDate(start.getDate() - day)
        end.setDate(start.getDate() + 6)
      } else if (scale === 'month') {
        start.setDate(1)
        end.setMonth(end.getMonth() + 1, 0)
      } else {
        const q = Math.floor(start.getMonth() / 3)
        start.setMonth(q * 3, 1)
        end.setMonth(q * 3 + 3, 0)
      }
      break
    case '30d':
      end.setDate(end.getDate() + 30)
      break
    case '90d':
      end.setDate(end.getDate() + 90)
      break
    case '180d':
      end.setDate(end.getDate() + 180)
      break
    case '365d':
      end.setDate(end.getDate() + 365)
      break
  }

  return { start, end }
}

/**
 * Compute left/width percentages for a task bar on the roadmap.
 * Both clamped to [0, 1] with a minimum width so single-day tasks are visible.
 */
export function computeBarGeometry(
  task: { startDate?: string | null; dueDate?: string | null },
  window: RoadmapWindow,
): BarGeometry {
  const { start, end } = window
  const windowMs = end.getTime() - start.getTime()

  if (windowMs <= 0) return { left: 0, width: MIN_BAR_WIDTH, clamped: true }

  // Task has no dates → handled by UndatedLane, not here
  if (!task.startDate && !task.dueDate) {
    return { left: 0, width: 0, clamped: true }
  }

  // Task has only dueDate → milestone diamond at dueDate
  if (!task.startDate && task.dueDate) {
    const due = parseDateOnly(task.dueDate).getTime()
    const left = clamp01((due - start.getTime()) / windowMs)
    return { left, width: MIN_BAR_WIDTH, clamped: left === 0 || left === 1 }
  }

  // Task has only startDate → open-ended bar from start to window end
  if (task.startDate && !task.dueDate) {
    const taskStart = parseDateOnly(task.startDate).getTime()
    const left = clamp01((taskStart - start.getTime()) / windowMs)
    const width = clamp01(1 - left)
    return { left, width: Math.max(width, MIN_BAR_WIDTH), clamped: left === 0 || left === 1 }
  }

  // Task has both dates
  const taskStart = parseDateOnly(task.startDate!).getTime()
  const taskEnd = parseDateOnly(task.dueDate!).getTime()

  const left = clamp01((taskStart - start.getTime()) / windowMs)
  const right = clamp01((taskEnd - start.getTime()) / windowMs)
  let width = right - left

  if (width < MIN_BAR_WIDTH) width = MIN_BAR_WIDTH

  return { left, width, clamped: left === 0 || right === 1 }
}

/**
 * Get tick marks for the time axis based on scale and window.
 * Returns array of { date: Date, label: string, major: boolean }
 */
export function getTimeAxisTicks(window: RoadmapWindow, scale: RoadmapScale) {
  const ticks: { date: Date; label: string; major: boolean }[] = []
  const { start, end } = window
  const current = new Date(start)

  if (scale === 'week') {
    // Weekly ticks, major on Mondays
    while (current <= end) {
      const isMonday = current.getDay() === 1
      ticks.push({
        date: new Date(current),
        label: isMonday
          ? current.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
          : '',
        major: isMonday,
      })
      current.setDate(current.getDate() + 1)
    }
  } else if (scale === 'month') {
    // Monthly ticks
    while (current <= end) {
      const isFirst = current.getDate() === 1
      ticks.push({
        date: new Date(current),
        label: isFirst ? current.toLocaleDateString('en-GB', { month: 'short' }) : '',
        major: isFirst,
      })
      current.setMonth(current.getMonth() + 1)
    }
  } else {
    // Quarterly ticks
    while (current <= end) {
      const isQuarterStart = current.getMonth() % 3 === 0 && current.getDate() === 1
      const q = Math.floor(current.getMonth() / 3) + 1
      const year = current.getFullYear()
      ticks.push({
        date: new Date(current),
        label: isQuarterStart ? `Q${q} ${year}` : '',
        major: isQuarterStart,
      })
      current.setMonth(current.getMonth() + 1)
    }
  }

  return ticks
}

/** Get today's position as 0–1 within the window. */
export function getTodayPosition(window: RoadmapWindow): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { start, end } = window
  const windowMs = end.getTime() - start.getTime()
  if (windowMs <= 0) return 0
  return clamp01((today.getTime() - start.getTime()) / windowMs)
}