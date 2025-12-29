import { graphql } from "../../codegen";

export const popularUsersQuery = graphql(/* GraphQL */ `
  query PopularUsers($q: String!, $pageSize: Int!) {
    search(query: $q, type: USER, first: $pageSize) {
      userCount
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
