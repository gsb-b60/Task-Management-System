import { request } from './client'
import type { GitHubRateLimit } from './types'

export const fetchGitHubApi = {
  async rateLimit(): Promise<GitHubRateLimit | null> {
    try {
      const data = await request<{ data: { remaining: number; limit: number } }>('/github/repositories')
      return data.data ? { remaining: data.data.remaining, limit: data.data.limit } : null
    } catch {
      // If GitHub is not connected (428 PRECONDITION_FAILED) or unauthorized, return null
      return null
    }
  },
}