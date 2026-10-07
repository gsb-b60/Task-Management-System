import { describe, expect, it } from 'vitest'
import { createDb, daysBetween, startOfToday, toDateOnly } from './db'

const db = createDb()

describe('mock fixtures', () => {
  it('matches the mockup dashboard fixture', () => {
    const count = (predicate: (task: (typeof db.tasks)[number]) => boolean) =>
      db.tasks.filter(predicate).length

    expect(db.tasks).toHaveLength(137)
    expect(count((task) => task.status === 'TODO')).toBe(37)
    expect(count((task) => task.status === 'IN_PROGRESS')).toBe(52)
    expect(count((task) => task.status === 'DONE')).toBe(48)
    expect(count((task) => task.isOverdue)).toBe(6)
    expect(count((task) => task.daysUntilDue === 0 && !task.isOverdue)).toBe(3)
  })

  it('never marks a finished task overdue, whatever its due date says', () => {
    const overdueDone = db.tasks.filter((task) => task.isOverdue && task.status === 'DONE')

    expect(overdueDone).toHaveLength(0)
  })

  it('scopes Portfolio Website to the mockup project fixture', () => {
    const portfolio = db.projects.find((project) => project.name === 'Portfolio Website')
    const tasks = db.tasks.filter((task) => task.projectId === portfolio?.id)

    expect(tasks).toHaveLength(12)
    expect(tasks.filter((task) => task.status === 'TODO')).toHaveLength(4)
    expect(tasks.filter((task) => task.status === 'IN_PROGRESS')).toHaveLength(3)
    expect(tasks.filter((task) => task.status === 'DONE')).toHaveLength(5)
    expect(tasks.filter((task) => task.isOverdue)).toHaveLength(2)
    expect(tasks.filter((task) => task.daysUntilDue === 0)).toHaveLength(1)
  })

  it('leaves Task Stream empty, as the mockup shows it', () => {
    const stream = db.projects.find((project) => project.name === 'Task Stream')

    expect(db.tasks.filter((task) => task.projectId === stream?.id)).toHaveLength(0)
  })

  it('has no duplicate ids', () => {
    const ids = new Set(db.tasks.map((task) => task.id))

    expect(ids.size).toBe(db.tasks.length)
  })
})

describe('date-only handling', () => {
  it('formats a date-only string without a timezone shift', () => {
    // `new Date('2026-10-15')` is UTC midnight, which renders as the 14th
    // anywhere west of Greenwich.
    expect(toDateOnly(new Date(2026, 9, 15))).toBe('2026-10-15')
  })

  it('counts whole days between two local dates', () => {
    const today = startOfToday(new Date(2026, 9, 15))

    expect(daysBetween(today, new Date(2026, 9, 15))).toBe(0)
    expect(daysBetween(today, new Date(2026, 9, 18))).toBe(3)
    expect(daysBetween(today, new Date(2026, 9, 12))).toBe(-3)
  })

  it('crosses a month boundary without drifting', () => {
    expect(toDateOnly(new Date(2026, 0, 31))).toBe('2026-01-31')
    expect(toDateOnly(new Date(2026, 11, 1))).toBe('2026-12-01')
  })
})