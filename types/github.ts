import { GraphQLClient } from 'graphql-request'

export const BigRepoPullRequestsDocument = /* GraphQL */ `
query BigRepoPullRequests($username: String!, $since: DateTime!, $until: DateTime!) {
  user(login: $username) {
    pullRequests(first: 100, states: MERGED, orderBy: {field: UPDATED_AT, direction: DESC}) {
      nodes {
        repository {
          nameWithOwner
          stargazerCount
          forkCount
        }
        merged
        createdAt
      }
    }
  }
}
`

export const BigRepoCommitsDocument = /* GraphQL */ `
query BigRepoCommits($username: String!, $since: DateTime!, $until: DateTime!) {
  user(login: $username) {
    contributionsCollection(from: $since, to: $until) {
      commitContributionsByRepository {
        repository {
          nameWithOwner
          stargazerCount
          forkCount
        }
        contributions {
          totalCount
        }
      }
    }
  }
}
`

export const BigRepoIssuesDocument = /* GraphQL */ `
query BigRepoIssues($username: String!, $since: DateTime!, $until: DateTime!) {
  user(login: $username) {
    issues(first: 100, orderBy: {field: UPDATED_AT, direction: DESC}, filterBy: {since: $since}) {
      nodes {
        repository {
          nameWithOwner
          stargazerCount
          forkCount
        }
        createdAt
      }
    }
  }
}
`

export function getSdk(client: GraphQLClient) {
  return {
    BigRepoPullRequests(variables: any) {
      return client.request(BigRepoPullRequestsDocument, variables)
    },
    BigRepoCommits(variables: any) {
      return client.request(BigRepoCommitsDocument, variables)
    },
    BigRepoIssues(variables: any) {
      return client.request(BigRepoIssuesDocument, variables)
    }
  }
}
