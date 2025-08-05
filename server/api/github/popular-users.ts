// import { defineEventHandler } from 'h3';
import { defineCachedEventHandler } from 'nitropack/runtime';
import { useRuntimeConfig } from '#imports';
// import { readFileSync } from 'node:fs';
// import { join } from 'node:path';

// const popularUsersQuery = readFileSync(join(process.cwd(), 'app/graphql/popularUsers.gql'), 'utf8');
const popularUsersQuery = `
query PopularUsers {
  search(query: "location:Paris type:user sort:followers-desc", type: USER, first: 50) {
    nodes {
      ... on User {
        login
        name
        followers {
          totalCount
        }
      }
    }
  }
}`;

interface User {
  login: string;
  name: string | null;
  followers: { totalCount: number };
}

interface PopularUsersQuery {
  search: { nodes: (User | null)[] };
}


export default defineCachedEventHandler(async () => {

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
  return data;
}, {
  maxAge: 60 * 60, // Cache for 1 hour
})