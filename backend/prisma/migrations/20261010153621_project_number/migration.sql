-- Stable per-user project index, shown in the UI as #1, #2, ... Existing
-- rows take their creation order; `User.projectSeq` is the allocator so a
-- deleted number is never reused. The composite unique is the backstop that
-- turns a racing creator into a retry.
ALTER TABLE "Project" ADD COLUMN "projectNumber" INTEGER;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY "userId" ORDER BY "createdAt" ASC, id ASC
  ) AS rn FROM "Project"
)
UPDATE "Project" p SET "projectNumber" = r.rn FROM ranked r WHERE p.id = r.id;

ALTER TABLE "Project" ALTER COLUMN "projectNumber" SET NOT NULL;

ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_projectNumber_key" UNIQUE ("userId", "projectNumber");

ALTER TABLE "User" ADD COLUMN "projectSeq" INTEGER NOT NULL DEFAULT 1;

WITH maxima AS (
  SELECT "userId", COALESCE(MAX("projectNumber"), 0) + 1 AS nxt
  FROM "Project" GROUP BY "userId"
)
UPDATE "User" u SET "projectSeq" = m.nxt FROM maxima m WHERE u.id = m."userId";
