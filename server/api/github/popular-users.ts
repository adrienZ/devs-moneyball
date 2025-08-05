import { defineEventHandler } from 'h3';
import { useRuntimeConfig, useStorage } from '#imports';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const popularUsersQuery = readFileSync(join(process.cwd(), 'app/graphql/popularUsers.gql'), 'utf8');

interface User {
  login: string;
  name: string | null;
  followers: { totalCount: number };
}

interface PopularUsersQuery {
  search: { nodes: (User | null)[] };
}

const storageKey = 'github:popularUsers';
const maxAge = 60 * 60 * 1000; // 1 hour

export default defineEventHandler(async () => {
  const storage = useStorage();
  const cached = await storage.getItem<{ data: PopularUsersQuery; cachedAt: number }>(storageKey);

  if (!cached || Date.now() - cached.cachedAt > maxAge) {
    const config = useRuntimeConfig();
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.public.githubToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: popularUsersQuery }),
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const { data } = (await response.json()) as { data: PopularUsersQuery };
    await storage.setItem(storageKey, { data, cachedAt: Date.now() });
    return data;
  }

  return cached.data;
});
