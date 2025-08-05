import { defineEventHandler } from 'h3';
import { useRuntimeConfig } from '#imports';
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

let cached: PopularUsersQuery | null = null;
let cachedAt = 0;
const maxAge = 60 * 60 * 1000; // 1 hour

export default defineEventHandler(async () => {
  if (!cached || Date.now() - cachedAt > maxAge) {
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
    cached = data;
    cachedAt = Date.now();
  }

  return cached;
});
