import { z } from "zod";

// Numeric ids arrive as JSON numbers, but GitHub repository ids exceed 2^53
// over time — accept a decimal string too so precision-sensitive clients can
// round-trip safely (§7.1 documents `githubId` as a string on the wire).
const githubIdInput = z
  .union([z.bigint(), z.number().int(), z.string().regex(/^\d+$/)])
  .transform((value) => (typeof value === "bigint" ? value : BigInt(value)))
  .refine((value) => value > 0n, "githubId must be a positive integer.");

export const linkRepositoryBody = z.strictObject({
  githubId: githubIdInput,
});

export const issuesQuery = z.object({
  state: z.enum(["open", "closed", "all"]).default("open"),
  labels: z.string().trim().min(1).optional(),
  perPage: z.coerce.number().int().min(1).max(100).default(30),
});

export const importIssuesBody = z.strictObject({
  issueNumbers: z
    .array(z.number().int().min(1))
    .min(1, "issueNumbers must not be empty.")
    .max(100, "issueNumbers is limited to 100 per request."),
});

export type LinkRepositoryBody = z.infer<typeof linkRepositoryBody>;
export type IssuesQuery = z.infer<typeof issuesQuery>;
export type ImportIssuesBody = z.infer<typeof importIssuesBody>;
