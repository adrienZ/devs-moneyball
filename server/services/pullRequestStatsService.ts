import { graphql } from "~~/codegen";
import type { DocumentType } from "~~/codegen";
import type { developper } from "~~/database/schema";
import { githubPullRequestStats } from "~~/database/schema";
import { getGithubClient } from "~~/server/githubClient";
import { PullRequestStatsRepository } from "~~/server/repositories/pullRequestStatsRepository";

type PullRequestStatsRecord = typeof githubPullRequestStats.$inferSelect;
type PullRequestStatsInsert = typeof githubPullRequestStats.$inferInsert;
type DeveloperRecord = typeof developper.$inferSelect;

const pullRequestsQuery = graphql(/* GraphQL */ `
  query GetPullRequestsStats($username: String!) {
    user(login: $username) {
      login
      name
      contributionsCollection {
        totalPullRequestContributions
        totalPullRequestReviewContributions
      }
      pullRequests(first: 1) {
        totalCount
      }
      mergedPullRequests: pullRequests(first: 1, states: MERGED) {
        totalCount
      }
      closedPullRequests: pullRequests(first: 1, states: CLOSED) {
        totalCount
      }
      openPullRequests: pullRequests(first: 1, states: OPEN) {
        totalCount
      }
    }
  }
`);

type PullRequestsQueryResult = DocumentType<typeof pullRequestsQuery>;
type PullRequestsUser = NonNullable<PullRequestsQueryResult["user"]>;

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

function mapApiUserToDb(user: PullRequestsUser, developerId: string): PullRequestStatsInsert {
  const nowIso = new Date().toISOString();
  return {
    developerId,
    totalPullRequestContributions: user.contributionsCollection.totalPullRequestContributions,
    totalPullRequestReviewContributions: user.contributionsCollection.totalPullRequestReviewContributions,
    pullRequestsTotalCount: user.pullRequests.totalCount,
    mergedPullRequestsTotalCount: user.mergedPullRequests.totalCount,
    closedPullRequestsTotalCount: user.closedPullRequests.totalCount,
    openPullRequestsTotalCount: user.openPullRequests.totalCount,
    updatedAt: nowIso,
  };
}

type PullRequestStatsOptions = {
  cohortSnapshotSourceId?: string;
};

function mapApiUserToResponse(
  user: PullRequestsUser,
  login: string,
): PullRequestStatsResponse {
  return {
    login,
    name: user.name ?? null,
    contributionsCollection: {
      totalPullRequestContributions: user.contributionsCollection.totalPullRequestContributions,
      totalPullRequestReviewContributions: user.contributionsCollection.totalPullRequestReviewContributions,
    },
    pullRequests: { totalCount: user.pullRequests.totalCount },
    mergedPullRequests: { totalCount: user.mergedPullRequests.totalCount },
    closedPullRequests: { totalCount: user.closedPullRequests.totalCount },
    openPullRequests: { totalCount: user.openPullRequests.totalCount },
  };
}

export async function ensurePullRequestStats(
  developer: DeveloperRecord,
  options: PullRequestStatsOptions = {},
): Promise<PullRequestStatsResponse | null> {
  const pullRequestStatsRepository = PullRequestStatsRepository.getInstance();
  const cachedRecord = await pullRequestStatsRepository.findByDeveloperId(developer.id);
  if (cachedRecord) {
    if (
      options.cohortSnapshotSourceId
      && cachedRecord.cohortSnapshotSourceId !== options.cohortSnapshotSourceId
    ) {
      const updatedRecord = await pullRequestStatsRepository.updateCohortSnapshotSource(
        developer.id,
        options.cohortSnapshotSourceId,
      );

      if (updatedRecord) return mapRecordToResponse(updatedRecord, developer);
    }

    return mapRecordToResponse(cachedRecord, developer);
  }

  const { user } = await getGithubClient().call(pullRequestsQuery, {
    username: developer.username,
  });

  if (!user) {
    return null;
  }

  const values: PullRequestStatsInsert = {
    ...mapApiUserToDb(user, developer.id),
    cohortSnapshotSourceId: options.cohortSnapshotSourceId ?? null,
  };
  const savedRecord = await pullRequestStatsRepository.upsert(values);

  if (savedRecord) {
    return mapRecordToResponse(savedRecord, developer);
  }

  return mapApiUserToResponse(user, developer.username);
}
