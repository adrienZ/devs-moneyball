import { eq } from "drizzle-orm";
import { graphql } from "~~/codegen";
import type { DocumentType } from "~~/codegen";
import type { useDrizzle } from "~~/database/client";
import type { developper } from "~~/database/schema";
import { githubPullRequestStats } from "~~/database/schema";
import { getGithubClient } from "~~/server/githubClient";

type DrizzleClient = ReturnType<typeof useDrizzle>;

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

const mergedExternalPullRequestsCountQuery = graphql(/* GraphQL */ `
  query SearchMergedExternalPRCount($q: String!) {
    search(query: $q, type: ISSUE, first: 1) {
      issueCount
    }
  }
`);

type PullRequestsQueryResult = DocumentType<typeof pullRequestsQuery>;
type PullRequestsUser = NonNullable<PullRequestsQueryResult["user"]>;

const WEEKLY_EXTERNAL_PULL_REQUEST_DAYS = 7;
const WEEKLY_EXTERNAL_PULL_REQUEST_CAP = 30;
const COHORT_LOOKBACK_YEARS = 5;

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
  mergedExternalPullRequestsWeeklyCount: number;
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
    mergedExternalPullRequestsWeeklyCount: record.mergedExternalPullRequestsWeeklyCount,
  };
}

function mapApiUserToDb(
  user: PullRequestsUser,
  developerId: string,
  mergedExternalPullRequestsWeeklyCount: number,
): PullRequestStatsInsert {
  const nowIso = new Date().toISOString();
  return {
    developerId,
    totalPullRequestContributions: user.contributionsCollection.totalPullRequestContributions,
    totalPullRequestReviewContributions: user.contributionsCollection.totalPullRequestReviewContributions,
    pullRequestsTotalCount: user.pullRequests.totalCount,
    mergedPullRequestsTotalCount: user.mergedPullRequests.totalCount,
    closedPullRequestsTotalCount: user.closedPullRequests.totalCount,
    openPullRequestsTotalCount: user.openPullRequests.totalCount,
    mergedExternalPullRequestsWeeklyCount,
    updatedAt: nowIso,
  };
}

type PullRequestStatsOptions = {
  cohortSnapshotSourceId?: string;
};

function mapApiUserToResponse(
  user: PullRequestsUser,
  login: string,
  mergedExternalPullRequestsWeeklyCount: number,
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
    mergedExternalPullRequestsWeeklyCount,
  };
}

function getDateStringDaysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function getDateStringYearsAgo(years: number): string {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() - years);
  return date.toISOString().slice(0, 10);
}

async function fetchMergedExternalPullRequestsWeeklyCount(
  login: string,
): Promise<number> {
  const fromDate = getDateStringDaysAgo(WEEKLY_EXTERNAL_PULL_REQUEST_DAYS);
  const cohortFromDate = getDateStringYearsAgo(COHORT_LOOKBACK_YEARS);
  const query = `type:pr author:${login} is:merged is:public -user:${login} merged:>=${fromDate} created:>=${cohortFromDate}`;
  const response = await getGithubClient().call(
    mergedExternalPullRequestsCountQuery,
    { q: query },
  );

  const count = response.search.issueCount;
  return Math.min(count, WEEKLY_EXTERNAL_PULL_REQUEST_CAP);
}

export async function ensurePullRequestStats(
  db: DrizzleClient,
  developer: DeveloperRecord,
  options: PullRequestStatsOptions = {},
): Promise<PullRequestStatsResponse | null> {
  const existingRecord = await db
    .select()
    .from(githubPullRequestStats)
    .where(eq(githubPullRequestStats.developerId, developer.id))
    .limit(1);

  const cachedRecord = existingRecord.at(0);
  if (cachedRecord) {
    const shouldUpdateCohortSnapshot = Boolean(
      options.cohortSnapshotSourceId
      && cachedRecord.cohortSnapshotSourceId !== options.cohortSnapshotSourceId,
    );

    if (shouldUpdateCohortSnapshot) {
      const updatePayload: Partial<PullRequestStatsInsert> = {};

      if (shouldUpdateCohortSnapshot) {
        updatePayload.cohortSnapshotSourceId = options.cohortSnapshotSourceId ?? null;
      }

      const nowIso = new Date().toISOString();
      const [updatedRecord] = await db
        .update(githubPullRequestStats)
        .set({
          ...updatePayload,
          updatedAt: nowIso,
        })
        .where(eq(githubPullRequestStats.developerId, developer.id))
        .returning();

      if (updatedRecord) {
        return mapRecordToResponse(updatedRecord, developer);
      }
    }

    return mapRecordToResponse(cachedRecord, developer);
  }

  const { user } = await getGithubClient().call(pullRequestsQuery, {
    username: developer.username,
  });

  if (!user) {
    return null;
  }

  const mergedExternalPullRequestsWeeklyCount = await fetchMergedExternalPullRequestsWeeklyCount(
    developer.username,
  );
  const values: PullRequestStatsInsert = {
    ...mapApiUserToDb(user, developer.id, mergedExternalPullRequestsWeeklyCount),
    cohortSnapshotSourceId: options.cohortSnapshotSourceId ?? null,
  };
  const [savedRecord] = await db
    .insert(githubPullRequestStats)
    .values(values)
    .onConflictDoUpdate({
      target: githubPullRequestStats.developerId,
      set: values,
    })
    .returning();

  if (savedRecord) {
    return mapRecordToResponse(savedRecord, developer);
  }

  return mapApiUserToResponse(user, developer.username, mergedExternalPullRequestsWeeklyCount);
}
