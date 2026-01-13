import type { DocumentType } from "../../codegen";
import { getGithubClient } from "~~/server/githubClient";
import { getPullRequestsStatsQuery } from "~~/server/graphql/getPullRequestsStats.gql";
import { searchMergedPullRequestsQuery } from "~~/server/graphql/searchMergedPullRequests.gql";
import {
  getMergedPullRequestsSinceDateFromWeeks,
  getMergedPullRequestsSinceDateTimeFromWeeks,
} from "~~/server/utils/date-helper";

type PullRequestsQueryResult = DocumentType<typeof getPullRequestsStatsQuery>;
export type PullRequestsUser = NonNullable<PullRequestsQueryResult["user"]>;

type MergedPullRequestsQueryResult = DocumentType<typeof searchMergedPullRequestsQuery>;
type MergedPullRequestsSearch = MergedPullRequestsQueryResult["search"];
type MergedPullRequestsNode = NonNullable<NonNullable<MergedPullRequestsSearch["nodes"]>[number]>;

export type PullRequestCountsSince = {
  mergedPullRequestsTotalCount: number;
  closedPullRequestsTotalCount: number;
  openPullRequestsTotalCount: number;
};

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

  async fetchPullRequestsUser(
    username: string,
    lookbackWeeks: number,
  ): Promise<PullRequestsUser | null> {
    const sinceDateTime = getMergedPullRequestsSinceDateTimeFromWeeks(
      lookbackWeeks,
    );
    const { user } = await getGithubClient().call(getPullRequestsStatsQuery, {
      username,
      from: sinceDateTime,
    });

    return user ?? null;
  }

  private async fetchPullRequestCountBySearch(query: string): Promise<number> {
    const githubClient = getGithubClient();
    let after: string | null = null;
    let total = 0;

    do {
      // FIXME: codegen infer is broken for some reason here
      const resp: MergedPullRequestsQueryResult = await githubClient.call(searchMergedPullRequestsQuery, {
        q: query,
        after,
      });

      const nodes = resp.search.nodes ?? [];
      total += nodes.filter(isPullRequestNode).length;

      after = resp.search.pageInfo.endCursor ?? null;
      if (!resp.search.pageInfo.hasNextPage) {
        break;
      }
    } while (after);

    return total;
  }

  async fetchMergedPullRequestsCount(login: string, lookbackWeeks: number): Promise<number> {
    const sinceDate = getMergedPullRequestsSinceDateFromWeeks(
      lookbackWeeks,
    );
    const query = `is:pr author:${login} is:merged merged:>=${sinceDate}`;
    return this.fetchPullRequestCountBySearch(query);
  }

  async fetchPullRequestCountsSince(
    login: string,
    lookbackWeeks: number,
  ): Promise<PullRequestCountsSince> {
    const sinceDate = getMergedPullRequestsSinceDateFromWeeks(
      lookbackWeeks,
    );
    const baseQuery = `is:pr author:${login}`;
    const [
      mergedPullRequestsTotalCount,
      closedPullRequestsTotalCount,
      openPullRequestsTotalCount,
    ] = await Promise.all([
      this.fetchPullRequestCountBySearch(`${baseQuery} is:merged merged:>=${sinceDate}`),
      this.fetchPullRequestCountBySearch(`${baseQuery} is:closed -is:merged closed:>=${sinceDate}`),
      this.fetchPullRequestCountBySearch(`${baseQuery} is:open created:>=${sinceDate}`),
    ]);

    return {
      mergedPullRequestsTotalCount,
      closedPullRequestsTotalCount,
      openPullRequestsTotalCount,
    };
  }
}
