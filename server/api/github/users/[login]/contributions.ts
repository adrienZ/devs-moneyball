import type { H3Event } from "h3";
import { createError, defineEventHandler, getRouterParam } from "h3";
import { graphql } from "@octokit/graphql";
import { useRuntimeConfig } from "#imports";

export interface ContributionRepo {
  nameWithOwner: string;
  url: string;
  stars: number;
  description: string | null;
  language: string | null;
  type: "owned" | "external";
  organization?: {
    login: string;
    name: string | null;
    avatarUrl: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default defineEventHandler(async (event: H3Event) => {
  const login = getRouterParam(event, "login");
  if (!login) {
    throw createError({
      statusCode: 400,
      message: "Missing required parameter: login",
    });
  }

  const config = useRuntimeConfig();
  const token = config.public.githubToken;
  const graphqlWithAuth = graphql.defaults({
    headers: { authorization: `Bearer ${token}` },
  });

  try {
    type Response = {
      search: {
        nodes: Array<{
          title: string;
          url: string;
          number: number;
          createdAt: string;
          mergedAt: string;
          repository: {
            nameWithOwner: string;
            url: string;
            stargazerCount: number;
            owner: { avatarUrl: string };
          };
        } | null>;
      };
    };

    const query = `type:pr author:${login} is:merged is:public -user:${login} sort:updated-desc`;
    const resp = await graphqlWithAuth<Response>(
      `query SearchMergedExternalPRs($q: String!) {
        search(query: $q, type: ISSUE, first: 50) {
          nodes {
            ... on PullRequest {
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
      }`,
      { q: query },
    );

    const pullRequests = (resp.search.nodes ?? [])
      .filter(maybeNode => maybeNode !== null)
      .map(node => ({
        title: node.title,
        url: node.url,
        number: node.number,
        createdAt: node.createdAt,
        mergedAt: node.mergedAt as string,
        repository: {
          nameWithOwner: node.repository.nameWithOwner,
          url: node.repository.url,
          stars: node.repository.stargazerCount,
          ownerAvatarUrl: node.repository.owner.avatarUrl,
        },
      }));

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
