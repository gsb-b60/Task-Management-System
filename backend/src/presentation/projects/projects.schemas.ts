import { z } from "zod";
import { parseApiDate } from "../../lib/dates.js";

function isValidDate(value: string): boolean {
  try {
    parseApiDate(value);
    return true;
  } catch {
    return false;
  }
}

/** Accepts ISO-8601 datetimes and bare `YYYY-MM-DD` calendar dates. */
const dateInput = z
  .string()
  .refine(isValidDate, "Must be a valid ISO-8601 date.")
  .transform((value) => parseApiDate(value));

const projectFields = {
  name: z
    .string()
    .trim()
    .min(1, "Name must not be empty.")
    .max(200, "Name must be 200 characters or fewer."),
  description: z.string().max(10000, "Description is too long.").nullish(),
  startDate: dateInput.nullish(),
  targetDate: dateInput.nullish(),
};

function checkDateOrder(
  body: { startDate?: Date | null | undefined; targetDate?: Date | null | undefined },
  ctx: z.RefinementCtx,
): void {
  if (body.startDate == null || body.targetDate == null) return;
  if (body.targetDate.getTime() < body.startDate.getTime()) {
    ctx.addIssue({
      code: "custom",
      path: ["targetDate"],
      message: "Target date must not be earlier than start date.",
    });
  }
}

// `strictObject`: an unknown key is a 400, so a client sending `id`,
// `createdAt`, or `userId` finds out immediately (api-data-format §4.8).
export const createProjectBody = z
  .strictObject(projectFields)
  .superRefine(checkDateOrder);

// PATCH is a partial update: every field including `name` is optional.
export const updateProjectBody = z
  .strictObject({
    name: projectFields.name.optional(),
    description: projectFields.description,
    startDate: projectFields.startDate,
    targetDate: projectFields.targetDate,
  })
  .superRefine(checkDateOrder);

export type CreateProjectBody = z.infer<typeof createProjectBody>;
export type UpdateProjectBody = z.infer<typeof updateProjectBody>;

// Bulk creation from GitHub repositories (one project per repository).
// `githubId` mirrors github.schemas.ts: JSON numbers stay numbers, but ids
// beyond 2^53 must arrive as decimal strings — hence number | string.
const fromGitHubItem = z.strictObject({
  githubId: z
    .union([z.number().int(), z.string().regex(/^\d+$/)])
    .transform((value) => BigInt(value))
    .refine((value) => value > 0n, "githubId must be a positive integer."),
  // The project title: prefilled from the repo name, editable per row.
  name: projectFields.name,
  description: z.string().max(10000, "Description is too long.").nullish(),
});

export const createProjectsFromGitHubBody = z.strictObject({
  items: z
    .array(fromGitHubItem)
    .min(1, "Select at least one repository.")
    .max(30, "Add at most 30 repositories at once."),
});

export type CreateProjectsFromGitHubBody = z.infer<typeof createProjectsFromGitHubBody>;
