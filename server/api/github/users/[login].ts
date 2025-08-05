import { getRouterParam } from 'h3';
import { useRuntimeConfig } from '#imports';
import { defineCachedEventHandler} from 'nitropack/runtime';

export default defineCachedEventHandler(async (event) => {
  const login = getRouterParam(event, 'login');
  if (!login) {
    return { error: 'Missing login' };
  }

  const config = useRuntimeConfig();
  const response = await fetch(`https://api.github.com/users/${login}`, {
    headers: {
      Authorization: `Bearer ${config.public.githubToken}`,
      'User-Agent': 'nuxt-app',
    },
  });

  if (!response.ok) {
    return { error: `GitHub API error: ${response.status}` };
  }

  const data = await response.json();

  const reposRes = await fetch(`https://api.github.com/users/${login}/repos?per_page=100`, {
    headers: {
      Authorization: `Bearer ${config.public.githubToken}`,
      'User-Agent': 'nuxt-app',
    },
  });

  if (!reposRes.ok) {
    return { error: `GitHub API error: ${reposRes.status}` };
  }

  const repos = await reposRes.json();
  // @ts-expect-error TODO: Fix types
  const totalStars = repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);
  // @ts-expect-error TODO: Fix types
  const totalForks = repos.reduce((sum, r) => sum + (r.forks_count || 0), 0);
  const avgStarsPerRepo = data.public_repos > 0 ? (totalStars / data.public_repos) : 0;
  // @ts-expect-error TODO: Fix types
  const langCount = repos.reduce((acc: Record<string, number>, r) => {
    if (r.language) acc[r.language] = (acc[r.language] || 0) + 1;
    return acc;
  }, {});
  // @ts-expect-error TODO: Fix types
  const topLanguages = Object.entries(langCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([lang]) => lang);

  // Criteria calculations (simple heuristics)
  const impactScore = Math.min(100, (totalStars + totalForks) / 100); // scale
  const activityScore = Math.min(100, data.public_repos * 5);
  const collaborationScore = Math.floor(Math.random() * 40) + 60; // placeholder until PR data integrated
  const breadthScore = Math.min(100, topLanguages.length * 20);
  const qualityScore = Math.floor(Math.random() * 30) + 50; // placeholder

  // Dev score = weighted
  const devScore = Math.round(
    impactScore * 0.4 +
    activityScore * 0.2 +
    collaborationScore * 0.15 +
    breadthScore * 0.15 +
    qualityScore * 0.1
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
    login: data.login,
    followers: data.followers,
    following: data.following,
    public_repos: data.public_repos,
    public_gists: data.public_gists,
    created_at: data.created_at,
    totalStars,
    totalForks,
    avgStarsPerRepo,
    topLanguages,
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
