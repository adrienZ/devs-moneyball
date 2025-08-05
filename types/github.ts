import { gql } from 'graphql-request'
import type { GraphQLClient } from 'graphql-request'

export type TopParisDevsQuery = {
  search: {
    edges?: Array<{
      node?: {
        __typename?: 'User'
        login: string
        name?: string | null
        avatarUrl: string
        followers: { totalCount: number }
      } | null
    } | null> | null
  }
}

export type TopParisDevsQueryVariables = Record<string, never>

export const TopParisDevsDocument = gql`
  query TopParisDevs {
    search(query: "location:paris type:user", type: USER, first: 50) {
      edges {
        node {
          ... on User {
            login
            name
            avatarUrl
            followers {
              totalCount
            }
          }
        }
      }
    }
  }
`

export function getSdk(client: GraphQLClient) {
  return {
    TopParisDevs(
      variables?: TopParisDevsQueryVariables,
      requestHeaders?: HeadersInit,
    ): Promise<TopParisDevsQuery> {
      return client.request<TopParisDevsQuery>(TopParisDevsDocument, variables, requestHeaders)
    },
  }
}

export type Sdk = ReturnType<typeof getSdk>
