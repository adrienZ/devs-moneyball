CREATE TABLE "dev_activity" (
	"dev_id" text NOT NULL,
	"period" text NOT NULL,
	"period_start" date NOT NULL,
	"pr_merged_raw" integer NOT NULL,
	"pr_merged_capped" integer NOT NULL,
	"cap_applied" integer NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp,
	"deletedAt" timestamp,
	CONSTRAINT "dev_activity_dev_id_period_period_start_pk" PRIMARY KEY("dev_id","period","period_start")
);
