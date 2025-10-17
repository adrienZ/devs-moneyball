import { createError, defineEventHandler, getRouterParam } from "h3";
import { eq } from "drizzle-orm";
import { getGithubClient } from "~~/server/githubClient";
import { graphql } from "~~/codegen";
import type { DocumentType } from "~~/codegen";
import { useDrizzle } from "~~/database/client";
import { developper, githubPullRequestStats } from "~~/database/schema";

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
type DeveloperRecord = typeof developper.$inferSelect;

function mapRecordToResponse(
  record: PullRequestStatsRecord,
  developerRecord: DeveloperRecord,
): PullRequestStatsResponse {
  return {
    login: developerRecord.username,
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

function mapApiUserToDb(user: PullRequestsUser, developerId: string): PullRequestStatsInsert {
  const nowIso = new Date().toISOString();
  return {
    developerId,
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

export default defineEventHandler(async (event) => {
  const username = getRouterParam(event, "username");
  if (!username) {
    throw createError({
      statusCode: 400,
      message: "Missing required parameter: username",
    });
  }

  const db = useDrizzle();

  const developerRecord = await db
    .select()
    .from(developper)
    .where(eq(developper.username, username))
    .limit(1);

  const developerRow = developerRecord.at(0);
  if (!developerRow) {
    throw createError({
      statusCode: 404,
      message: "Developer not found",
    });
  }

  const existingRecord = await db
    .select()
    .from(githubPullRequestStats)
    .where(eq(githubPullRequestStats.developerId, developerRow.id))
    .limit(1);

  const cachedRecord = existingRecord.at(0);
  if (cachedRecord) {
    return mapRecordToResponse(cachedRecord, developerRow);
  }

  const { user } = await getGithubClient().call(pullRequestsQuery, { username });
  if (!user) {
    throw createError({ statusCode: 404, message: "User not found" });
  }

  const values = mapApiUserToDb(user, developerRow.id);
  const [savedRecord] = await db
    .insert(githubPullRequestStats)
    .values(values)
    .onConflictDoUpdate({
      target: githubPullRequestStats.developerId,
      set: values,
    })
    .returning();

  if (savedRecord) {
    return mapRecordToResponse(savedRecord, developerRow);
  }

  return mapApiUserToResponse(user, developerRow.username);
});
