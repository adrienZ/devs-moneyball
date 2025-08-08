// import { defineEventHandler } from 'h3';
import { defineCachedEventHandler } from "nitropack/runtime";
import { getQuery } from "h3";
import { useRuntimeConfig } from "#imports";
import { z } from "zod";

// const popularUsersQuery = readFileSync(join(process.cwd(), 'app/graphql/popularUsers.gql'), 'utf8');
const popularUsersQuery = `
query PopularUsers($query: String!) {
  search(query: $query, type: USER, first: 50) {
    nodes {
      ... on User {
        login
        name
        followers {
          totalCount
        }
        createdAt
      }
    }
  }
}`;

interface User {
  login: string;
  name: string | null;
  followers: { totalCount: number };
  createdAt: string;
}

interface PopularUsersQuery {
  search: { nodes: (User | null)[] };
}

const MS_IN_YEAR = 1000 * 60 * 60 * 24 * 365;

const querySchema = z.object({
  minFollowers: z.coerce.number().int().nonnegative().optional(),
  maxFollowers: z.coerce.number().int().nonnegative().optional(),
  minAge: z.coerce.number().nonnegative().optional(),
  maxAge: z.coerce.number().nonnegative().optional(),
  location: z.string().optional(),
  sortField: z.enum(["followers", "age"]).default("followers"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export default defineCachedEventHandler(async (event) => {
  const params = querySchema.parse(getQuery(event));
  const now = Date.now();

  const parts = ["type:user"];
  if (params.location) {
    parts.push(`location:${params.location}`);
  }

  if (params.minFollowers !== undefined) parts.push(`followers:>${params.minFollowers}`);
  if (params.maxFollowers !== undefined) {
    parts.push(`followers:<${params.maxFollowers}`);
  }
  if (params.minAge !== undefined) {
    const date = new Date(now - params.minAge * MS_IN_YEAR).toISOString().split("T")[0];
    parts.push(`created:<${date}`);
  }
  if (params.maxAge !== undefined) {
    const date = new Date(now - params.maxAge * MS_IN_YEAR).toISOString().split("T")[0];
    parts.push(`created:>${date}`);
  }
  if (params.sortField === "followers") {
    parts.push(`sort:followers-${params.sortOrder}`);
  }
  else {
    parts.push(params.sortOrder === "asc" ? "sort:joined-desc" : "sort:joined-asc");
  }

  const query = parts.join(" ");

  const config = useRuntimeConfig();
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.public.githubToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: popularUsersQuery, variables: { query } }),
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const { data } = (await response.json()) as { data: PopularUsersQuery };
  const users = data.search.nodes.filter((u): u is User => !!u);
  return users;
}, {
  maxAge: 60 * 60, // Cache for 1 hour
});
