import type { H3Event } from "h3";
import { createError, defineEventHandler, getRouterParam } from "h3";
import { graphql } from "~~/codegen";
import { getGithubClient } from "~~/server/githubClient";

const contributionsQuery = graphql(/* GraphQL */ `
  query SearchMergedExternalPRs($q: String!) {
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
  }
`);

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
