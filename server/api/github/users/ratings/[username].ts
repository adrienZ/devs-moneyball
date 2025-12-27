import { createError, defineEventHandler, getRouterParam } from "h3";
import { desc, eq, inArray } from "drizzle-orm";
import { useDrizzle } from "~~/database/client";
import {
  developper,
  githubPullRequestStats,
  snapshotNames,
  snapshots,
} from "~~/database/schema";
import { ratePullRequestFrequency } from "~~/server/core/ratings/pullRequestFrequency";
import { ensurePullRequestStats } from "~~/server/services/pullRequestStatsService";

type RatingCriterion = {
  code: string;
  label: string;
  value: number | null;
};

function percentileToTwentyScale(percentile: number): number {
  return Math.round(((percentile / 100) * 20) * 10) / 10;
}

export default defineEventHandler(async (event) => {
  const username = getRouterParam(event, "username");
  if (!username) {
    throw createError({
      statusCode: 400,
      message: "Missing required parameter: username",
    });
  }

  const db = useDrizzle();

  const developerRecord = await db
    .select()
    .from(developper)
    .where(eq(developper.username, username))
    .limit(1);

  const developerRow = developerRecord.at(0);
  if (!developerRow) {
    throw createError({
      statusCode: 404,
      message: "Developer not found",
    });
  }

  const stats = await ensurePullRequestStats(db, developerRow);
  if (!stats) {
    throw createError({ statusCode: 404, message: "User not found" });
  }

  const latestSnapshot = await db
    .select({ id: snapshots.id })
    .from(snapshots)
    .orderBy(desc(snapshots.createdAt))
    .limit(1)
    .then(rows => rows.at(0));

  let cohortCounts: number[] = [];
  if (latestSnapshot) {
    const cohortNameRows = await db
      .select({ name: snapshotNames.name })
      .from(snapshotNames)
      .where(eq(snapshotNames.snapshotId, latestSnapshot.id));

    const cohortNames = cohortNameRows.map(row => row.name);
    if (cohortNames.length > 0) {
      const cohortDevelopers = await db
        .select({ id: developper.id })
        .from(developper)
        .where(inArray(developper.username, cohortNames));

      const cohortDeveloperIds = cohortDevelopers.map(row => row.id);
      if (cohortDeveloperIds.length > 0) {
        const cohortStatsRows = await db
          .select({ total: githubPullRequestStats.pullRequestsTotalCount })
          .from(githubPullRequestStats)
          .where(inArray(githubPullRequestStats.developerId, cohortDeveloperIds));

        cohortCounts = cohortStatsRows.map(row => row.total);
      }
    }
  }

  const pullRequestFrequency = cohortCounts.length > 0
    ? percentileToTwentyScale(ratePullRequestFrequency({
      userPullRequests: stats.pullRequests.totalCount,
      cohortCounts,
    }))
    : null;

  const criteria: RatingCriterion[] = [
    {
      code: "A1",
      label: "Pull request frequency percentile",
      value: pullRequestFrequency,
    },
  ];

  return {
    criteria,
  };
});
