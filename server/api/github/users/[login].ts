import { defineEventHandler, getRouterParam } from 'h3';
import { useRuntimeConfig } from '#imports';

export default defineEventHandler(async (event) => {
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
  return {
    login: data.login,
    followers: data.followers,
    following: data.following,
    public_repos: data.public_repos,
    public_gists: data.public_gists,
    created_at: data.created_at,
  };
});

