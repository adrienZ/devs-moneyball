CREATE TABLE "developper" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"githubId" text NOT NULL,
	"avatarUrl" text NOT NULL,
	"bio" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp,
	"deletedAt" timestamp,
	CONSTRAINT "developper_githubId_unique" UNIQUE("githubId")
);
--> statement-breakpoint
CREATE TABLE "github_pull_request_stats" (
	"id" uuid PRIMARY KEY NOT NULL,
	"developerId" text NOT NULL,
	"cohortSnapshotSourceId" uuid,
	"totalPullRequestContributions" integer NOT NULL,
	"totalPullRequestReviewContributions" integer NOT NULL,
	"pullRequestsTotalCount" integer NOT NULL,
	"mergedPullRequestsTotalCount" integer NOT NULL,
	"closedPullRequestsTotalCount" integer NOT NULL,
	"openPullRequestsTotalCount" integer NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "cohorts_snapshot_names" (
	"id" serial PRIMARY KEY NOT NULL,
	"snapshotId" uuid NOT NULL,
	"name" text NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp,
	"deletedAt" timestamp,
	CONSTRAINT "cohorts_snapshot_names_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "cohorts_snapshots" (
	"id" uuid PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp,
	"deletedAt" timestamp
);
--> statement-breakpoint
ALTER TABLE "github_pull_request_stats" ADD CONSTRAINT "github_pull_request_stats_developerId_developper_id_fk" FOREIGN KEY ("developerId") REFERENCES "public"."developper"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_pull_request_stats" ADD CONSTRAINT "github_pull_request_stats_cohortSnapshotSourceId_cohorts_snapshots_id_fk" FOREIGN KEY ("cohortSnapshotSourceId") REFERENCES "public"."cohorts_snapshots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cohorts_snapshot_names" ADD CONSTRAINT "cohorts_snapshot_names_snapshotId_cohorts_snapshots_id_fk" FOREIGN KEY ("snapshotId") REFERENCES "public"."cohorts_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "github_pull_request_stats_developer_id_uk" ON "github_pull_request_stats" USING btree ("developerId");--> statement-breakpoint
CREATE INDEX "github_pull_request_stats_cohort_snapshot_idx" ON "github_pull_request_stats" USING btree ("cohortSnapshotSourceId");--> statement-breakpoint
CREATE INDEX "cohorts_snapshot_names_snapshot_idx" ON "cohorts_snapshot_names" USING btree ("snapshotId");