import { graphql } from "../../codegen";

export const searchMergedPullRequestsQuery = graphql(/* GraphQL */ `
  query SearchMergedPullRequests($q: String!, $after: String) {
    search(query: $q, type: ISSUE, first: 100, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ... on PullRequest {
          __typename
          createdAt
          mergedAt
          number
          repository {
            __typename
            owner {
              login
            }
          }
        }
      }
    }
  }
`);
