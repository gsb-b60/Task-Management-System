// Issue browsing (Phase 11 §6.4). Read-only: no GitHub write API is called
// anywhere in this module, which the Board relies on when cards are dragged.
import type { GitHubIssueDto, GitHubRepositoryDto, IssueState } from "../types/domain.js";
import { AppError } from "../lib/errors.js";
import { GitHubApiError, githubFetch } from "./github.client.js";
import type { RateLimitInfo } from "./github.client.js";
import { requireGitHubToken } from "./github.token.js";
import { verifyRepositoryAccessible } from "./github.repositories.service.js";

export interface IssueQuery {
  state: "open" | "closed" | "all";
  labels?: string | undefined;
  perPage: number;
}

export interface GitHubIssueList {
  data: GitHubIssueDto[];
  rateLimit: RateLimitInfo;
}

interface GitHubIssueApi {
  number?: number;
  title?: string;
  body?: string | null;
  state?: string;
  labels?: Array<{ name?: string } | string>;
  user?: { login?: string; avatar_url?: string };
  created_at?: string;
  updated_at?: string;
  html_url?: string;
  pull_request?: unknown;
}

function mapIssue(issue: GitHubIssueApi): GitHubIssueDto | null {
  if (typeof issue.number !== "number" || typeof issue.title !== "string") return null;
  const state: IssueState = issue.state === "closed" ? "closed" : "open";
  const labels = (issue.labels ?? []).flatMap((label) =>
    typeof label === "string" ? [label] : typeof label.name === "string" ? [label.name] : [],
  );
  return {
    number: issue.number,
    title: issue.title,
    body: typeof issue.body === "string" ? issue.body : null,
    state,
    labels,
    author: {
      login: typeof issue.user?.login === "string" ? issue.user.login : "unknown",
      avatarUrl: typeof issue.user?.avatar_url === "string" ? issue.user.avatar_url : null,
    },
    createdAt: typeof issue.created_at === "string" ? issue.created_at : "",
    updatedAt: typeof issue.updated_at === "string" ? issue.updated_at : "",
    url: typeof issue.html_url === "string" ? issue.html_url : "",
  };
}

/**
 * §6.4. Resolves the repo through the caller's token first (access check and
 * owner/name in one call), then lists issues. Pull requests are excluded —
 * GitHub's issues endpoint returns both, and a PR is not an importable issue.
 */
export async function listRepositoryIssues(
  userId: string,
  githubId: bigint,
  query: IssueQuery,
): Promise<GitHubIssueList> {
  const repository: GitHubRepositoryDto = await verifyRepositoryAccessible(userId, githubId);
  const token = await requireGitHubToken(userId);

  const params = new URLSearchParams({ state: query.state, per_page: String(query.perPage) });
  if (query.labels !== undefined && query.labels !== "") {
    params.set("labels", query.labels);
  }

  try {
    const result = await githubFetch<GitHubIssueApi[]>(
      token,
      `/repos/${repository.owner}/${repository.name}/issues?${params.toString()}`,
    );
    const data = result.data
      .filter((issue) => issue.pull_request === undefined)
      .map(mapIssue)
      .filter((issue): issue is GitHubIssueDto => issue !== null);
    return { data, rateLimit: result.rateLimit };
  } catch (error) {
    if (error instanceof GitHubApiError && error.status === 404) {
      throw new AppError("NOT_FOUND", "Repository not found.");
    }
    if (error instanceof GitHubApiError && (error.status === 401 || error.status === 403)) {
      throw new AppError("FORBIDDEN", "GitHub rejected the linked account. Connect GitHub again.");
    }
    throw error;
  }
}
