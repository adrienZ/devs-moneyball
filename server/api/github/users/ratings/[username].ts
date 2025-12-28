import { createError, defineEventHandler, getRouterParam } from "h3";
import { desc, eq } from "drizzle-orm";
import { useDrizzle } from "~~/database/client";
import {
  developper,
  githubPullRequestStats,
  snapshots,
} from "~~/database/schema";
import { ratePullRequestFrequency } from "~~/server/core/ratings/pullRequestFrequency";
import { ensurePullRequestStats } from "~~/server/services/pullRequestStatsService";

type RatingCriterion = {
  code: string;
  label: string;
  value: number | null;
  description: string;
};

function percentileToTwentyScale(percentile: number): number {
  return 1 + Math.floor((percentile / 100) * 19);
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
    cohortCounts = await db
      .select({ total: githubPullRequestStats.mergedExternalPullRequestsWeeklyCount })
      .from(githubPullRequestStats)
      .where(eq(githubPullRequestStats.cohortSnapshotSourceId, latestSnapshot.id))
      .then(rows => rows.map(row => row.total));
  }

  const pullRequestFrequency = cohortCounts.length > 0
    ? percentileToTwentyScale(ratePullRequestFrequency({
        userPullRequests: stats.mergedExternalPullRequestsWeeklyCount,
        cohortCounts,
      }))
    : null;

  const criteria: RatingCriterion[] = [
    {
      code: "A1",
      label: "Volume utile (PR mergées externes, 7j)",
      description: "Nombre de PR mergées sur des repos externes, capées par semaine.",
      value: pullRequestFrequency,
    },
  ];

  return {
    criteria,
  };
});
