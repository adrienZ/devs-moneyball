import { createError, defineEventHandler, getRouterParam } from "h3";
import { ratePullRequestFrequency } from "~~/server/core/ratings/pullRequestFrequency";
import { DeveloperRepository } from "~~/server/repositories/developerRepository";
import { PullRequestStatsRepository } from "~~/server/repositories/pullRequestStatsRepository";
import { SnapshotRepository } from "~~/server/repositories/snapshotRepository";
import { ensurePullRequestStats } from "~~/server/services/pullRequestStatsService";

type RatingCriterion = {
  code: string;
  label: string;
  value: number | null;
};

function percentileToTwentyScale(percentile: number): number {
  return Math.floor(((percentile / 100) * 20) * 10) / 10;
}

export default defineEventHandler(async (event) => {
  const username = getRouterParam(event, "username");
  if (!username) {
    throw createError({
      statusCode: 400,
      message: "Missing required parameter: username",
    });
  }

  const developerRepository = DeveloperRepository.getInstance();
  const snapshotRepository = SnapshotRepository.getInstance();
  const pullRequestStatsRepository = PullRequestStatsRepository.getInstance();
  const developerRow = await developerRepository.findByUsername(username);
  if (!developerRow) {
    throw createError({
      statusCode: 404,
      message: "Developer not found",
    });
  }

  const stats = await ensurePullRequestStats(developerRow);
  if (!stats) {
    throw createError({ statusCode: 404, message: "User not found" });
  }

  const latestSnapshot = await snapshotRepository.findLatest();

  let cohortCounts: number[] = [];
  if (latestSnapshot) {
    cohortCounts = await pullRequestStatsRepository
      .listCohortPullRequestCounts(latestSnapshot.id);
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
