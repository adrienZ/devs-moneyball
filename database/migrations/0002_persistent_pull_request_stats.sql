CREATE TABLE "github_pull_request_stats" (
        "id" uuid PRIMARY KEY NOT NULL,
        "username" text NOT NULL,
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
CREATE UNIQUE INDEX "github_pull_request_stats_username_uk" ON "github_pull_request_stats" USING btree ("username");
