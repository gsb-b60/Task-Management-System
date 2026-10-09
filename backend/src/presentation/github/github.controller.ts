import type { Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import type { RateLimitInfo } from "../../service/github.client.js";
import { currentUser } from "../../middleware/requireAuth.js";
import {
  associateRepository,
  dissociateRepository,
  importIssues,
  listGitHubRepositories,
  listRepositoryIssues,
} from "../../service/index.js";
import type { ImportIssuesBody, IssuesQuery, LinkRepositoryBody } from "./github.schemas.js";
import { importIssuesBody, issuesQuery, linkRepositoryBody } from "./github.schemas.js";

function projectIdParam(req: Request): string {
  const id: unknown = req.params["id"];
  if (typeof id !== "string" || id === "") {
    throw new AppError("NOT_FOUND", "Project not found.");
  }
  return id;
}

function githubIdParam(req: Request): bigint {
  const raw: unknown = req.params["githubId"];
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) {
    throw new AppError("NOT_FOUND", "Repository not found.");
  }
  return BigInt(raw);
}

/** §7: surface GitHub's remaining quota alongside any proxied response. */
function setRateHeaders(res: Response, rateLimit: RateLimitInfo): void {
  if (rateLimit.remaining !== null) {
    res.setHeader("x-ratelimit-remaining", rateLimit.remaining);
  }
  if (rateLimit.limit !== null) {
    res.setHeader("x-ratelimit-limit", rateLimit.limit);
  }
}

export async function listRepositories(req: Request, res: Response): Promise<void> {
  const { data, rateLimit } = await listGitHubRepositories(currentUser(req).id);
  setRateHeaders(res, rateLimit);
  res.status(200).json({ data });
}

export async function linkRepository(req: Request, res: Response): Promise<void> {
  const body = linkRepositoryBody.parse(req.body) satisfies LinkRepositoryBody;
  const repository = await associateRepository(
    currentUser(req).id,
    projectIdParam(req),
    body.githubId,
  );
  res.status(200).json({ data: repository });
}

export async function unlinkRepository(req: Request, res: Response): Promise<void> {
  await dissociateRepository(currentUser(req).id, projectIdParam(req));
  res.status(204).end();
}

export async function listIssues(req: Request, res: Response): Promise<void> {
  const query = issuesQuery.parse(req.query) satisfies IssuesQuery;
  const { data, rateLimit } = await listRepositoryIssues(currentUser(req).id, githubIdParam(req), {
    state: query.state,
    labels: query.labels,
    perPage: query.perPage,
  });
  setRateHeaders(res, rateLimit);
  res.status(200).json({ data });
}

export async function importProjectIssues(req: Request, res: Response): Promise<void> {
  const body = importIssuesBody.parse(req.body) satisfies ImportIssuesBody;
  const result = await importIssues(currentUser(req).id, projectIdParam(req), body.issueNumbers);
  res.status(200).json({ data: result });
}
