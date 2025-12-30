import type { DocumentType } from "../../codegen";
import { ratingsConfig } from "~~/server/core/ratings/rating.config";
import { getGithubClient } from "~~/server/githubClient";
import { getPullRequestsStatsQuery } from "~~/server/graphql/getPullRequestsStats.gql";
import { searchMergedPullRequestsQuery } from "~~/server/graphql/searchMergedPullRequests.gql";

type PullRequestsQueryResult = DocumentType<typeof getPullRequestsStatsQuery>;
export type PullRequestsUser = NonNullable<PullRequestsQueryResult["user"]>;

type MergedPullRequestsQueryResult = DocumentType<typeof searchMergedPullRequestsQuery>;
type MergedPullRequestsSearch = MergedPullRequestsQueryResult["search"];
type MergedPullRequestsNode = NonNullable<NonNullable<MergedPullRequestsSearch["nodes"]>[number]>;

function getMergedPullRequestsSinceDate(lookbackYears: number): string {
  const now = new Date();
  now.setFullYear(now.getFullYear() - lookbackYears);
  return now.toISOString().split("T")[0] ?? now.toISOString();
}

function isPullRequestNode(node: MergedPullRequestsNode | null): node is MergedPullRequestsNode & { __typename: "PullRequest" } {
  return !!node && node.__typename === "PullRequest";
}

export class GithubApiService {
  private static instance: GithubApiService | null = null;

  private constructor() {}

  static getInstance(): GithubApiService {
    if (!GithubApiService.instance) {
      GithubApiService.instance = new GithubApiService();
    }
    return GithubApiService.instance;
  }

  async fetchPullRequestsUser(username: string): Promise<PullRequestsUser | null> {
    const { user } = await getGithubClient().call(getPullRequestsStatsQuery, {
      username,
    });

    return user ?? null;
  }

  async fetchMergedPullRequestsCount(login: string): Promise<number> {
    const githubClient = getGithubClient();
    const sinceDate = getMergedPullRequestsSinceDate(
      ratingsConfig.githubApi.mergedPullRequestsLookbackYears,
    );
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
}
