import { z } from "zod";
import { clampPageSize } from "../../lib/pagination.js";
import { taskListQuery } from "../tasks/tasks.schemas.js";

/** `?projectId=` scoping for the summary. Ownership is checked in the service. */
export const dashboardQuery = z.object({
  projectId: z.uuid({ message: "Must be a valid UUID." }).optional(),
});

/** The Phase 03 list contract with a shorter default page (Phase 04 §4.2). */
export const upcomingQuery = taskListQuery.extend({
  pageSize: z.coerce
    .number()
    .int("pageSize must be a whole number.")
    .min(1, "pageSize must be at least 1.")
    .transform(clampPageSize)
    .default(10),
});

export type DashboardQuery = z.infer<typeof dashboardQuery>;
export type UpcomingQuery = z.infer<typeof upcomingQuery>;
