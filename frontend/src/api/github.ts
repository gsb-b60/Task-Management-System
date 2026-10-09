import { apiUrl } from './client'
import type { GitHubRateLimit } from './types'

function parseCount(value: string | null): number | null {
  if (value === null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export const fetchGitHubApi = {
  /**
   * `null` means "not linked" (428) or unreachable. A 2xx means linked —
   * the body is the repo list, so connected-ness comes from the status and
   * the quota comes from the `x-ratelimit-*` headers, never the body.
   */
  async rateLimit(): Promise<GitHubRateLimit | null> {
    let response: Response
    try {
      response = await fetch(apiUrl('/github/repositories'), { credentials: 'include' })
    } catch {
      return null
    }
    if (!response.ok) return null
    // Consume the body so the connection can be reused; the payload itself
    // is irrelevant here.
    await response.json().catch(() => undefined)
    return {
      remaining: parseCount(response.headers.get('x-ratelimit-remaining')) ?? 0,
      limit: parseCount(response.headers.get('x-ratelimit-limit')),
    }
  },
}
