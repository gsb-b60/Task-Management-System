import { ApiError } from '../client'
import type { DashboardApi, GitHubApi, ProjectsApi, TasksApi } from '../auth'
import type {
  DashboardResponse,
  DashboardStats,
  Paginated,
  ProjectListItem,
  Task,
  TaskStatus,
} from '../types'
import { getDb } from './db'
import { delay, resolveScenario } from './overrides'

const UPCOMING_LIMIT = 5

function guardError(): void {
  if (resolveScenario() === 'error') {
    throw new ApiError('INTERNAL_ERROR', 'Could not load the dashboard.', 500)
  }
}

function scopedTasks(projectId?: string): Task[] {
  const tasks = getDb().tasks
  return projectId ? tasks.filter((task) => task.projectId === projectId) : tasks
}

/**
 * `isOverdue` and `daysUntilDue` are already on the task. Recomputing them
 * here from a client clock would disagree with the server in another
 * timezone (Phase 06 §4.1), so this only counts what the server sent.
 */
function summarise(tasks: Task[]): DashboardStats {
  const byStatus: Record<TaskStatus, number> = {
    TODO: 0,
    IN_PROGRESS: 0,
    DONE: 0,
  }
  for (const task of tasks) {
    byStatus[task.status] += 1
  }

  return {
    total: tasks.length,
    // Every key is present, so a tile renders 0 rather than blank.
    byStatus,
    overdue: tasks.filter((task) => task.isOverdue).length,
    dueToday: tasks.filter((task) => !task.isOverdue && task.daysUntilDue === 0).length,
  }
}

function upcoming(tasks: Task[]): Task[] {
  return tasks
    .filter((task) => task.status !== 'DONE' && task.dueDate !== null)
    .sort((a, b) => {
      if (a.daysUntilDue === null) return 1
      if (b.daysUntilDue === null) return -1
      return a.daysUntilDue - b.daysUntilDue
    })
    .slice(0, UPCOMING_LIMIT)
}

export const mockDashboardApi: DashboardApi = {
  async get(params): Promise<DashboardResponse> {
    await delay()
    guardError()

    if (resolveScenario() === 'empty') {
      return {
        stats: { total: 0, byStatus: { TODO: 0, IN_PROGRESS: 0, DONE: 0 }, overdue: 0, dueToday: 0 },
        upcoming: [],
      }
    }

    const tasks = scopedTasks(params?.projectId)
    return { stats: summarise(tasks), upcoming: upcoming(tasks) }
  },
}

export const mockTasksApi: TasksApi = {
  async list(params): Promise<Paginated<Task>> {
    await delay()
    guardError()

    const page = params?.page ?? 1
    const pageSize = params?.pageSize ?? 20

    let tasks = scopedTasks(params?.projectId)

    if (resolveScenario() === 'empty') tasks = []
    if (params?.q) {
      const needle = params.q.toLowerCase()
      tasks = tasks.filter((task) => task.title.toLowerCase().includes(needle))
    }
    if (params?.status) {
      tasks = tasks.filter((task) => task.status === params.status)
    }
    if (params?.priority) {
      tasks = tasks.filter((task) => task.priority === params.priority)
    }

    const totalItems = tasks.length
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
    const start = (page - 1) * pageSize

    return {
      data: tasks.slice(start, start + pageSize),
      meta: { page, pageSize, totalItems, totalPages },
    }
  },
}

export const mockProjectsApi: ProjectsApi = {
  async list(): Promise<ProjectListItem[]> {
    await delay()
    guardError()

    const db = getDb()
    if (resolveScenario() === 'empty') return []

    return db.projects.map((project) => ({
      id: project.id,
      name: project.name,
      color: project.color,
      taskCount: db.tasks.filter((task) => task.projectId === project.id).length,
      repository: project.repository,
    }))
  },
}

export const mockGitHubApi: GitHubApi = {
  async rateLimit() {
    await delay()
    return getDb().githubRateLimit
  },
}