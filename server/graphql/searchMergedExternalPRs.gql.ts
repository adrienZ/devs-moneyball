import { graphql } from "../../codegen";

export const searchMergedExternalPRsQuery = graphql(/* GraphQL */ `
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
