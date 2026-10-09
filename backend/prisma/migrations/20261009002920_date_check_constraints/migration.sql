-- SRS §17.3 / Phase 00 §6.6 — date ranges must be ordered when both ends are set.
ALTER TABLE "Task"
  ADD CONSTRAINT "Task_dates_ordered"
  CHECK ("dueDate" IS NULL OR "startDate" IS NULL OR "dueDate" >= "startDate");

ALTER TABLE "Project"
  ADD CONSTRAINT "Project_dates_ordered"
  CHECK ("targetDate" IS NULL OR "startDate" IS NULL OR "targetDate" >= "startDate");
