CREATE TABLE "github_pull_request_stats" (
        "id" uuid PRIMARY KEY NOT NULL,
        "developerId" text NOT NULL,
        "name" text,
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
DO $$ BEGIN
 ALTER TABLE "github_pull_request_stats" ADD CONSTRAINT "github_pull_request_stats_developerId_developper_id_fk" FOREIGN KEY ("developerId") REFERENCES "developper"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX "github_pull_request_stats_developer_id_uk" ON "github_pull_request_stats" USING btree ("developerId");
