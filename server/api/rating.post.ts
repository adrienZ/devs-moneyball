import { readValidatedBody, createError, readBody, defineEventHandler } from "h3";
import { getGithubClient } from "~~/server/githubClient";
import { graphql } from "~~/codegen";
import { useDrizzle } from "~~/database/client";
import { devActivity } from "~~/database/schemas";
import { periodStartISO } from "~~/server/services/dateServices";
import z from "zod";

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
          __typename
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
          __typename
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

const paramsValidationSchemas = z.object({
  userId: z.string().min(1),
});

function aggregateCapped(
  prs: { mergedAt: string }[],
  opts: { capPerPeriod: number },
) {
  const raw = new Map<string, number>();
  const capped = new Map<string, number>();

  for (const pr of prs) {
    const key = periodStartISO(pr.mergedAt, "weekly");

    raw.set(key, (raw.get(key) ?? 0) + 1);

    const next = (capped.get(key) ?? 0) + 1;
    capped.set(key, Math.min(next, opts.capPerPeriod));
  }

  return { raw, capped };
}

export default defineEventHandler(async (event) => {
  console.log("rjrj", await readBody(event));

  const { userId } = await readValidatedBody(event, paramsValidationSchemas.parse);

  const db = useDrizzle();
  const developer = await db.query.developper.findFirst({
    where({ id }, { eq }) {
      return eq(id, userId);
    },
  });

  if (!developer) {
    throw createError({ statusCode: 404, statusMessage: "Developer not found" });
  }

  const login = developer.username;

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

  // nodes = résultats fusionnés de ta query GraphQL (own + external)
  const nodes = [
    ...(res.own.nodes ?? []),
    ...(res.external.nodes ?? []),
  ].filter(n => n?.__typename === "PullRequest",
  );

  // choisis ta granularité et ton cap
  const capPerPeriod = 30;

  const { raw, capped } = aggregateCapped(nodes, { capPerPeriod });
  // Construit les lignes pour insert
  const rows = Array.from(capped.entries()).map(([periodStart, cappedVal]) => ({
    devId: developer.id,
    period: "weekly",
    periodStart, // 'YYYY-MM-DD'
    prMergedRaw: raw.get(periodStart) ?? cappedVal,
    prMergedCapped: cappedVal,
    capApplied: capPerPeriod,
  }));

  if (rows.length > 0) {
    return await db
      .insert(devActivity)
      .values(rows)
      .returning();
  }

  return [];
});
