import { graphql } from "../../codegen";

export const popularUsersQuery = graphql(/* GraphQL */ `
  query PopularUsers($q: String!, $pageSize: Int!, $after: String) {
    search(query: $q, type: USER, first: $pageSize, after: $after) {
      userCount
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ... on User {
          login
          name
          location
          followers {
            totalCount
          }
          createdAt
        }
      }
    }
  }
`);
