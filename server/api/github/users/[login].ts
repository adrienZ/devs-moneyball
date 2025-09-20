import { getRouterParam, createError, defineEventHandler } from "h3";
import { getGithubClient } from "~~/server/githubClient";
import { graphql } from "~~/codegen";
import { useDrizzle } from "~~/database/client";
import { developper } from "~~/database/schemas";
import { nanoid } from "nanoid";

const userQuery = graphql(/* GraphQL */ `
  query GetUserInfo($login: String!) {
    user(login: $login) {
      __typename
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

export default defineEventHandler(async (event) => {
  const login = getRouterParam(event, "login");
  if (!login) {
    throw createError("missing login");
  }

  const { user: githubUser } = await getGithubClient().call(userQuery, { login });

  if (!githubUser) {
    throw createError("user not found");
  }

  const db = useDrizzle();
  const developer = await db
    .insert(developper)
    .values({
      id: nanoid(),
      githubId: githubUser.id,
      username: githubUser.login,
      bio: githubUser.bio,
      avatarUrl: "",
    })
    .onConflictDoUpdate({
      target: developper.githubId,
      set: {
        username: githubUser.login,
        bio: githubUser.bio,
      },
    })
    .returning()
    .execute()
    .then(rows => rows.at(0));

  if (!developer) {
    throw createError("Failed to create or update developer");
  }

  const data = {
    login: githubUser.login,
    followers: githubUser.followers.totalCount,
    following: githubUser.following.totalCount,
    public_repos: githubUser.repositories.totalCount,
    public_gists: githubUser.gists.totalCount,
    created_at: githubUser.createdAt,
    bio: githubUser.bio,
  };

  const repoNodes = (githubUser.repositories.nodes ?? []).filter(
    (n): n is NonNullable<typeof n> => n !== null,
  );

  if (!data) {
    throw createError("Unexpected error");
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

  const orgContributedRepos = (githubUser.repositoriesContributedTo.nodes ?? [])
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

  const ratings = await db.query.devActivity.findFirst({
    where: (activity, { eq }) => eq(activity.devId, developer.id),
  });

  return {
    ratings,
    id: developer.id,
    login: data.login,
    followers: data.followers,
    following: data.following,
    public_repos: data.public_repos,
    public_gists: data.public_gists,
    created_at: String(data.created_at),
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
});
