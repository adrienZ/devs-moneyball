import type { DocumentType } from "../../codegen";
import type { developper, githubPullRequestStats } from "~~/database/schema";
import { getGithubClient } from "~~/server/githubClient";
import { PullRequestStatsRepository } from "~~/server/repositories/pullRequestStatsRepository";
import { getPullRequestsStatsQuery } from "~~/server/graphql/getPullRequestsStats.gql";
import { searchMergedPullRequestsQuery } from "~~/server/graphql/searchMergedPullRequests.gql";

type PullRequestStatsRecord = typeof githubPullRequestStats.$inferSelect;
type PullRequestStatsInsert = typeof githubPullRequestStats.$inferInsert;
type DeveloperRecord = typeof developper.$inferSelect;

type PullRequestsQueryResult = DocumentType<typeof getPullRequestsStatsQuery>;
type PullRequestsUser = NonNullable<PullRequestsQueryResult["user"]>;

type MergedPullRequestsQueryResult = DocumentType<typeof searchMergedPullRequestsQuery>;
type MergedPullRequestsSearch = MergedPullRequestsQueryResult["search"];
type MergedPullRequestsNode = NonNullable<NonNullable<MergedPullRequestsSearch["nodes"]>[number]>;

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

function mapApiUserToDb(
  user: PullRequestsUser,
  developerId: string,
  mergedPullRequestsTotalCount: number,
): PullRequestStatsInsert {
  const nowIso = new Date().toISOString();
  return {
    developerId,
    totalPullRequestContributions: user.contributionsCollection.totalPullRequestContributions,
    totalPullRequestReviewContributions: user.contributionsCollection.totalPullRequestReviewContributions,
    pullRequestsTotalCount: user.pullRequests.totalCount,
    mergedPullRequestsTotalCount,
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
  mergedPullRequestsTotalCount: number,
): PullRequestStatsResponse {
  return {
    login,
    name: user.name ?? null,
    contributionsCollection: {
      totalPullRequestContributions: user.contributionsCollection.totalPullRequestContributions,
      totalPullRequestReviewContributions: user.contributionsCollection.totalPullRequestReviewContributions,
    },
    pullRequests: { totalCount: user.pullRequests.totalCount },
    mergedPullRequests: { totalCount: mergedPullRequestsTotalCount },
    closedPullRequests: { totalCount: user.closedPullRequests.totalCount },
    openPullRequests: { totalCount: user.openPullRequests.totalCount },
  };
}

function getFiveYearsAgoDate(): string {
  const now = new Date();
  now.setFullYear(now.getFullYear() - 5);
  return now.toISOString().split("T")[0] ?? now.toISOString();
}

function isPullRequestNode(node: MergedPullRequestsNode | null): node is MergedPullRequestsNode & { __typename: "PullRequest" } {
  return !!node && node.__typename === "PullRequest";
}

async function fetchMergedPullRequestsCount(login: string): Promise<number> {
  const githubClient = getGithubClient();
  const sinceDate = getFiveYearsAgoDate();
  const query = `is:pr author:${login} merged:>=${sinceDate}`;
  let after: string | null = null;
  let total = 0;

  do {
    // FIXME: codegen infer is broken for some reason here
    const resp: MergedPullRequestsQueryResult = await githubClient.call(searchMergedPullRequestsQuery, {
      q: query,
      after,
    });

    const nodes = resp.search.nodes ?? [];
    total += nodes
      .filter(isPullRequestNode)
      .filter(node => node.repository.owner.login === login)
      .length;

    after = resp.search.pageInfo.endCursor ?? null;
    if (!resp.search.pageInfo.hasNextPage) {
      break;
    }
  } while (after);

  return total;
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

  const { user } = await getGithubClient().call(getPullRequestsStatsQuery, {
    username: developer.username,
  });

  if (!user) {
    return null;
  }

  const mergedPullRequestsTotalCount = await fetchMergedPullRequestsCount(user.login);
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
