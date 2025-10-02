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
ALTER TABLE "cohorts_snapshot_names" RENAME COLUMN "snapshot_id" TO "snapshotId";--> statement-breakpoint
ALTER TABLE "cohorts_snapshot_names" RENAME COLUMN "created_at" TO "createdAt";--> statement-breakpoint
ALTER TABLE "cohorts_snapshot_names" RENAME COLUMN "updated_at" TO "updatedAt";--> statement-breakpoint
ALTER TABLE "cohorts_snapshot_names" RENAME COLUMN "deleted_at" TO "deletedAt";--> statement-breakpoint
ALTER TABLE "cohorts_snapshots" RENAME COLUMN "created_at" TO "createdAt";--> statement-breakpoint
ALTER TABLE "cohorts_snapshots" RENAME COLUMN "updated_at" TO "updatedAt";--> statement-breakpoint
ALTER TABLE "cohorts_snapshots" RENAME COLUMN "deleted_at" TO "deletedAt";--> statement-breakpoint
ALTER TABLE "cohorts_snapshot_names" DROP CONSTRAINT "cohorts_snapshot_names_snapshot_id_cohorts_snapshots_id_fk";
--> statement-breakpoint
DROP INDEX "cohorts_snapshot_names_snapshot_idx";--> statement-breakpoint
DROP INDEX "cohorts_snapshot_names_snapshot_position_uk";--> statement-breakpoint
ALTER TABLE "cohorts_snapshot_names" ADD CONSTRAINT "cohorts_snapshot_names_snapshotId_cohorts_snapshots_id_fk" FOREIGN KEY ("snapshotId") REFERENCES "public"."cohorts_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cohorts_snapshot_names_snapshot_idx" ON "cohorts_snapshot_names" USING btree ("snapshotId");--> statement-breakpoint
CREATE UNIQUE INDEX "cohorts_snapshot_names_snapshot_position_uk" ON "cohorts_snapshot_names" USING btree ("snapshotId","position");