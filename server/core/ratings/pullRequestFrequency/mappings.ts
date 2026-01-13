import type { PullRequestStatsResponse } from "~~/server/services/pullRequestStatsService";

export type PullRequestFrequencyRawTotals = {
  userPullRequestsTotal: number;
  cohortPullRequestsTotals: number[];
};

type PullRequestFrequencyRawTotalsInput = {
  userStats: PullRequestStatsResponse;
  cohortCounts: number[];
};

export function mapPullRequestFrequencyRawTotals(
  input: PullRequestFrequencyRawTotalsInput,
): PullRequestFrequencyRawTotals {
  return {
    userPullRequestsTotal: input.userStats.mergedPullRequests.totalCount,
    cohortPullRequestsTotals: input.cohortCounts,
  };
}
