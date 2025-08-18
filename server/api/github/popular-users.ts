// import { defineEventHandler } from 'h3';
import { defineCachedEventHandler } from "nitropack/runtime";
import { getQuery } from "h3";
import { useRuntimeConfig } from "#imports";
import { z } from "zod";

// const popularUsersQuery = readFileSync(join(process.cwd(), 'app/graphql/popularUsers.gql'), 'utf8');
const popularUsersQuery = `
query SearchUsers($q: String!, $first: Int, $after: String, $last: Int, $before: String) {
  rateLimit {
    cost
    remaining
    resetAt
  }
  search(query: $q, type: USER, first: $first, after: $after, last: $last, before: $before) {
    userCount
    pageInfo {
      startCursor
      endCursor
      hasNextPage
      hasPreviousPage
    }
    edges {
      cursor
      node {
        ... on User {
          login
          name
          bio
          url
          avatarUrl
          followers { totalCount }
          repositories(privacy: PUBLIC) { totalCount }
          createdAt
        }
      }
    }
  }
}`;

interface User {
  login: string;
  name: string | null;
  followers: { totalCount: number };
  createdAt: string;
  location?: string | null;
}

interface PageInfo {
  startCursor: string | null;
  endCursor: string | null;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface Edge {
  cursor: string;
  node: User | null;
}

interface PopularUsersQuery {
  rateLimit?: { cost: number; remaining: number; resetAt: string };
  search: { userCount: number; pageInfo: PageInfo; edges: Edge[] };
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
  languages: z.string().optional(), // comma-separated list
  page: z.coerce.number().int().nonnegative().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
  // Cursor-style pagination
  first: z.coerce.number().int().positive().optional(),
  after: z.string().optional(),
  last: z.coerce.number().int().positive().optional(),
  before: z.string().optional(),
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
  // Add language qualifiers to the search query if provided
  if (params.languages) {
    const filterLangs = params.languages.split(",").map(l => l.trim()).filter(Boolean);
    for (const lang of filterLangs) {
      parts.push(`language:${lang}`);
    }
  }

  if (params.sortField === "followers") {
    parts.push(`sort:followers-${params.sortOrder}`);
  }
  else {
    parts.push(params.sortOrder === "asc" ? "sort:joined-desc" : "sort:joined-asc");
  }

  const query = parts.join(" ");

  const config = useRuntimeConfig();
  // Prefer explicit cursor args; fallback to pageSize -> first
  const pageSize = params.pageSize;
  const firstArg = params.first ?? pageSize;

  // If the client requested a numeric page (page>1) and didn't provide a cursor,
  // perform sequential requests to advance to that page using endCursor. This is
  // simple but costs one GraphQL call per page advance; be mindful of rate limits.
  let data: PopularUsersQuery | undefined;
  let finalRateLimit: PopularUsersQuery["rateLimit"] | undefined;

  if ((params.page ?? 1) > 1 && !params.after && !params.before && params.last === undefined) {
    let afterCursor: string | undefined = undefined;
    // Iterate pages until we reach the requested numeric page or run out of results
    for (let p = 1; p <= params.page; p++) {
      const varsPage: Record<string, unknown> = { q: query, first: firstArg };
      if (afterCursor) varsPage.after = afterCursor;

      const resp = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.public.githubToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: popularUsersQuery, variables: varsPage }),
      });

      if (!resp.ok) {
        throw new Error(`GitHub API error: ${resp.status}`);
      }

      const json = await resp.json() as { data: PopularUsersQuery };
      data = json.data;
      finalRateLimit = json.data.rateLimit;

      const pageInfo = data.search.pageInfo;
      // If we've reached the requested page, stop. Otherwise advance using endCursor.
      if (p === params.page) {
        break;
      }
      if (!pageInfo?.endCursor) {
        // No more pages available, stop early.
        break;
      }
      afterCursor = pageInfo.endCursor;
    }
  }
  else {
    // Normal single-request path (cursor-based or first/last provided)
    const vars: Record<string, unknown> = { q: query };
    if (params.first !== undefined) vars.first = params.first;
    else vars.first = firstArg;
    if (params.after) vars.after = params.after;
    if (params.last !== undefined) vars.last = params.last;
    if (params.before) vars.before = params.before;

    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.public.githubToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: popularUsersQuery, variables: vars }),
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const json = await response.json() as { data: PopularUsersQuery };
    data = json.data;
    finalRateLimit = json.data.rateLimit;
  }
  if (!data) {
    throw new Error("No data returned from GitHub");
  }

  const edges = data.search.edges ?? [];
  const users = edges.map(e => e.node).filter((u): u is User => !!u);

  const page = params.page; // kept for backward compatibility (UI expects a page number)
  const total = data.search.userCount;

  return {
    users,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    pageInfo: data.search.pageInfo,
    rateLimit: finalRateLimit ?? data.rateLimit,
  };
}, {
  maxAge: 60 * 60, // Cache for 1 hour,
  getKey() {
    return Date.now().toString(); // Use current timestamp as cache key
  },
});
