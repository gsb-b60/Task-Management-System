import { z } from "zod";
import { parseApiDate } from "../../lib/dates.js";
import { clampPageSize } from "../../lib/pagination.js";
import { TASK_PRIORITIES, TASK_STATUSES } from "../../types/domain.js";

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

/** Repeatable *and* comma-separated forms both parse (Phase 03 §4). */
function enumList<T extends string>(values: readonly T[]) {
  return z.preprocess(
    (raw) => {
      if (raw === undefined || raw === null) return undefined;
      const parts = (Array.isArray(raw) ? raw : [raw]).flatMap((item) =>
        String(item).split(","),
      );
      const cleaned = parts.map((part) => part.trim()).filter((part) => part !== "");
      return cleaned.length > 0 ? cleaned : undefined;
    },
    z.array(z.enum(values)).optional(),
  );
}

const mutableFields = {
  title: z
    .string()
    .trim()
    .min(1, "Title must not be empty.")
    .max(200, "Title must be 200 characters or fewer."),
  description: z.string().max(10000, "Description is too long.").nullish(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  startDate: dateInput.nullish(),
  dueDate: dateInput.nullish(),
  projectId: z.uuid({ message: "Must be a valid UUID." }).nullish(),
};

function checkDateOrder(
  body: { startDate?: Date | null | undefined; dueDate?: Date | null | undefined },
  ctx: z.RefinementCtx,
): void {
  if (body.startDate == null || body.dueDate == null) return;
  if (body.dueDate.getTime() < body.startDate.getTime()) {
    ctx.addIssue({
      code: "custom",
      path: ["dueDate"],
      message: "Due date must not be earlier than start date.",
    });
  }
}

// `strictObject`: an unknown key is a 400, so a client sending `id`,
// `createdAt`, or `userId` finds out immediately (api-data-format §4.8).
export const createTaskBody = z
  .strictObject(mutableFields)
  .superRefine(checkDateOrder);

// PATCH is a partial update: every field including `title` is optional.
export const updateTaskBody = z
  .strictObject({ ...mutableFields, title: mutableFields.title.optional() })
  .superRefine(checkDateOrder);

const sortableFields = ["dueDate", "createdAt", "updatedAt", "priority", "status", "title"] as const;

export const taskListQuery = z.object({
  q: z.string().max(200, "Search must be 200 characters or fewer.").optional(),
  status: enumList(TASK_STATUSES),
  priority: enumList(TASK_PRIORITIES),
  projectId: z.uuid({ message: "Must be a valid UUID." }).optional(),
  page: z.coerce.number().int().min(1, "page must be at least 1.").default(1),
  pageSize: z.coerce
    .number()
    .int("pageSize must be a whole number.")
    .min(1, "pageSize must be at least 1.")
    .transform(clampPageSize)
    .default(20),
  sortBy: z.enum(sortableFields).default("dueDate"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export type CreateTaskBody = z.infer<typeof createTaskBody>;
export type UpdateTaskBody = z.infer<typeof updateTaskBody>;
export type TaskListQuery = z.infer<typeof taskListQuery>;
