import { getRouterParam } from "h3";
import { defineCachedEventHandler } from "nitropack/runtime";
import { getGithubClient } from "~~/server/githubClient";
import { graphql } from "~~/codegen";
import type { ResultOf } from "@graphql-typed-document-node/core";

const query = graphql(/* GraphQL */ `
  query GetUserInfo($login: String!) {
    user(login: $login) {
      login
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

export default defineCachedEventHandler(async (event) => {
  const login = getRouterParam(event, "login");
  if (!login) {
    return { error: "Missing login" };
  }

  let data:
    | {
      login: string;
      followers: number;
      following: number;
      public_repos: number;
      public_gists: number;
      created_at: string;
      bio: string | null | undefined;
    }
    | undefined;
  let repoNodes: Array<{
    stargazerCount: number;
    forkCount: number;
    primaryLanguage?: { name: string } | null | undefined;
  }> = [];
  let userData: ResultOf<typeof query>["user"];
  try {
    const { user } = await getGithubClient().call(query, { login });

    if (!user) {
      return { error: "User not found" };
    }

    userData = user;

    data = {
      login: user.login,
      followers: user.followers.totalCount,
      following: user.following.totalCount,
      public_repos: user.repositories.totalCount,
      public_gists: user.gists.totalCount,
      created_at: user.createdAt,
      bio: user.bio,
    };
    repoNodes = (user.repositories.nodes ?? []).filter(
      (n): n is NonNullable<typeof n> => n !== null,
    );
  }
  catch (error) {
    console.error("GitHub GraphQL error:", error);
    return { error: "GitHub API error" };
  }

  if (!data) {
    return { error: "Unexpected error" };
  }

  const totalStars = repoNodes.reduce((sum, r) => sum + r.stargazerCount, 0);
  const totalForks = repoNodes.reduce((sum, r) => sum + r.forkCount, 0);
  const avgStarsPerRepo = data.public_repos > 0 ? (totalStars / data.public_repos) : 0;
  const langCount: Record<string, number> = repoNodes.reduce((acc: Record<string, number>, r) => {
    const lang = r.primaryLanguage?.name;
    if (lang) acc[lang] = (acc[lang] || 0) + 1;
    return acc;
  }, {});
  const topLanguages = Object.entries(langCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([lang]) => lang);

  const orgContributedRepos = (userData.repositoriesContributedTo.nodes ?? [])
    .filter((n): n is NonNullable<typeof n> => !!n && n.owner.__typename === "Organization")
    .map(repo => ({
      nameWithOwner: repo.nameWithOwner,
      url: repo.url,
      stargazerCount: repo.stargazerCount,
      forkCount: repo.forkCount,
      primaryLanguage: repo.primaryLanguage?.name ?? null,
      organization: {
        login: repo.owner.login,
        name: repo.owner.__typename === "Organization" ? repo.owner.name : null,
      },
    }));

  // Criteria calculations (simple heuristics)
  const impactScore = Math.min(100, (totalStars + totalForks) / 100); // scale
  const activityScore = Math.min(100, data.public_repos * 5);
  const collaborationScore = Math.floor(Math.random() * 40) + 60; // placeholder until PR data integrated
  const breadthScore = Math.min(100, topLanguages.length * 20);
  const qualityScore = Math.floor(Math.random() * 30) + 50; // placeholder

  // Dev score = weighted
  const devScore = Math.round(
    impactScore * 0.4
    + activityScore * 0.2
    + collaborationScore * 0.15
    + breadthScore * 0.15
    + qualityScore * 0.1,
  );

  function calculateLetter(score: number) {
    if (score >= 90) return "A+";
    if (score >= 85) return "A";
    if (score >= 80) return "A-";
    if (score >= 75) return "B+";
    if (score >= 70) return "B";
    if (score >= 65) return "C+";
    if (score >= 60) return "C";
    return "D";
  }

  function shortSummary(letter: string) {
    if (letter.startsWith("A")) return "Exceptional open-source contributor with strong impact.";
    if (letter.startsWith("B")) return "Strong contributor with solid long-term potential.";
    if (letter.startsWith("C")) return "Average activity; potential to improve.";
    return "Limited activity and impact so far.";
  }

  const letter = calculateLetter(devScore);
  const summary = shortSummary(letter);

  // Pros/cons auto-generation
  const pros: string[] = [];
  const cons: string[] = [];

  if (impactScore > 70) pros.push("Contributed to high-profile repositories");
  else cons.push("Low overall repository impact");

  if (activityScore > 60) pros.push("High sustained contribution rate");
  else cons.push("Limited recent public repository activity");

  if (breadthScore > 50) pros.push("Broad language expertise");
  else cons.push("Narrow technology focus");

  if (collaborationScore > 70) pros.push("Strong collaboration indicators");
  else cons.push("Collaboration signals could be improved");

  if (qualityScore > 65) pros.push("Solid code quality indicators");
  else cons.push("Code quality signals need improvement");

  return {
    debug: userData,
    login: data.login,
    followers: data.followers,
    following: data.following,
    public_repos: data.public_repos,
    public_gists: data.public_gists,
    created_at: data.created_at,
    bio: data.bio,
    totalStars,
    totalForks,
    avgStarsPerRepo,
    topLanguages,
    orgContributedRepos,
    devScore,
    letter,
    summary,
    criteria: {
      impact: impactScore,
      activity: activityScore,
      collaboration: collaborationScore,
      breadth: breadthScore,
      quality: qualityScore,
    },
    pros,
    cons,
  };
}, {
  maxAge: 60 * 60, // 1 hour
});
