import type { ResultOf } from "@graphql-typed-document-node/core";
import { defineEventHandler, getQuery } from "h3";
import { z } from "zod";
import { getGithubClient } from "~~/server/githubClient";
import { popularUsersQuery } from "~~/server/graphql/popularUsers.gql";

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
  after: z.string().optional(),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
});

export default defineEventHandler(async (event) => {
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

  const pageSize = params.pageSize;

  const githubClient = getGithubClient();
  const data = await githubClient.call(popularUsersQuery, {
    q: query,
    pageSize,
    after: params.after,
  });

  type Nodes = NonNullable<ResultOf<typeof popularUsersQuery>["search"]["nodes"]>;
  type User = Extract<Nodes[number], { __typename?: "User" }>;
  const users = data.search.nodes?.filter((u): u is User => !!u);

  const total = data.search.userCount;
  return {
    users,
    total,
    pageSize,
    pageInfo: data.search.pageInfo,
  };
});
