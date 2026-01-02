import { graphql } from "../../codegen";

export const searchMergedPullRequestsQuery = graphql(/* GraphQL */ `
  query SearchMergedPullRequests($q: String!, $after: String, $first: Int = 100) {
    search(query: $q, type: ISSUE, first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ... on PullRequest {
          __typename
          title
          url
          createdAt
          mergedAt
          number
          repository {
            __typename
            nameWithOwner
            url
            stargazerCount
            owner {
              avatarUrl
              login
            }
          }
        }
      }
    }
  }
`);
