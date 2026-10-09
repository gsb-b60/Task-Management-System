// GitHub token lookup (Phase 11 §6): every GitHub endpoint begins by proving
// the account actually completed GitHub sign-in. 428 (PRECONDITION_REQUIRED)
// tells the client to connect GitHub rather than to retry or re-authenticate.
import { AppError } from "../lib/errors.js";
import { findUserById } from "../repository/user.repository.js";

export async function requireGitHubToken(userId: string): Promise<string> {
  const user = await findUserById(userId);
  if (user === null) {
    throw new AppError("UNAUTHENTICATED", "Authentication required.");
  }
  if (user.githubAccessToken === null || user.githubAccessToken === "") {
    throw new AppError("PRECONDITION_FAILED", "No GitHub account is linked. Connect GitHub first.");
  }
  return user.githubAccessToken;
}
