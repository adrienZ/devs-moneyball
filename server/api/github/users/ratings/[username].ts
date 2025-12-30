import { createError, defineEventHandler, getRouterParam } from "h3";
import { ratingsConfig } from "~~/server/core/ratings/rating.config";
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

type CohortSummary = {
  size: number;
  min: number | null;
  max: number | null;
  median: number | null;
  average: number | null;
};

function percentileToTwentyScale(percentile: number): number {
  return Math.floor(((percentile / 100) * 20) * 10) / 10;
}

function summarizeCohortCounts(counts: number[]): CohortSummary {
  if (counts.length === 0) {
    return {
      size: 0,
      min: null,
      max: null,
      median: null,
      average: null,
    };
  }

  const sorted = [...counts].sort((a, b) => a - b);
  const size = sorted.length;
  const min = sorted[0] ?? null;
  const max = sorted[sorted.length - 1] ?? null;
  const mid = Math.floor(size / 2);
  const median = size % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
  const average = sorted.reduce((sum, value) => sum + value, 0) / size;

  return {
    size,
    min,
    max,
    median,
    average,
  };
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

  const cohortSummary = summarizeCohortCounts(cohortCounts);
  const pullRequestFrequency = cohortCounts.length > 0
    ? percentileToTwentyScale(ratePullRequestFrequencyFromTotals(
        mapPullRequestFrequencyRawTotals({
          userStats: stats,
          cohortCounts,
        }),
        ratingsConfig.pullRequestFrequency,
      ))
    : null;

  const criteria: RatingCriterion[] = [
    {
      code: "A1",
      label: "Pull request frequency percentile",
      description: "Measures how frequently the developer creates pull requests compared to their cohort. Higher values indicate more consistent contribution activity.",
      value: pullRequestFrequency,
    },
  ];

  return {
    criteria,
    cohort: cohortSummary,
  };
});
