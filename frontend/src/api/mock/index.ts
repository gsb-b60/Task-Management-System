import type {
  DashboardResponse,
  DashboardStats,
  ProjectListItem,
  Task,
  TaskPriority,
  TaskStatus,
  Paginated,
} from '../types'

const PORTFOLIO = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
const STREAM = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb'

const mockProjects: ProjectListItem[] = [
  {
    id: PORTFOLIO,
    name: 'Portfolio',
    description: 'Main portfolio project',
    startDate: '2024-01-01',
    targetDate: '2024-12-31',
    color: '#3b82f6',
    taskCount: 137,
    completedTaskCount: 48,
    repository: null,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: STREAM,
    name: 'Stream',
    description: 'Stream processing project',
    startDate: '2024-02-01',
    targetDate: '2024-11-30',
    color: '#10b981',
    taskCount: 52,
    completedTaskCount: 12,
    repository: null,
    createdAt: '2024-02-01T00:00:00Z',
  },
]

const mockTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Design system',
    description: 'Create design system',
    status: 'TODO',
    priority: 'HIGH',
    startDate: '2024-01-15',
    dueDate: '2024-01-20',
    projectId: PORTFOLIO,
    githubIssueNumber: null,
    githubState: null,
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
    isOverdue: false,
    daysUntilDue: 5,
  },
  {
    id: 'task-2',
    title: 'API integration',
    description: 'Integrate with external API',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    startDate: '2024-01-10',
    dueDate: '2024-01-25',
    projectId: PORTFOLIO,
    githubIssueNumber: 42,
    githubState: 'open',
    createdAt: '2024-01-08T00:00:00Z',
    updatedAt: '2024-01-12T00:00:00Z',
    isOverdue: false,
    daysUntilDue: 10,
  },
  {
    id: 'task-3',
    title: 'Database migration',
    description: 'Migrate to new schema',
    status: 'DONE',
    priority: 'HIGH',
    startDate: '2024-01-01',
    dueDate: '2024-01-10',
    projectId: STREAM,
    githubIssueNumber: null,
    githubState: null,
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
    isOverdue: false,
    daysUntilDue: null,
  },
]

const mockDashboardStats: DashboardStats = {
  total: 137,
  byStatus: {
    TODO: 37,
    IN_PROGRESS: 52,
    DONE: 48,
  },
  overdue: 12,
  dueToday: 8,
}

const mockUpcoming: Task[] = mockTasks.slice(0, 2)

interface MockUser {
  id: string
  email: string
  displayName: string
  createdAt: string
}

interface MockScenario {
  dashboard: { stats: DashboardStats; upcoming: Task[] } | null
  projects: ProjectListItem[] | null
  tasks: Paginated<Task> | null
  user: MockUser | null
}

const scenarios: Record<'default' | 'empty' | 'unauthenticated', MockScenario> = {
  default: {
    dashboard: {
      stats: mockDashboardStats,
      upcoming: mockUpcoming,
    },
    projects: mockProjects,
    tasks: { data: mockTasks, meta: { page: 1, pageSize: 20, totalItems: mockTasks.length, totalPages: 1, hasNextPage: false, hasPreviousPage: false } },
    user: { id: 'user-1', email: 'test@example.com', displayName: 'Test User', createdAt: '2024-01-01T00:00:00Z' },
  },
  empty: {
    dashboard: {
      stats: { total: 0, byStatus: { TODO: 0, IN_PROGRESS: 0, DONE: 0 }, overdue: 0, dueToday: 0 },
      upcoming: [],
    },
    projects: [],
    tasks: { data: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false } },
    user: { id: 'user-1', email: 'test@example.com', displayName: 'Test User', createdAt: '2024-01-01T00:00:00Z' },
  },
  unauthenticated: {
    dashboard: null,
    projects: null,
    tasks: null,
    user: null,
  },
}

let currentScenario: keyof typeof scenarios = 'default'

export function setScenario(name: keyof typeof scenarios) {
  if (scenarios[name]) {
    currentScenario = name
  }
}

export function getScenario() {
  return scenarios[currentScenario]
}

export const mockAuthApi = {
  async register() {
    return scenarios[currentScenario].user
  },
  async login() {
    return scenarios[currentScenario].user
  },
  async logout() {},
  async me() {
    return scenarios[currentScenario].user
  },
  githubAuthorizeUrl() {
    return 'https://github.com/login/oauth/authorize?client_id=test'
  },
}

export const mockDashboardApi = {
  async get(params?: { projectId?: string; page?: number; pageSize?: number }) {
    const dashboard = scenarios[currentScenario].dashboard
    if (!dashboard) return null as unknown as DashboardResponse
    const pageSize = Math.min(100, Math.max(1, params?.pageSize ?? 10))
    const page = Math.max(1, params?.page ?? 1)
    const totalItems = dashboard.upcoming.length
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize)
    return {
      stats: dashboard.stats,
      upcoming: dashboard.upcoming.slice((page - 1) * pageSize, page * pageSize),
      meta: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    }
  },
}

export const mockProjectsApi = {
  async list() {
    return scenarios[currentScenario].projects as ProjectListItem[]
  },
  async get(id: string) {
    return scenarios[currentScenario].projects!.find((p: ProjectListItem) => p.id === id) as ProjectListItem
  },
  async create(input: { name: string; description?: string | null; startDate?: string | null; targetDate?: string | null }) {
    const newProject: ProjectListItem = {
      id: `project-${Date.now()}`,
      ...input,
      color: '#3b82f6',
      taskCount: 0,
      completedTaskCount: 0,
      repository: null,
      createdAt: new Date().toISOString(),
    }
    scenarios[currentScenario].projects!.push(newProject)
    return newProject
  },
  async update(id: string, input: Partial<ProjectListItem>) {
    const projects = scenarios[currentScenario].projects!
    const idx = projects.findIndex((p: ProjectListItem) => p.id === id)
    if (idx >= 0) {
      projects[idx] = { ...projects[idx], ...input }
    }
    return projects[idx] as ProjectListItem
  },
  async delete(id: string) {
    scenarios[currentScenario].projects = scenarios[currentScenario].projects!.filter((p: ProjectListItem) => p.id !== id)
  },
}

export const mockTasksApi = {
  async list(params?: {
    projectId?: string
    q?: string
    status?: TaskStatus | TaskStatus[]
    priority?: TaskPriority | TaskPriority[]
    hasDueDate?: boolean
    page?: number
    pageSize?: number
    sortBy?: string
    sortOrder?: string
  }) {
    const stored = scenarios[currentScenario].tasks as Paginated<Task> | null
    if (!stored) return stored as unknown as Paginated<Task>
    let rows = [...stored.data]
    if (params?.projectId !== undefined) {
      rows = rows.filter((t) => t.projectId === params.projectId)
    }
    if (params?.status !== undefined) {
      const wanted = Array.isArray(params.status) ? params.status : [params.status]
      rows = rows.filter((t) => wanted.includes(t.status))
    }
    if (params?.priority !== undefined) {
      const wanted = Array.isArray(params.priority) ? params.priority : [params.priority]
      rows = rows.filter((t) => wanted.includes(t.priority))
    }
    if (params?.hasDueDate !== undefined) {
      rows = rows.filter((t) =>
        params.hasDueDate ? t.dueDate !== null : t.dueDate === null,
      )
    }
    if (params?.q !== undefined && params.q !== '') {
      const q = params.q.toLowerCase()
      rows = rows.filter((t) => t.title.toLowerCase().includes(q))
    }
    const sortBy = params?.sortBy ?? 'dueDate'
    const direction = params?.sortOrder === 'desc' ? -1 : 1
    const keyOf = (t: Task): string => {
      switch (sortBy) {
        case 'createdAt':
          return t.createdAt
        case 'title':
          return t.title
        default:
          return t.dueDate ?? ''
      }
    }
    rows.sort((a, b) => {
      const ka = keyOf(a)
      const kb = keyOf(b)
      // Undated tasks sort last ascending, first descending (mirrors the API).
      if (sortBy === 'dueDate') {
        if (ka === '' && kb !== '') return direction === 1 ? 1 : -1
        if (ka !== '' && kb === '') return direction === 1 ? -1 : 1
      }
      if (ka < kb) return -direction
      if (ka > kb) return direction
      return a.id < b.id ? -1 : 1
    })
    const pageSize = Math.min(100, Math.max(1, params?.pageSize ?? 20))
    const page = Math.max(1, params?.page ?? 1)
    const totalItems = rows.length
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize)
    return {
      data: rows.slice((page - 1) * pageSize, page * pageSize),
      meta: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    }
  },
  async get(id: string) {
    return scenarios[currentScenario].tasks!.data.find((t: Task) => t.id === id) as Task
  },
  async create(input: Partial<Task>) {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: input.title || '',
      description: input.description || null,
      status: input.status || 'TODO',
      priority: input.priority || 'MEDIUM',
      startDate: input.startDate || null,
      dueDate: input.dueDate || null,
      projectId: input.projectId || null,
      githubIssueNumber: null,
      githubState: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isOverdue: false,
      daysUntilDue: null,
    }
    scenarios[currentScenario].tasks!.data.push(newTask)
    return newTask
  },
  async update(id: string, input: Partial<Task>) {
    const taskList = scenarios[currentScenario].tasks!.data
    const idx = taskList.findIndex((t: Task) => t.id === id)
    if (idx >= 0) {
      taskList[idx] = { ...taskList[idx], ...input }
    }
    return taskList[idx] as Task
  },
  async delete(id: string) {
    scenarios[currentScenario].tasks!.data = scenarios[currentScenario].tasks!.data.filter((t: Task) => t.id !== id)
  },
}

export const mockGitHubApi = {
  async rateLimit() {
    return { remaining: 5000, limit: 5000 }
  },
}

export const mockDataApi = {
  dashboard: mockDashboardApi,
  projects: mockProjectsApi,
  tasks: mockTasksApi,
  github: mockGitHubApi,
}