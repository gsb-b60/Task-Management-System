// Repository listing, access verification, and project association
// (Phase 11 §6.1–6.3). The token is read server-side only; the DTO below is
// the only shape that ever reaches the wire — no `githubAccessToken`, ever.
import type { GitHubRepositoryDto } from "../types/domain.js";
import { AppError } from "../lib/errors.js";
import { findProjectForUser } from "../repository/project.repository.js";
import {
  deleteProjectGitHubRepository,
  upsertProjectGitHubRepository,
} from "../repository/github.repository.js";
import type { NewGitHubRepositoryData } from "../repository/github.repository.js";
import type { GitHubCallResult, RateLimitInfo } from "./github.client.js";
import { GitHubApiError, githubFetch } from "./github.client.js";
import { requireGitHubToken } from "./github.token.js";

export interface GitHubRepositoryList {
  data: GitHubRepositoryDto[];
  rateLimit: RateLimitInfo;
}

/** The subset of GitHub's repo object we consume. All fields optional: a
 * malformed upstream payload degrades to skipping the entry, not a 500. */
interface GitHubRepoApi {
  id?: number;
  name?: string;
  full_name?: string;
  owner?: { login?: string };
  description?: string | null;
  visibility?: string;
  private?: boolean;
  default_branch?: string;
  html_url?: string;
}

function mapRepository(repo: GitHubRepoApi): GitHubRepositoryDto | null {
  if (
    typeof repo.id !== "number" ||
    typeof repo.name !== "string" ||
    typeof repo.full_name !== "string" ||
    typeof repo.owner?.login !== "string"
  ) {
    return null;
  }
  return {
    githubId: String(repo.id),
    name: repo.name,
    fullName: repo.full_name,
    owner: repo.owner.login,
    description: typeof repo.description === "string" ? repo.description : null,
    visibility: repo.visibility === "private" || repo.private === true ? "private" : "public",
    defaultBranch: typeof repo.default_branch === "string" ? repo.default_branch : null,
    url: typeof repo.html_url === "string" ? repo.html_url : null,
  };
}

function translateAuthRejection(error: unknown): never {
  if (error instanceof GitHubApiError && (error.status === 401 || error.status === 403)) {
    throw new AppError("FORBIDDEN", "GitHub rejected the linked account. Connect GitHub again.");
  }
  throw error;
}

/** §6.1 — the caller's first page of repositories (no pagination crawl). */
export async function listGitHubRepositories(userId: string): Promise<GitHubRepositoryList> {
  const token = await requireGitHubToken(userId);
  try {
    const result: GitHubCallResult<GitHubRepoApi[]> = await githubFetch<GitHubRepoApi[]>(
      token,
      "/user/repos?per_page=30&sort=updated",
    );
    const data = result.data
      .map(mapRepository)
      .filter((repo): repo is GitHubRepositoryDto => repo !== null);
    return { data, rateLimit: result.rateLimit };
  } catch (error) {
    return translateAuthRejection(error);
  }
}

/**
 * §6.2 pre-check: the repo must be reachable with *this* caller's token.
 * 404/403 upstream means "not accessible to the caller" → 403, never 404 —
 * the difference between "does not exist" and "not yours" is not ours to leak.
 */
export async function verifyRepositoryAccessible(
  userId: string,
  githubId: bigint,
): Promise<GitHubRepositoryDto> {
  const token = await requireGitHubToken(userId);
  try {
    const result = await githubFetch<GitHubRepoApi>(token, `/repositories/${githubId.toString()}`);
    const mapped = mapRepository(result.data);
    if (mapped === null) {
      throw new AppError("FORBIDDEN", "Repository is not accessible with your GitHub account.");
    }
    return mapped;
  } catch (error) {
    if (error instanceof GitHubApiError && (error.status === 404 || error.status === 403)) {
      throw new AppError("FORBIDDEN", "Repository is not accessible with your GitHub account.");
    }
    if (error instanceof GitHubApiError) return translateAuthRejection(error);
    throw error;
  }
}

/** §6.2 — verify first, then persist the association on the caller's project. */
export async function associateRepository(
  userId: string,
  projectId: string,
  githubId: bigint,
): Promise<GitHubRepositoryDto> {
  const project = await findProjectForUser(projectId, userId);
  if (project === null) {
    throw new AppError("NOT_FOUND", "Project not found.");
  }
  const repo = await verifyRepositoryAccessible(userId, githubId);
  const data: NewGitHubRepositoryData = {
    githubId,
    name: repo.name,
    fullName: repo.fullName,
    owner: repo.owner,
    description: repo.description,
    visibility: repo.visibility,
    defaultBranch: repo.defaultBranch,
    url: repo.url,
  };
  await upsertProjectGitHubRepository(projectId, data);
  return repo;
}

/** §6.3 — idempotent removal; imported tasks survive via `SET NULL`. */
export async function dissociateRepository(userId: string, projectId: string): Promise<void> {
  const project = await findProjectForUser(projectId, userId);
  if (project === null) {
    throw new AppError("NOT_FOUND", "Project not found.");
  }
  await deleteProjectGitHubRepository(projectId);
}
