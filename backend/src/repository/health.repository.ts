// Readiness probe. The only repository with no entity behind it — it exists
// so the database check stays out of `service/`, where Prisma is forbidden
// (architecture-backend.md §3).
import { prisma } from "../lib/prisma.js";

export async function pingDatabase(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
