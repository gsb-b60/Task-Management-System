import { request } from './client'
import type { Project, ProjectListItem } from './types'

export interface ProjectsApi {
  list(): Promise<ProjectListItem[]>

  get(id: string): Promise<Project>

  create(input: {
    name: string
    description?: string | null
    startDate?: string | null
    targetDate?: string | null
  }): Promise<Project>

  update(id: string, input: {
    name?: string
    description?: string | null
    startDate?: string | null
    targetDate?: string | null
  }): Promise<Project>

  delete(id: string): Promise<void>
}

export const fetchProjectsApi: ProjectsApi = {
  async list() {
    return request<ProjectListItem[]>('/projects')
  },

  async get(id) {
    return request<Project>(`/projects/${id}`)
  },

  async create(input) {
    return request<Project>('/projects', { method: 'POST', body: input })
  },

  async update(id, input) {
    return request<Project>(`/projects/${id}`, { method: 'PATCH', body: input })
  },

  async delete(id) {
    await request<void>(`/projects/${id}`, { method: 'DELETE' })
  },
}