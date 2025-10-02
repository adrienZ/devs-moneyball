/* eslint-disable */
import * as types from './graphql';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\nquery PopularUsers($q: String!, $pageSize: Int!) {\n  search(query: $q, type: USER, first: $pageSize) {\n    userCount\n    nodes {\n      ... on User {\n        login\n        name\n        location\n        followers {\n          totalCount\n        }\n        createdAt\n      }\n    }\n  }\n}": typeof types.PopularUsersDocument,
    "\n  query GetUserInfo($login: String!) {\n    user(login: $login) {\n      login\n      followers {\n        totalCount\n      }\n      following {\n        totalCount\n      }\n      repositories(first: 100, privacy: PUBLIC) {\n        totalCount\n        nodes {\n          stargazerCount\n          forkCount\n          primaryLanguage { name }\n        }\n      }\n      repositoriesContributedTo(\n        first: 100\n        privacy: PUBLIC\n        includeUserRepositories: false\n        contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY]\n      ) {\n        totalCount\n        nodes {\n          nameWithOwner\n          url\n          stargazerCount\n          forkCount\n          primaryLanguage { name }\n          owner {\n            __typename\n            login\n            ... on Organization { name }\n          }\n        }\n      }\n      gists(privacy: PUBLIC) {\n        totalCount\n      }\n      createdAt\n      bio\n    }\n  }\n": typeof types.GetUserInfoDocument,
    "\n  query SearchMergedExternalPRs($q: String!) {\n    search(query: $q, type: ISSUE, first: 50) {\n      nodes {\n        ... on PullRequest {\n          __typename\n          title\n          url\n          number\n          createdAt\n          mergedAt\n          repository {\n            nameWithOwner\n            url\n            stargazerCount\n            owner { avatarUrl }\n          }\n        }\n      }\n    }\n  }\n": typeof types.SearchMergedExternalPRsDocument,
    "\n  query GetPullRequestsStats($username: String!) {\n    user(login: $username) {\n      login\n      name\n      contributionsCollection {\n        totalPullRequestContributions\n        totalPullRequestReviewContributions\n      }\n      pullRequests(first: 1) {\n        totalCount\n      }\n      mergedPullRequests: pullRequests(first: 1, states: MERGED) {\n        totalCount\n      }\n      closedPullRequests: pullRequests(first: 1, states: CLOSED) {\n        totalCount\n      }\n      openPullRequests: pullRequests(first: 1, states: OPEN) {\n        totalCount\n      }\n    }\n}": typeof types.GetPullRequestsStatsDocument,
};
const documents: Documents = {
    "\nquery PopularUsers($q: String!, $pageSize: Int!) {\n  search(query: $q, type: USER, first: $pageSize) {\n    userCount\n    nodes {\n      ... on User {\n        login\n        name\n        location\n        followers {\n          totalCount\n        }\n        createdAt\n      }\n    }\n  }\n}": types.PopularUsersDocument,
    "\n  query GetUserInfo($login: String!) {\n    user(login: $login) {\n      login\n      followers {\n        totalCount\n      }\n      following {\n        totalCount\n      }\n      repositories(first: 100, privacy: PUBLIC) {\n        totalCount\n        nodes {\n          stargazerCount\n          forkCount\n          primaryLanguage { name }\n        }\n      }\n      repositoriesContributedTo(\n        first: 100\n        privacy: PUBLIC\n        includeUserRepositories: false\n        contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY]\n      ) {\n        totalCount\n        nodes {\n          nameWithOwner\n          url\n          stargazerCount\n          forkCount\n          primaryLanguage { name }\n          owner {\n            __typename\n            login\n            ... on Organization { name }\n          }\n        }\n      }\n      gists(privacy: PUBLIC) {\n        totalCount\n      }\n      createdAt\n      bio\n    }\n  }\n": types.GetUserInfoDocument,
    "\n  query SearchMergedExternalPRs($q: String!) {\n    search(query: $q, type: ISSUE, first: 50) {\n      nodes {\n        ... on PullRequest {\n          __typename\n          title\n          url\n          number\n          createdAt\n          mergedAt\n          repository {\n            nameWithOwner\n            url\n            stargazerCount\n            owner { avatarUrl }\n          }\n        }\n      }\n    }\n  }\n": types.SearchMergedExternalPRsDocument,
    "\n  query GetPullRequestsStats($username: String!) {\n    user(login: $username) {\n      login\n      name\n      contributionsCollection {\n        totalPullRequestContributions\n        totalPullRequestReviewContributions\n      }\n      pullRequests(first: 1) {\n        totalCount\n      }\n      mergedPullRequests: pullRequests(first: 1, states: MERGED) {\n        totalCount\n      }\n      closedPullRequests: pullRequests(first: 1, states: CLOSED) {\n        totalCount\n      }\n      openPullRequests: pullRequests(first: 1, states: OPEN) {\n        totalCount\n      }\n    }\n}": types.GetPullRequestsStatsDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\nquery PopularUsers($q: String!, $pageSize: Int!) {\n  search(query: $q, type: USER, first: $pageSize) {\n    userCount\n    nodes {\n      ... on User {\n        login\n        name\n        location\n        followers {\n          totalCount\n        }\n        createdAt\n      }\n    }\n  }\n}"): (typeof documents)["\nquery PopularUsers($q: String!, $pageSize: Int!) {\n  search(query: $q, type: USER, first: $pageSize) {\n    userCount\n    nodes {\n      ... on User {\n        login\n        name\n        location\n        followers {\n          totalCount\n        }\n        createdAt\n      }\n    }\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetUserInfo($login: String!) {\n    user(login: $login) {\n      login\n      followers {\n        totalCount\n      }\n      following {\n        totalCount\n      }\n      repositories(first: 100, privacy: PUBLIC) {\n        totalCount\n        nodes {\n          stargazerCount\n          forkCount\n          primaryLanguage { name }\n        }\n      }\n      repositoriesContributedTo(\n        first: 100\n        privacy: PUBLIC\n        includeUserRepositories: false\n        contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY]\n      ) {\n        totalCount\n        nodes {\n          nameWithOwner\n          url\n          stargazerCount\n          forkCount\n          primaryLanguage { name }\n          owner {\n            __typename\n            login\n            ... on Organization { name }\n          }\n        }\n      }\n      gists(privacy: PUBLIC) {\n        totalCount\n      }\n      createdAt\n      bio\n    }\n  }\n"): (typeof documents)["\n  query GetUserInfo($login: String!) {\n    user(login: $login) {\n      login\n      followers {\n        totalCount\n      }\n      following {\n        totalCount\n      }\n      repositories(first: 100, privacy: PUBLIC) {\n        totalCount\n        nodes {\n          stargazerCount\n          forkCount\n          primaryLanguage { name }\n        }\n      }\n      repositoriesContributedTo(\n        first: 100\n        privacy: PUBLIC\n        includeUserRepositories: false\n        contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY]\n      ) {\n        totalCount\n        nodes {\n          nameWithOwner\n          url\n          stargazerCount\n          forkCount\n          primaryLanguage { name }\n          owner {\n            __typename\n            login\n            ... on Organization { name }\n          }\n        }\n      }\n      gists(privacy: PUBLIC) {\n        totalCount\n      }\n      createdAt\n      bio\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SearchMergedExternalPRs($q: String!) {\n    search(query: $q, type: ISSUE, first: 50) {\n      nodes {\n        ... on PullRequest {\n          __typename\n          title\n          url\n          number\n          createdAt\n          mergedAt\n          repository {\n            nameWithOwner\n            url\n            stargazerCount\n            owner { avatarUrl }\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query SearchMergedExternalPRs($q: String!) {\n    search(query: $q, type: ISSUE, first: 50) {\n      nodes {\n        ... on PullRequest {\n          __typename\n          title\n          url\n          number\n          createdAt\n          mergedAt\n          repository {\n            nameWithOwner\n            url\n            stargazerCount\n            owner { avatarUrl }\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetPullRequestsStats($username: String!) {\n    user(login: $username) {\n      login\n      name\n      contributionsCollection {\n        totalPullRequestContributions\n        totalPullRequestReviewContributions\n      }\n      pullRequests(first: 1) {\n        totalCount\n      }\n      mergedPullRequests: pullRequests(first: 1, states: MERGED) {\n        totalCount\n      }\n      closedPullRequests: pullRequests(first: 1, states: CLOSED) {\n        totalCount\n      }\n      openPullRequests: pullRequests(first: 1, states: OPEN) {\n        totalCount\n      }\n    }\n}"): (typeof documents)["\n  query GetPullRequestsStats($username: String!) {\n    user(login: $username) {\n      login\n      name\n      contributionsCollection {\n        totalPullRequestContributions\n        totalPullRequestReviewContributions\n      }\n      pullRequests(first: 1) {\n        totalCount\n      }\n      mergedPullRequests: pullRequests(first: 1, states: MERGED) {\n        totalCount\n      }\n      closedPullRequests: pullRequests(first: 1, states: CLOSED) {\n        totalCount\n      }\n      openPullRequests: pullRequests(first: 1, states: OPEN) {\n        totalCount\n      }\n    }\n}"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;