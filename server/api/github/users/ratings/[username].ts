import { createError, defineEventHandler, getRouterParam } from "h3";
import { ratePullRequestFrequencyFromTotals } from "~~/server/core/ratings/pullRequestFrequency/pipeline";
import { mapPullRequestFrequencyRawTotals } from "~~/server/core/ratings/pullRequestFrequency/mappings";
import { DeveloperRepository } from "~~/server/repositories/developerRepository";
import { PullRequestStatsRepository } from "~~/server/repositories/pullRequestStatsRepository";
import { SnapshotRepository } from "~~/server/repositories/snapshotRepository";
import { ensurePullRequestStats } from "~~/server/services/pullRequestStatsService";

type RatingCriterion = {
  code: string;
  label: string;
  description: string;
  value: number | null;
};

function percentileToTwentyScale(percentile: number): number {
  const scaled = Math.floor(((percentile / 100) * 20) * 10) / 10;
  const notZero = Math.max(1, scaled);
  return Math.floor(notZero);
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

  const latestSnapshot = await snapshotRepository.findLatestReady();
  const stats = await ensurePullRequestStats(developerRow);

  if (!stats) {
    throw createError({ statusCode: 404, message: "User not found" });
  }

  let cohortCounts: number[] = [];
  if (latestSnapshot) {
    cohortCounts = await pullRequestStatsRepository
      .listCohortPullRequestCounts(latestSnapshot.id);
  }

  const pullRequestFrequency = cohortCounts.length > 0
    ? percentileToTwentyScale(ratePullRequestFrequencyFromTotals(
        mapPullRequestFrequencyRawTotals({
          userStats: stats,
          cohortCounts,
        }),
      ))
    : null;

  const criteria: RatingCriterion[] = [
    {
      code: "A1",
      label: "Merged pull request frequency percentile",
      description: "Measures how frequently the developer creates merged pull requests compared to their cohort. Higher values indicate more consistent contribution activity.",
      value: pullRequestFrequency,
    },
  ];

  return {
    criteria,
  };
});
