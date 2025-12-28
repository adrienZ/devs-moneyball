ALTER TABLE "github_pull_request_stats" ADD COLUMN "cohortSnapshotSourceId" uuid;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "github_pull_request_stats" ADD CONSTRAINT "github_pull_request_stats_cohortSnapshotSourceId_cohorts_snapshots_id_fk" FOREIGN KEY ("cohortSnapshotSourceId") REFERENCES "public"."cohorts_snapshots"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX "github_pull_request_stats_cohort_snapshot_idx" ON "github_pull_request_stats" USING btree ("cohortSnapshotSourceId");
