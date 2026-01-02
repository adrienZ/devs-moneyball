import type { developper, githubPullRequestStats } from "~~/database/schema";
import { PullRequestStatsRepository } from "~~/server/repositories/pullRequestStatsRepository";
import { ratingsConfig } from "~~/server/core/ratings/rating.config";
import {
  GithubApiService,
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
  pullRequests: { totalCount: number; weeklyCount: number };
  mergedPullRequests: { totalCount: number };
  closedPullRequests: { totalCount: number };
  openPullRequests: { totalCount: number };
};

type PullRequestContributions = {
  totalPullRequestContributions: number;
  totalPullRequestReviewContributions: number;
};

type PullRequestCounts = {
  pullRequestsTotalCount: number;
  pullRequestsWeeklyCount: number;
  pullRequestsWeeklyCap: number;
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

function buildCountsFromUser(
  user: PullRequestsUser,
  mergedPullRequestsTotalCount: number,
  weeklyCap: number,
): PullRequestCounts {
  const pullRequestsTotalCount = user.pullRequests.totalCount;
  const pullRequestsWeeklyCount = Math.min(pullRequestsTotalCount, weeklyCap);
  return {
    pullRequestsTotalCount,
    pullRequestsWeeklyCount,
    pullRequestsWeeklyCap: weeklyCap,
    mergedPullRequestsTotalCount,
    closedPullRequestsTotalCount: user.closedPullRequests.totalCount,
    openPullRequestsTotalCount: user.openPullRequests.totalCount,
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
      totalCount: record.pullRequestsTotalCount,
      weeklyCount: record.pullRequestsWeeklyCount,
    },
    mergedPullRequests: { totalCount: record.mergedPullRequestsTotalCount },
    closedPullRequests: { totalCount: record.closedPullRequestsTotalCount },
    openPullRequests: { totalCount: record.openPullRequestsTotalCount },
  };
}

function mapApiUserToDb(
  user: PullRequestsUser,
  developerId: string,
  mergedPullRequestsTotalCount: number,
  weeklyCap: number,
): PullRequestStatsInsert {
  const nowIso = new Date().toISOString();
  const contributions = buildContributionsFromUser(user);
  const counts = buildCountsFromUser(user, mergedPullRequestsTotalCount, weeklyCap);
  return {
    developerId,
    totalPullRequestContributions: contributions.totalPullRequestContributions,
    totalPullRequestReviewContributions: contributions.totalPullRequestReviewContributions,
    pullRequestsTotalCount: counts.pullRequestsTotalCount,
    pullRequestsWeeklyCount: counts.pullRequestsWeeklyCount,
    pullRequestsWeeklyCap: counts.pullRequestsWeeklyCap,
    mergedPullRequestsTotalCount: counts.mergedPullRequestsTotalCount,
    closedPullRequestsTotalCount: counts.closedPullRequestsTotalCount,
    openPullRequestsTotalCount: counts.openPullRequestsTotalCount,
    updatedAt: nowIso,
  };
}

function mapApiUserToResponse(
  user: PullRequestsUser,
  login: string,
  mergedPullRequestsTotalCount: number,
  weeklyCap: number,
): PullRequestStatsResponse {
  const contributions = buildContributionsFromUser(user);
  const counts = buildCountsFromUser(user, mergedPullRequestsTotalCount, weeklyCap);
  return {
    login,
    name: user.name ?? null,
    contributionsCollection: {
      totalPullRequestContributions: contributions.totalPullRequestContributions,
      totalPullRequestReviewContributions: contributions.totalPullRequestReviewContributions,
    },
    pullRequests: {
      totalCount: counts.pullRequestsTotalCount,
      weeklyCount: counts.pullRequestsWeeklyCount,
    },
    mergedPullRequests: { totalCount: counts.mergedPullRequestsTotalCount },
    closedPullRequests: { totalCount: counts.closedPullRequestsTotalCount },
    openPullRequests: { totalCount: counts.openPullRequestsTotalCount },
  };
}
// #endregion Mappings

// #region Service
async function resolveCachedStatsResponse(
  repository: PullRequestStatsRepository,
  developer: DeveloperRecord,
  options: PullRequestStatsOptions,
): Promise<PullRequestStatsResponse | null> {
  const cachedRecord = await repository.findByDeveloperId(developer.id);
  if (!cachedRecord) {
    return null;
  }

  if (
    options.cohortSnapshotSourceId
    && cachedRecord.cohortSnapshotSourceId !== options.cohortSnapshotSourceId
  ) {
    return null;
  }

  return mapRecordToResponse(cachedRecord, developer);
}

export async function ensurePullRequestStats(
  developer: DeveloperRecord,
  options: PullRequestStatsOptions = {},
): Promise<PullRequestStatsResponse | null> {
  const pullRequestStatsRepository = PullRequestStatsRepository.getInstance();
  const githubApiService = GithubApiService.getInstance();
  // 1) Fetch current totals from GitHub.
  const user = await githubApiService.fetchPullRequestsUser(developer.username);
  if (!user) {
    return null;
  }

  // 2) Persist totals, return saved record when possible.
  const weeklyCap = ratingsConfig.pullRequestFrequency.capPerWeek;
  const mergedPullRequestsTotalCount = await githubApiService.fetchMergedPullRequestsCount(user.login);
  const values: PullRequestStatsInsert = {
    ...mapApiUserToDb(user, developer.id, mergedPullRequestsTotalCount, weeklyCap),
    cohortSnapshotSourceId: options.cohortSnapshotSourceId ?? null,
  };
  const savedRecord = await pullRequestStatsRepository.upsert(values);

  if (savedRecord) {
    return mapRecordToResponse(savedRecord, developer);
  }

  return mapApiUserToResponse(user, developer.username, mergedPullRequestsTotalCount, weeklyCap);
}
// #endregion Service
