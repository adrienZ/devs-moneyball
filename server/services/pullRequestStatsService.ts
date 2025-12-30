import type { developper, githubPullRequestStats } from "~~/database/schema";
import { PullRequestStatsRepository } from "~~/server/repositories/pullRequestStatsRepository";
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
  pullRequestsTotalCount: number;
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

function buildCountsFromUser(user: PullRequestsUser, mergedPullRequestsTotalCount: number): PullRequestCounts {
  return {
    pullRequestsTotalCount: user.pullRequests.totalCount,
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
    pullRequests: { totalCount: record.pullRequestsTotalCount },
    mergedPullRequests: { totalCount: record.mergedPullRequestsTotalCount },
    closedPullRequests: { totalCount: record.closedPullRequestsTotalCount },
    openPullRequests: { totalCount: record.openPullRequestsTotalCount },
  };
}

function mapApiUserToDb(
  user: PullRequestsUser,
  developerId: string,
  mergedPullRequestsTotalCount: number,
): PullRequestStatsInsert {
  const nowIso = new Date().toISOString();
  const contributions = buildContributionsFromUser(user);
  const counts = buildCountsFromUser(user, mergedPullRequestsTotalCount);
  return {
    developerId,
    totalPullRequestContributions: contributions.totalPullRequestContributions,
    totalPullRequestReviewContributions: contributions.totalPullRequestReviewContributions,
    pullRequestsTotalCount: counts.pullRequestsTotalCount,
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
): PullRequestStatsResponse {
  const contributions = buildContributionsFromUser(user);
  const counts = buildCountsFromUser(user, mergedPullRequestsTotalCount);
  return {
    login,
    name: user.name ?? null,
    contributionsCollection: {
      totalPullRequestContributions: contributions.totalPullRequestContributions,
      totalPullRequestReviewContributions: contributions.totalPullRequestReviewContributions,
    },
    pullRequests: { totalCount: counts.pullRequestsTotalCount },
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
    const updatedRecord = await repository.updateCohortSnapshotSource(
      developer.id,
      options.cohortSnapshotSourceId,
    );

    if (updatedRecord) return mapRecordToResponse(updatedRecord, developer);
  }

  return mapRecordToResponse(cachedRecord, developer);
}

export async function ensurePullRequestStats(
  developer: DeveloperRecord,
  options: PullRequestStatsOptions = {},
): Promise<PullRequestStatsResponse | null> {
  const pullRequestStatsRepository = PullRequestStatsRepository.getInstance();
  const githubApiService = GithubApiService.getInstance();
  // 1) Prefer cached stats, update cohort snapshot when requested.
  const cachedResponse = await resolveCachedStatsResponse(
    pullRequestStatsRepository,
    developer,
    options,
  );
  if (cachedResponse) return cachedResponse;

  // 2) Fetch current totals from GitHub when cache is missing.
  const user = await githubApiService.fetchPullRequestsUser(developer.username);
  if (!user) {
    return null;
  }

  // 3) Persist totals, return saved record when possible.
  const mergedPullRequestsTotalCount = await githubApiService.fetchMergedPullRequestsCount(user.login);
  const values: PullRequestStatsInsert = {
    ...mapApiUserToDb(user, developer.id, mergedPullRequestsTotalCount),
    cohortSnapshotSourceId: options.cohortSnapshotSourceId ?? null,
  };
  const savedRecord = await pullRequestStatsRepository.upsert(values);

  if (savedRecord) {
    return mapRecordToResponse(savedRecord, developer);
  }

  return mapApiUserToResponse(user, developer.username, mergedPullRequestsTotalCount);
}
// #endregion Service
