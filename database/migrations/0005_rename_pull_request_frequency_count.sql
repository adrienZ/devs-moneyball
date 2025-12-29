ALTER TABLE "github_pull_request_stats"
  RENAME COLUMN "pullRequestsFrequencyCount" TO "pullRequestsWeeklyFrequencyCount";
--> statement-breakpoint

ALTER TABLE "github_pull_request_stats"
  ALTER COLUMN "pullRequestsWeeklyFrequencyCount" SET DEFAULT 0;
--> statement-breakpoint

UPDATE "github_pull_request_stats"
SET "pullRequestsWeeklyFrequencyCount" = 0
WHERE "pullRequestsWeeklyFrequencyCount" IS NULL;
--> statement-breakpoint

ALTER TABLE "github_pull_request_stats"
  ALTER COLUMN "pullRequestsWeeklyFrequencyCount" SET NOT NULL;
