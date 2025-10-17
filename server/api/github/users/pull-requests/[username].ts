import { createError, defineEventHandler, getRouterParam } from "h3";
import { eq } from "drizzle-orm";
import { getGithubClient } from "~~/server/githubClient";
import { graphql } from "~~/codegen";
import type { DocumentType } from "~~/codegen";
import { useDrizzle } from "~~/database/client";
import { githubPullRequestStats } from "~~/database/schema";

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

type PullRequestStatsResponse = {
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

type PullRequestStatsRecord = typeof githubPullRequestStats.$inferSelect;
type PullRequestStatsInsert = typeof githubPullRequestStats.$inferInsert;

function mapRecordToResponse(record: PullRequestStatsRecord): PullRequestStatsResponse {
  return {
    login: record.username,
    name: record.name ?? null,
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

function mapApiUserToDb(user: PullRequestsUser): PullRequestStatsInsert {
  const nowIso = new Date().toISOString();
  return {
    username: user.login,
    name: user.name ?? null,
    totalPullRequestContributions: user.contributionsCollection.totalPullRequestContributions,
    totalPullRequestReviewContributions: user.contributionsCollection.totalPullRequestReviewContributions,
    pullRequestsTotalCount: user.pullRequests.totalCount,
    mergedPullRequestsTotalCount: user.mergedPullRequests.totalCount,
    closedPullRequestsTotalCount: user.closedPullRequests.totalCount,
    openPullRequestsTotalCount: user.openPullRequests.totalCount,
    updatedAt: nowIso,
  };
}

function mapApiUserToResponse(user: PullRequestsUser): PullRequestStatsResponse {
  return {
    login: user.login,
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

export default defineEventHandler(async (event) => {
  const username = getRouterParam(event, "username");
  if (!username) {
    throw createError({
      statusCode: 400,
      message: "Missing required parameter: username",
    });
  }

  const db = useDrizzle();

  const existingRecord = await db
    .select()
    .from(githubPullRequestStats)
    .where(eq(githubPullRequestStats.username, username))
    .limit(1);

  const cachedRecord = existingRecord.at(0);
  if (cachedRecord) {
    return mapRecordToResponse(cachedRecord);
  }

  const { user } = await getGithubClient().call(pullRequestsQuery, { username });
  if (!user) {
    throw createError({ statusCode: 404, message: "User not found" });
  }

  const values = mapApiUserToDb(user);
  const [savedRecord] = await db
    .insert(githubPullRequestStats)
    .values(values)
    .onConflictDoUpdate({
      target: githubPullRequestStats.username,
      set: values,
    })
    .returning();

  if (savedRecord) {
    return mapRecordToResponse(savedRecord);
  }

  return mapApiUserToResponse(user);
});
