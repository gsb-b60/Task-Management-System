// Project data access. Phase 02 only needs ownership checks for `taskId`
// validation; full CRUD arrives in Phase 08.
import { prisma } from "../lib/prisma.js";

export interface ProjectOwnershipRow {
  id: string;
  userId: string;
}

export async function findProjectForUser(
  id: string,
  userId: string,
): Promise<ProjectOwnershipRow | null> {
  return prisma.project.findFirst({
    where: { id, userId },
    select: { id: true, userId: true },
  });
}
