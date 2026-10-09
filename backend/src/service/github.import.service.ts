// Issue import (Phase 11 §6.5). The idempotency contract: the unique
// `(githubRepositoryId, githubIssueNumber)` constraint makes duplicates
// impossible; the pre-check makes them unlikely, so retries are safe.
import type { IssueState } from "../types/domain.js";
import { AppError } from "../lib/errors.js";
import {
  createImportedTasks,
  findExistingIssueNumbers,
  findGitHubRepositoryByProject,
} from "../repository/github.repository.js";
import type { ImportedIssueData } from "../repository/github.repository.js";
import { findProjectForUser } from "../repository/project.repository.js";
import { GitHubApiError, githubFetch } from "./github.client.js";
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
  pull_request?: unknown;
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
