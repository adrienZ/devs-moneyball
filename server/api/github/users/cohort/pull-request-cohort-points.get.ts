import { createError, defineEventHandler, getQuery } from "h3";
import { DeveloperRepository } from "~~/server/repositories/developerRepository";
import { PullRequestStatsRepository } from "~~/server/repositories/pullRequestStatsRepository";
import { SnapshotRepository } from "~~/server/repositories/snapshotRepository";
import { ensurePullRequestStats } from "~~/server/services/pullRequestStatsService";

type CurrentPullRequests = {
  login: string;
  pullRequests: { totalCount: number };
};

type CohortKeyNumbers = {
  size: number;
  min: number | null;
  max: number | null;
  median: number | null;
  average: number | null;
};

type CohortPullRequestsResponse = {
  cohort: {
    login: string;
    pullRequestsCount: number;
  }[];
  cohortKeyNumbers: CohortKeyNumbers;
  current: CurrentPullRequests | null;
  lookbackWeeks: number;
};

function summarizeCohortCounts(counts: number[]): CohortKeyNumbers {
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

export default defineEventHandler(async (event): Promise<CohortPullRequestsResponse> => {
  const query = getQuery(event);
  const username = typeof query.username === "string" ? query.username : null;
  const snapshotRepository = SnapshotRepository.getInstance();
  const latestSnapshot = await snapshotRepository.findLatestReady();
  if (!latestSnapshot) {
    throw createError({
      statusCode: 409,
      message: "Snapshot is not ready",
    });
  }

  const cohortSnapshotId = latestSnapshot.id;
  const lookbackWeeks = latestSnapshot.pullRequestFrequencyLookbackWeeks;
  const pullRequestStatsRepository = PullRequestStatsRepository.getInstance();
  const cohort = await pullRequestStatsRepository.listCohortPullRequestPoints(
    cohortSnapshotId,
  );
  const cohortKeyNumbers = summarizeCohortCounts(
    cohort.map(point => point.pullRequestsCount),
  );

  let current: CurrentPullRequests | null = null;
  if (username) {
    const developerRepository = DeveloperRepository.getInstance();
    const developerRow = await developerRepository.findByUsername(username);
    if (!developerRow) {
      throw createError({
        statusCode: 404,
        message: "Developer not found",
      });
    }

    const stats = await ensurePullRequestStats(developerRow, {
      cohortSnapshotSourceId: cohortSnapshotId,
    });
    if (!stats) {
      throw createError({ statusCode: 404, message: "User not found" });
    }

    current = {
      login: stats.login,
      pullRequests: {
        totalCount: stats.mergedPullRequests.totalCount,
      },
    };
  }

  return {
    cohort,
    cohortKeyNumbers,
    current,
    lookbackWeeks,
  };
});
