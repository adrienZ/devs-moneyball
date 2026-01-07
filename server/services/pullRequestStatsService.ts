import type { developper, githubPullRequestStats } from "~~/database/schema";
import { PullRequestStatsRepository } from "~~/server/repositories/pullRequestStatsRepository";
import { ratingsConfig } from "~~/server/core/ratings/ratings.config";
import {
  GithubApiService,
  type PullRequestCountsSince,
  type PullRequestsUser,
} from "~~/server/services/githubApiService";

type PullRequestStatsRecord = typeof githubPullRequestStats.$inferSelect;
type PullRequestStatsInsert = typeof githubPullRequestStats.$inferInsert;
type DeveloperRecord = typeof developper.$inferSelect;

// #region Types
export type PullRequestStatsResponse = {
  login: string;
  name: string | null;
  contributionsCollection: {
    totalPullRequestContributions: number;
    totalPullRequestReviewContributions: number;
  };
  pullRequests: { totalCount: number };
  mergedPullRequests: { totalCount: number };
  closedPullRequests: { totalCount: number };
  openPullRequests: { totalCount: number };
};

type PullRequestContributions = {
  totalPullRequestContributions: number;
  totalPullRequestReviewContributions: number;
};

type PullRequestCounts = {
  mergedPullRequestsTotalCount: number;
  closedPullRequestsTotalCount: number;
  openPullRequestsTotalCount: number;
};

type PullRequestStatsOptions = {
  cohortSnapshotSourceId?: string;
};
// #endregion Types

// #region Mappings
function buildContributionsFromUser(user: PullRequestsUser): PullRequestContributions {
  return {
    totalPullRequestContributions: user.contributionsCollection.totalPullRequestContributions,
    totalPullRequestReviewContributions: user.contributionsCollection.totalPullRequestReviewContributions,
  };
}

function buildCountsFromTotals(
  totals: PullRequestCountsSince,
): PullRequestCounts {
  return {
    mergedPullRequestsTotalCount: totals.mergedPullRequestsTotalCount,
    closedPullRequestsTotalCount: totals.closedPullRequestsTotalCount,
    openPullRequestsTotalCount: totals.openPullRequestsTotalCount,
  };
}

function mapRecordToResponse(
  record: PullRequestStatsRecord,
  developerRecord: DeveloperRecord,
): PullRequestStatsResponse {
  return {
    login: developerRecord.username,
    name: null,
    contributionsCollection: {
      totalPullRequestContributions: record.totalPullRequestContributions,
      totalPullRequestReviewContributions: record.totalPullRequestReviewContributions,
    },
    pullRequests: {
      totalCount: record.mergedPullRequestsTotalCount,
    },
    mergedPullRequests: { totalCount: record.mergedPullRequestsTotalCount },
    closedPullRequests: { totalCount: record.closedPullRequestsTotalCount },
    openPullRequests: { totalCount: record.openPullRequestsTotalCount },
  };
}

function mapApiUserToDb(
  user: PullRequestsUser,
  developerId: string,
  totals: PullRequestCountsSince,
): PullRequestStatsInsert {
  const contributions = buildContributionsFromUser(user);
  const counts = buildCountsFromTotals(totals);
  return {
    developerId,
    totalPullRequestContributions: contributions.totalPullRequestContributions,
    totalPullRequestReviewContributions: contributions.totalPullRequestReviewContributions,
    mergedPullRequestsTotalCount: counts.mergedPullRequestsTotalCount,
    closedPullRequestsTotalCount: counts.closedPullRequestsTotalCount,
    openPullRequestsTotalCount: counts.openPullRequestsTotalCount,
  };
}

function mapApiUserToResponse(
  user: PullRequestsUser,
  login: string,
  totals: PullRequestCountsSince,
): PullRequestStatsResponse {
  const contributions = buildContributionsFromUser(user);
  const counts = buildCountsFromTotals(totals);
  return {
    login,
    name: user.name ?? null,
    contributionsCollection: {
      totalPullRequestContributions: contributions.totalPullRequestContributions,
      totalPullRequestReviewContributions: contributions.totalPullRequestReviewContributions,
    },
    pullRequests: {
      totalCount: counts.mergedPullRequestsTotalCount,
    },
    mergedPullRequests: { totalCount: counts.mergedPullRequestsTotalCount },
    closedPullRequests: { totalCount: counts.closedPullRequestsTotalCount },
    openPullRequests: { totalCount: counts.openPullRequestsTotalCount },
  };
}
// #endregion Mappings

// #region Service
export async function ensurePullRequestStats(
  developer: DeveloperRecord,
  options: PullRequestStatsOptions = {},
): Promise<PullRequestStatsResponse | null> {
  const pullRequestStatsRepository = PullRequestStatsRepository.getInstance();
  const githubApiService = GithubApiService.getInstance();
  const lookbackWeeks = ratingsConfig.lookbackWeeks;
  // 1) Fetch current totals from GitHub.
  const user = await githubApiService.fetchPullRequestsUser(developer.username, lookbackWeeks);
  if (!user) {
    return null;
  }

  // 2) Persist totals, return saved record when possible.
  const counts = await githubApiService.fetchPullRequestCountsSince(user.login, lookbackWeeks);
  const values: PullRequestStatsInsert = {
    ...mapApiUserToDb(user, developer.id, counts),
    cohortSnapshotSourceId: options.cohortSnapshotSourceId ?? null,
  };
  const savedRecord = await pullRequestStatsRepository.upsert(values);

  if (savedRecord) {
    return mapRecordToResponse(savedRecord, developer);
  }

  return mapApiUserToResponse(user, developer.username, counts);
}
// #endregion Service
