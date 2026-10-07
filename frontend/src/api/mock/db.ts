import type { Task, TaskPriority, TaskStatus } from '../types'

/**
 * In-memory fixture behind the mock API layer. Counts are the mockup's own
 * fixtures (mockup/screens/dashboard.html) so the UI matches the design
 * reference rather than invented numbers:
 *
 *   total 137 · TODO 37 · IN_PROGRESS 52 · DONE 48 · overdue 6 · due today 3
 *   Portfolio Website 12 · 4 / 3 / 5 · 2 overdue · 1 due today
 */

export const DEMO_EMAIL = 'ada@example.com'
export const DEMO_PASSWORD = 'taskstream1'

interface StoredUser {
  id: string
  email: string
  displayName?: string
  /** Mock-only. The real API stores a bcrypt hash and never returns one. */
  password: string
  createdAt: string
  githubConnected: boolean
}

export interface StoredProject {
  id: string
  name: string
  color: string | null
  repository: { githubId: string; fullName: string; isPrivate: boolean } | null
}

export interface Db {
  users: StoredUser[]
  projects: StoredProject[]
  tasks: Task[]
  /** Session token → user id. Stands in for the HttpOnly cookie. */
  sessions: Map<string, string>
  githubRateLimit: { remaining: number; limit: number }
  loginAttempts: number
}

let idCounter = 0

/** Deterministic, uuid-shaped. Stable ids keep assertions readable. */
export function nextId(): string {
  idCounter += 1
  return `0f9c8a3e-2b71-4d55-9c18-${idCounter.toString(16).padStart(12, '0')}`
}

export function startOfToday(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

/**
 * Date-only strings are local. `new Date('2026-10-15')` is UTC midnight and
 * renders as the 14th anywhere west of Greenwich (Phase 02, Phase 09).
 */
export function toDateOnly(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date.getTime())
  copy.setDate(copy.getDate() + days)
  return copy
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round(
    (startOfToday(to).getTime() - startOfToday(from).getTime()) / 86_400_000,
  )
}

const TITLES = [
  'Replace the hero image pipeline',
  'Add sitemap generation to the docs build',
  'Audit colour contrast on the empty states',
  'Cache the GitHub repository list',
  'Wire the roadmap scale toggle',
  'Move the session cookie to SameSite=lax',
  'Add keyboard parity to the board columns',
  'Retry the deadline reminder job',
  'Type the project switcher menu',
  'Compress the uploaded screenshots',
  'Write the 404 copy',
  'Fix the overdue flag across timezones',
  'Paginate the task table server-side',
  'Trim the dashboard payload',
  'Add a loading state to the auth splash',
  'Restyle the priority pills',
  'Guard the redirect parameter',
  'Persist the last used project',
  'Extract the fetcher into a module',
  'Sort upcoming tasks by due date',
  'Hide the sidebar below 1024px',
  'Seed a GitHub-linked project',
  'Debounce the search input',
  'Close the user menu on Escape',
  'Render zero for absent statuses',
  'Escape the task title in the tooltip',
  'Roll back a failed status change',
  'Publish an OpenAPI document',
  'Verify the deploy migration step',
  'Tag the release candidate',
]

const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH']

/**
 * Days from today for each task in a run. Negative is overdue, `null` leaves
 * the task undated so the roadmap's "no due date" lane has data.
 */
type DueOffsets = (number | null)[]

interface Run {
  projectId: string | null
  statuses: TaskStatus[]
  dueOffsets: DueOffsets
  /** How many of the run's undated, unfinished tasks become overdue. */
  overdueCount: number
  /** …and how many become due today. */
  dueTodayCount: number
}

const PORTFOLIO_STATUSES: TaskStatus[] = [
  'TODO',
  'IN_PROGRESS',
  'DONE',
  'TODO',
  'DONE',
  'IN_PROGRESS',
  'DONE',
  'TODO',
  'DONE',
  'TODO',
  'DONE',
  'IN_PROGRESS',
]

const DOCS_STATUSES: TaskStatus[] = [
  'TODO',
  'IN_PROGRESS',
  'DONE',
  'TODO',
  'IN_PROGRESS',
  'DONE',
  'IN_PROGRESS',
  'TODO',
  'DONE',
  'IN_PROGRESS',
  'DONE',
  'IN_PROGRESS',
  'TODO',
  'DONE',
  'IN_PROGRESS',
  'TODO',
  'IN_PROGRESS',
  'IN_PROGRESS',
]

/**
 * Picks the status with the most remaining work relative to its target, so
 * the counts land exactly and no status sits in one contiguous block.
 */
function distribute(quotas: Record<TaskStatus, number>): TaskStatus[] {
  const remaining = { ...quotas }
  const total = Object.values(remaining).reduce((sum, count) => sum + count, 0)
  const result: TaskStatus[] = []

  for (let step = 1; step <= total; step += 1) {
    let pick: TaskStatus = 'TODO'
    let bestScore = -Infinity
    for (const status of Object.keys(remaining) as TaskStatus[]) {
      const score = (remaining[status] / total) * step
      if (score > bestScore && remaining[status] > 0) {
        bestScore = score
        pick = status
      }
    }
    remaining[pick] -= 1
    result.push(pick)
  }

  return result
}

/**
 * The status layout of the 107 unscoped tasks. Generated rather than spelled
 * out, with the counts as the contract — the interleaving just keeps a status
 * from sitting in one contiguous block.
 */
function unscopedStatuses(): TaskStatus[] {
  return distribute({ TODO: 28, IN_PROGRESS: 41, DONE: 38 })
}

/** Days back for the overdue fixtures, spread so they do not all match. */
const OVERDUE_OFFSETS = [-4, -1, -3, -2]

function buildTasks(projects: StoredProject[], today: Date): Task[] {
  const [portfolio, , docs] = projects
  const unscoped = unscopedStatuses()

  const runs: Run[] = [
    {
      projectId: portfolio.id,
      statuses: PORTFOLIO_STATUSES,
      dueOffsets: [-4, -1, 3, 0, 5, 9, 14, 21, 30, 45, 60, 120],
      overdueCount: 0,
      dueTodayCount: 0,
    },
    {
      projectId: docs.id,
      statuses: DOCS_STATUSES,
      dueOffsets: [
        3, 7, 11, 18, 26, null, 40, 75, 5, 12, 20, null, 33, 55, 90, 150, 60, null,
      ],
      overdueCount: 0,
      dueTodayCount: 0,
    },
    {
      projectId: null,
      statuses: unscoped,
      dueOffsets: unscoped.map((_, index) => {
        // Every seventh task is left undated, which gives the roadmap's
        // "no due date" lane something to show. Seven rather than nine: the
        // status cycle is length three, and a period that shares a factor with
        // it would put every undated task on the same status — and a DONE task
        // can never be overdue, which would quietly zero the fixtures.
        return index % 7 === 3 ? null : 2 + ((index * 7) % 120)
      }),
      overdueCount: 4,
      dueTodayCount: 2,
    },
  ]

  const tasks = runs.flatMap((run, runIndex) =>
    run.statuses.map((status, index) => {
      const globalIndex = runIndex === 0 ? index : runIndex === 1 ? 12 + index : 30 + index
      const offset = run.dueOffsets[index]
      const dueDate = offset === null || offset === undefined ? null : toDateOnly(addDays(today, offset))
      const startDate = toDateOnly(addDays(today, -21 - (globalIndex % 30)))

      return {
        id: nextId(),
        title: TITLES[globalIndex % TITLES.length],
        description: 'Seeded from the Task Stream mockup fixtures.',
        status,
        priority: PRIORITIES[(globalIndex + runIndex) % 3],
        startDate,
        dueDate,
        isOverdue: status !== 'DONE' && offset !== null && offset !== undefined && offset < 0,
        daysUntilDue: offset === null || offset === undefined ? null : offset,
        projectId: run.projectId,
        createdAt: addDays(today, -30).toISOString(),
        updatedAt: addDays(today, -1).toISOString(),
      } satisfies Task
    }),
  )

  applyUrgentDates(tasks, runs, today)
  return tasks
}

/**
 * Assigns the overdue and due-today fixtures from the run's undated,
 * unfinished tasks. Picking by status rather than by index means the counts
 * hold even if the interleaving above is reshuffled: a `DONE` task can never be
 * dragged into the overdue set just because it landed on a lucky index.
 */
function applyUrgentDates(tasks: Task[], runs: Run[], today: Date) {
  let cursor = 0

  for (const run of runs) {
    const candidates = tasks
      .slice(cursor, cursor + run.statuses.length)
      .filter((task) => task.status !== 'DONE' && task.dueDate === null)

    const overdue = candidates.slice(0, run.overdueCount)
    overdue.forEach((task, index) => {
      const offset = OVERDUE_OFFSETS[index % OVERDUE_OFFSETS.length]
      task.dueDate = toDateOnly(addDays(today, offset))
      task.daysUntilDue = offset
      task.isOverdue = true
    })

    const dueToday = candidates.slice(run.overdueCount, run.overdueCount + run.dueTodayCount)
    for (const task of dueToday) {
      task.dueDate = toDateOnly(today)
      task.daysUntilDue = 0
      task.isOverdue = false
    }

    cursor += run.statuses.length
  }
}

export function createDb(): Db {
  const today = startOfToday()
  const projects: StoredProject[] = [
    {
      id: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
      name: 'Portfolio Website',
      color: '#0969da',
      repository: { githubId: '481692338', fullName: 'ada/portfolio', isPrivate: false },
    },
    {
      id: 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb',
      name: 'Task Stream',
      color: null,
      repository: null,
    },
    {
      id: 'cccccccc-3333-4333-8333-cccccccccccc',
      name: 'docs-site',
      color: '#d0d7de',
      repository: { githubId: '512039812', fullName: 'ada/docs-site', isPrivate: true },
    },
  ]

  return {
    users: [
      {
        id: '0f9c8a3e-2b71-4d55-9c18-7a4e0b3d6f12',
        email: DEMO_EMAIL,
        displayName: 'Ada Lovelace',
        password: DEMO_PASSWORD,
        createdAt: addDays(today, -60).toISOString(),
        githubConnected: true,
      },
    ],
    projects,
    tasks: buildTasks(projects, today),
    sessions: new Map(),
    githubRateLimit: { remaining: 4812, limit: 5000 },
    loginAttempts: 0,
  }
}

let db = createDb()

/** Test hook — resets the fixture so one test cannot leak into the next. */
export function resetDb(): void {
  db = createDb()
  idCounter = 0
}

export function getDb(): Db {
  return db
}

export function findUserByEmail(email: string): StoredUser | undefined {
  return db.users.find((user) => user.email === email.toLowerCase())
}

export function findUserById(id: string): StoredUser | undefined {
  return db.users.find((user) => user.id === id)
}