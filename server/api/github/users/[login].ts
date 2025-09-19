import { getRouterParam } from "h3";
import { defineCachedEventHandler } from "nitropack/runtime";
import { getGithubClient } from "~~/server/githubClient";
import { graphql } from "~~/codegen";
import { db } from "~~/database/client";
import { developper } from "~~/database/schemas";
import { nanoid } from "nanoid";

const userQuery = graphql(/* GraphQL */ `
  query GetUserInfo($login: String!) {
    user(login: $login) {
      id
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

const pullRequestQuery = graphql(/* GraphQL */ `
  query MergedPROwnVsExternalTwoYearsTop100(
    $ownQuery: String!
    $extQuery: String!
    $first: Int = 100
    $ownAfter: String
    $extAfter: String
  ) {
    own: search(query: $ownQuery, type: ISSUE, first: $first, after: $ownAfter) {
      nodes {
        ... on PullRequest {
          title
          url
          mergedAt
          repository {
            nameWithOwner
            stargazerCount
          }
        }
      }
    }

    external: search(query: $extQuery, type: ISSUE, first: $first, after: $extAfter) {
      issueCount
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ... on PullRequest {
          title
          url
          mergedAt
          repository {
            nameWithOwner
            stargazerCount
          }
        }
      }
    }
  }
`);

export default defineCachedEventHandler(async (event) => {
  const login = getRouterParam(event, "login");
  if (!login) {
    return { error: "Missing login" };
  }

  const { user } = await getGithubClient().call(userQuery, { login });

  if (!user) {
    return { error: "User not found" };
  }

  db
    .insert(developper)
    .values({
      id: nanoid(),
      githubId: user.id,
      username: user.login,
      bio: user.bio,
      avatarUrl: "",
    })
    .onConflictDoUpdate({
      target: developper.githubId,
      set: {
        username: user.login,
        bio: user.bio,
      },
    })
    .execute();

  console.log(await db.query.developper.findFirst({
    where(fields, operators) {
      return operators.eq(fields.githubId, user.id);
    },
  }));


  const data = {
    login: user.login,
    followers: user.followers.totalCount,
    following: user.following.totalCount,
    public_repos: user.repositories.totalCount,
    public_gists: user.gists.totalCount,
    created_at: user.createdAt,
    bio: user.bio,
  };

  const repoNodes = (user.repositories.nodes ?? []).filter(
    (n): n is NonNullable<typeof n> => n !== null,
  );

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

  const orgContributedRepos = (user.repositoriesContributedTo.nodes ?? [])
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

  const now = new Date();
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(now.getFullYear() - 2);

  const from = twoYearsAgo.toISOString().split("T")[0]; // e.g. "2023-09-19"
  const to = now.toISOString().split("T")[0]; // e.g. "2025-09-19"

  // Tri par "updated" + seulement PR mergées sur 2 ans
  const ownQuery = `is:pr is:merged author:${login} user:${login} merged:${from}..${to} sort:updated-desc`;
  const extQuery = `is:pr is:merged author:${login} -user:${login} merged:${from}..${to} sort:updated-desc`;

  const res = await getGithubClient().call(pullRequestQuery, {
    ownQuery,
    extQuery,
    first: 100,
    ownAfter: null,
    extAfter: null,
  });

  return {
    debug: res,
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
