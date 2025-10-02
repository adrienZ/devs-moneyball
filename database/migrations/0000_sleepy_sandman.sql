CREATE TABLE "cohorts_snapshot_names" (
	"id" serial PRIMARY KEY NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "cohorts_snapshots" (
	"id" uuid PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "cohorts_snapshot_names" ADD CONSTRAINT "cohorts_snapshot_names_snapshot_id_cohorts_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."cohorts_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cohorts_snapshot_names_snapshot_idx" ON "cohorts_snapshot_names" USING btree ("snapshot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cohorts_snapshot_names_snapshot_position_uk" ON "cohorts_snapshot_names" USING btree ("snapshot_id","position");