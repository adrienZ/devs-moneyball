import type { developper, githubPullRequestStats } from "~~/database/schema";
import { PullRequestStatsRepository } from "~~/server/repositories/pullRequestStatsRepository";
import { ratingsConfig } from "~~/server/core/ratings/ratings.config";
import {
  GithubApiService,
  type PullRequestCountsSince,
  type PullRequestOwnershipCounts,
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
  mergedPullRequests: {
    totalCount: number;
    ownCount: number;
    externalCount: number;
  };
  closedPullRequests: { totalCount: number };
};

type PullRequestContributions = {
  totalPullRequestContributions: number;
  totalPullRequestReviewContributions: number;
};

type PullRequestCounts = {
  closedPullRequestsTotalCount: number;
};

type PullRequestStatsOptions = {
  cohortSnapshotSourceId?: string;
  lookbackWeeks?: number;
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
    closedPullRequestsTotalCount: totals.closedPullRequestsTotalCount,
  };
}

function mapRecordToResponse(
  record: PullRequestStatsRecord,
  developerRecord: DeveloperRecord,
): PullRequestStatsResponse {
  const mergedTotalCount = record.mergedPullRequestsOwnCount + record.mergedPullRequestsExternalCount;
  return {
    login: developerRecord.username,
    name: null,
    contributionsCollection: {
      totalPullRequestContributions: record.totalPullRequestContributions,
      totalPullRequestReviewContributions: record.totalPullRequestReviewContributions,
    },
    pullRequests: {
      totalCount: mergedTotalCount,
    },
    mergedPullRequests: {
      totalCount: mergedTotalCount,
      ownCount: record.mergedPullRequestsOwnCount,
      externalCount: record.mergedPullRequestsExternalCount,
    },
    closedPullRequests: { totalCount: record.closedPullRequestsTotalCount },
  };
}

function mapApiUserToDb(
  user: PullRequestsUser,
  developerId: string,
  totals: PullRequestCountsSince,
  ownership: PullRequestOwnershipCounts,
): PullRequestStatsInsert {
  const contributions = buildContributionsFromUser(user);
  const counts = buildCountsFromTotals(totals);
  return {
    developerId,
    totalPullRequestContributions: contributions.totalPullRequestContributions,
    totalPullRequestReviewContributions: contributions.totalPullRequestReviewContributions,
    mergedPullRequestsOwnCount: ownership.ownCount,
    mergedPullRequestsExternalCount: ownership.externalCount,
    closedPullRequestsTotalCount: counts.closedPullRequestsTotalCount,
  };
}

function mapApiUserToResponse(
  user: PullRequestsUser,
  login: string,
  totals: PullRequestCountsSince,
  ownership: PullRequestOwnershipCounts,
): PullRequestStatsResponse {
  const contributions = buildContributionsFromUser(user);
  const counts = buildCountsFromTotals(totals);
  const mergedTotalCount = ownership.ownCount + ownership.externalCount;
  return {
    login,
    name: user.name ?? null,
    contributionsCollection: {
      totalPullRequestContributions: contributions.totalPullRequestContributions,
      totalPullRequestReviewContributions: contributions.totalPullRequestReviewContributions,
    },
    pullRequests: {
      totalCount: mergedTotalCount,
    },
    mergedPullRequests: {
      totalCount: mergedTotalCount,
      ownCount: ownership.ownCount,
      externalCount: ownership.externalCount,
    },
    closedPullRequests: { totalCount: counts.closedPullRequestsTotalCount },
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
  const lookbackWeeks = options.lookbackWeeks ?? ratingsConfig.lookbackWeeks;
  // 1) Fetch current totals from GitHub.
  const user = await githubApiService.fetchPullRequestsUser(developer.username, lookbackWeeks);
  if (!user) {
    return null;
  }

  // 2) Persist totals, return saved record when possible.
  const counts = await githubApiService.fetchPullRequestCountsSince(user.login, lookbackWeeks);
  const ownership = await githubApiService.fetchMergedPullRequestsOwnershipCounts(
    developer.username,
    lookbackWeeks,
  );
  const values: PullRequestStatsInsert = {
    ...mapApiUserToDb(user, developer.id, counts, ownership),
    cohortSnapshotSourceId: options.cohortSnapshotSourceId ?? null,
  };
  const savedRecord = await pullRequestStatsRepository.upsert(values);

  if (savedRecord) {
    return mapRecordToResponse(savedRecord, developer);
  }

  return mapApiUserToResponse(user, developer.username, counts, ownership);
}

export async function findPullRequestStats(
  developer: DeveloperRecord,
): Promise<PullRequestStatsResponse | null> {
  const pullRequestStatsRepository = PullRequestStatsRepository.getInstance();
  const record = await pullRequestStatsRepository.findByDeveloperId(developer.id);

  if (!record) {
    return null;
  }

  return mapRecordToResponse(record, developer);
}

// #endregion Service
