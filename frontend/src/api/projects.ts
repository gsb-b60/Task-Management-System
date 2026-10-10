import { request } from './client'
import type { FromGitHubItem, FromGitHubResult, Project, ProjectListItem } from './types'

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

  /**
   * One project per repository, each linked on creation. Partial success:
   * duplicates and inaccessible repos come back in `skipped`, never failing
   * their siblings.
   */
  createFromGitHub(items: FromGitHubItem[]): Promise<FromGitHubResult>

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

  async createFromGitHub(items) {
    return request<FromGitHubResult>('/projects/from-github', { method: 'POST', body: { items } })
  },

  async update(id, input) {
    return request<Project>(`/projects/${id}`, { method: 'PATCH', body: input })
  },

  async delete(id) {
    await request<void>(`/projects/${id}`, { method: 'DELETE' })
  },
}