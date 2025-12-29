import { graphql } from "../../codegen";

export const getUserInfoQuery = graphql(/* GraphQL */ `
  query GetUserInfo($login: String!) {
    user(login: $login) {
      login
      id
      avatarUrl
      followers {
        totalCount
      }
      following {
        totalCount
      }
      repositories(first: 100, privacy: PUBLIC) {
        totalCount
        nodes {
          stargazerCount
          forkCount
          primaryLanguage { name }
        }
      }
      repositoriesContributedTo(
        first: 100
        privacy: PUBLIC
        includeUserRepositories: false
        contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY]
      ) {
        totalCount
        nodes {
          nameWithOwner
          url
          stargazerCount
          forkCount
          primaryLanguage { name }
          owner {
            __typename
            login
            ... on Organization { name }
          }
        }
      }
      gists(privacy: PUBLIC) {
        totalCount
      }
      createdAt
      bio
    }
  }
`);
