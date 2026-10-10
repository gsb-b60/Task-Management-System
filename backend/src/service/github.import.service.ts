// Issue import (Phase 11 §6.5). The idempotency contract: the unique
// `(githubRepositoryId, githubIssueNumber)` constraint makes duplicates
// impossible; the pre-check makes them unlikely, so retries are safe.
import type { IssueState, TaskStatus } from "../types/domain.js";
import { AppError } from "../lib/errors.js";
import {
  createImportedTasks,
  findExistingIssueNumbers,
  findGitHubRepositoryByProject,
} from "../repository/github.repository.js";
import type { ImportedIssueData } from "../repository/github.repository.js";
import { findProjectForUser } from "../repository/project.repository.js";
import { GitHubApiError, githubFetch, githubFetchAll } from "./github.client.js";
import { requireGitHubToken } from "./github.token.js";

export interface ImportResult {
  imported: number[];
  skipped: number[];
}

interface GitHubIssueApi {
  number?: number;
  title?: string;
  body?: string | null;
  state?: string;
  labels?: Array<{ name?: string } | string>;
  pull_request?: unknown;
}

/**
 * GitHub issues only know `open`/`closed` — "in progress" comes from labels.
 * Matching is case-insensitive over the trimmed label.
 */
const IN_PROGRESS_LABELS = new Set(["in progress", "in-progress", "in_progress", "wip"]);

export function mapIssueState(githubState: IssueState, labels: string[]): TaskStatus {
  if (githubState === "closed") return "DONE";
  if (labels.some((label) => IN_PROGRESS_LABELS.has(label.trim().toLowerCase()))) {
    return "IN_PROGRESS";
  }
  return "TODO";
}

function issueLabels(issue: GitHubIssueApi): string[] {
  return (issue.labels ?? []).flatMap((label) =>
    typeof label === "string" ? [label] : typeof label.name === "string" ? [label.name] : [],
  );
}

function toImportedIssue(issue: GitHubIssueApi, fallbackNumber: number): ImportedIssueData {
  const title =
    typeof issue.title === "string" && issue.title.trim() !== ""
      ? issue.title
      : `Issue #${fallbackNumber}`;
  const state: IssueState = issue.state === "closed" ? "closed" : "open";
  return {
    number: fallbackNumber,
    title,
    description: typeof issue.body === "string" ? issue.body : null,
    state,
    // Explicit imports keep status independence: everything lands in TODO.
    status: "TODO",
  };
}

export async function importIssues(
  userId: string,
  projectId: string,
  issueNumbers: number[],
): Promise<ImportResult> {
  const project = await findProjectForUser(projectId, userId);
  if (project === null) {
    throw new AppError("NOT_FOUND", "Project not found.");
  }
  const repository = await findGitHubRepositoryByProject(projectId);
  if (repository === null) {
    throw new AppError("NOT_FOUND", "No GitHub repository is linked to this project.");
  }
  const token = await requireGitHubToken(userId);

  const unique = [...new Set(issueNumbers)].sort((a, b) => a - b);
  const existing = await findExistingIssueNumbers(repository.id, unique);
  const skipped = unique.filter((number) => existing.has(number));
  const missing = unique.filter((number) => !existing.has(number));

  const issues: ImportedIssueData[] = [];
  for (const number of missing) {
    let issue: GitHubIssueApi;
    try {
      const result = await githubFetch<GitHubIssueApi>(
        token,
        `/repos/${repository.owner}/${repository.name}/issues/${number}`,
      );
      issue = result.data;
    } catch (error) {
      if (error instanceof GitHubApiError && (error.status === 404 || error.status === 422)) {
        throw new AppError(
          "UNPROCESSABLE",
          `Issue #${number} does not exist in ${repository.fullName}.`,
        );
      }
      throw error;
    }
    if (issue.pull_request !== undefined) {
      throw new AppError(
        "UNPROCESSABLE",
        `#${number} is a pull request, not an issue in ${repository.fullName}.`,
      );
    }
    issues.push(toImportedIssue(issue, number));
  }

    await createImportedTasks(userId, projectId, repository.id, issues);
  return { imported: missing, skipped };
}

/**
 * Takes *every* issue on the linked repository (open and closed, paginated)
 * and imports the missing ones, mapping GitHub state + labels onto Kanban
 * status. Idempotent: re-running imports only what is still missing.
 */
export async function importAllIssues(
  userId: string,
  projectId: string,
): Promise<ImportResult> {
  const project = await findProjectForUser(projectId, userId);
  if (project === null) {
    throw new AppError("NOT_FOUND", "Project not found.");
  }
  const repository = await findGitHubRepositoryByProject(projectId);
  if (repository === null) {
    throw new AppError("NOT_FOUND", "No GitHub repository is linked to this project.");
  }
  const token = await requireGitHubToken(userId);

  const { data } = await githubFetchAll<GitHubIssueApi>(
    token,
    `/repos/${repository.owner}/${repository.name}/issues?state=all&per_page=100`,
  );
  const candidates = data
    .filter((issue) => issue.pull_request === undefined)
    .flatMap((issue) => {
      if (typeof issue.number !== "number" || typeof issue.title !== "string") return [];
      const labels = issueLabels(issue);
      const state: IssueState = issue.state === "closed" ? "closed" : "open";
      const entry: ImportedIssueData = {
        number: issue.number,
        title: issue.title.trim() !== "" ? issue.title : `Issue #${issue.number}`,
        description: typeof issue.body === "string" ? issue.body : null,
        state,
        status: mapIssueState(state, labels),
      };
      return [entry];
    });

  const numbers = candidates.map((issue) => issue.number);
  const existing = await findExistingIssueNumbers(repository.id, numbers);
  const fresh = candidates.filter((issue) => !existing.has(issue.number));

  await createImportedTasks(userId, projectId, repository.id, fresh);
  return {
    imported: fresh.map((issue) => issue.number),
    skipped: numbers.filter((number) => existing.has(number)),
  };
}
