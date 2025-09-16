import type { H3Event } from "h3";
import { createError, defineEventHandler, getRouterParam } from "h3";
import { graphql } from "~~/codegen";
import { getGithubClient } from "~~/server/githubClient";

const contributionsQuery = graphql(/* GraphQL */ `
  query SearchMergedExternalPRs($q: String!) {
    search(query: $q, type: ISSUE, first: 50) {
      nodes {
        ... on PullRequest {
          __typename
          title
          url
          number
          createdAt
          mergedAt
          repository {
            nameWithOwner
            url
            stargazerCount
            owner { avatarUrl }
          }
        }
      }
    }
  }
`);

interface PullRequest {
  title: string;
  url: string;
  number: number;
  createdAt: string;
  mergedAt: string;
  repository: {
    nameWithOwner: string;
    url: string;
    stars: number;
    ownerAvatarUrl: string;
  };
}

export default defineEventHandler(async (event: H3Event) => {
  const login = getRouterParam(event, "login");
  if (!login) {
    throw createError({
      statusCode: 400,
      message: "Missing required parameter: login",
    });
  }

  try {
    const query = `type:pr author:${login} is:merged is:public -user:${login} sort:updated-desc`;
    const resp = await getGithubClient().call(
      contributionsQuery,
      { q: query },
    );

    const pullRequests = (resp.search.nodes ?? [])
      .reduce<Array<PullRequest>>((acc, maybeNode) => {
        if (maybeNode === null) {
          return acc;
        }

        if (maybeNode.__typename !== "PullRequest") {
          return acc;
        }

        return [
          ...acc,
          {
            title: maybeNode.title,
            url: maybeNode.url,
            number: maybeNode.number,
            createdAt: maybeNode.createdAt,
            mergedAt: maybeNode.mergedAt as string,
            repository: {
              nameWithOwner: maybeNode.repository.nameWithOwner,
              url: maybeNode.repository.url,
              stars: maybeNode.repository.stargazerCount,
              ownerAvatarUrl: maybeNode.repository.owner.avatarUrl,
            },
          },
        ];
      }, []);

    return pullRequests;
  }
  catch (error) {
    const err = error as Error;

    throw createError({
      statusCode: 500,
      message: err.message || "Failed to fetch user contributions",
    });
  }
});
