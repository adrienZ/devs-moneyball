import { graphql } from "../../codegen";

export const getPullRequestsStatsQuery = graphql(/* GraphQL */ `
  query GetPullRequestsStats($username: String!, $from: DateTime) {
    user(login: $username) {
      login
      name
      contributionsCollection(from: $from) {
        totalPullRequestContributions
        totalPullRequestReviewContributions
      }
      pullRequests(first: 1) {
        totalCount
      }
      mergedPullRequests: pullRequests(first: 1, states: MERGED) {
        totalCount
      }
      closedPullRequests: pullRequests(first: 1, states: CLOSED) {
        totalCount
      }
      openPullRequests: pullRequests(first: 1, states: OPEN) {
        totalCount
      }
    }
  }
`);
