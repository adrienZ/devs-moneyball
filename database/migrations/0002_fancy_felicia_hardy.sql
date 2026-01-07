ALTER TABLE "cohorts_snapshots" ADD COLUMN "pullRequestFrequencyLookbackWeeks" integer DEFAULT 52 NOT NULL;--> statement-breakpoint
ALTER TABLE "github_pull_request_stats" DROP COLUMN "pullRequestsTotalCount";--> statement-breakpoint
ALTER TABLE "github_pull_request_stats" DROP COLUMN "pullRequestsWeeklyCount";--> statement-breakpoint
ALTER TABLE "github_pull_request_stats" DROP COLUMN "pullRequestsWeeklyCap";