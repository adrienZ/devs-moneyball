#!/usr/bin/env -S node --enable-source-maps
// @ts-nocheck

/**
 * FM24-style scoring for GitHub developers (updated for stable GitHub GraphQL API)
 * -------------------------------------------------------------
 * Usage:
 *   GITHUB_TOKEN=ghp_XXXX node fm24-github.ts --user <github_login> [--days 90] [--json]
 */

const args = new Map<string, string | boolean>();
process.argv.slice(2).forEach((a, i, arr) => {
  if (a.startsWith("--")) {
    const [k, v] = a.split("=");
    if (v !== undefined) args.set(k.slice(2), v);
    else if (i + 1 < arr.length && !arr[i + 1].startsWith("--")) args.set(a.slice(2), arr[i + 1]);
    else args.set(a.slice(2), true);
  }
});

const LOGIN = String(args.get("user") || args.get("login") || "torvalds");
const DAYS = Number(args.get("days") || 90);
const AS_JSON = args.has("json");
const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) {
  console.error("Missing GITHUB_TOKEN env var. Create a classic/fine-grained PAT with 'read:user' & 'repo:public_repo'.");
  process.exit(1);
}

const endpoint = "https://api.github.com/graphql";
async function gql<T>(query: string, variables: Record<string, any>): Promise<T> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
      "User-Agent": "fm24-github-script",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { data?: T; errors?: any };
  if (json.errors) throw new Error("GraphQL errors: " + JSON.stringify(json.errors, null, 2));
  return json.data as T;
}

function daysAgo(d: number) {
  const dt = new Date();
  dt.setUTCDate(dt.getUTCDate() - d);
  return dt;
}

function withinWindow(dateStr?: string | null, days = DAYS) {
  if (!dateStr) return false;
  return new Date(dateStr) >= daysAgo(days);
}

function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }
function mapTo20(x01: number) { return Math.round(clamp01(x01) * 20); }
function mean(xs: number[]) { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0; }
function std(xs: number[]) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map(x => (x - m) ** 2)));
}

// ------------------------- Data Fetch -------------------------

type PRNode = {
  mergedAt: string | null;
  createdAt: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  title: string;
  number: number;
  repository: { nameWithOwner: string };
  reviews: { nodes: { createdAt: string }[] };
  comments: { nodes: { createdAt: string }[] };
  files: { nodes: { path: string }[] };
};

type ReviewContribNode = {
  occurredAt: string;
  pullRequest: { createdAt: string; author: { login: string }; repository: { nameWithOwner: string } };
};
//   reviews: { nodes: { createdAt: string }[] };
//   comments: { nodes: { createdAt: string }[] };
//   files: { nodes: { path: string }[] };
// };

async function fetchUserWindow(login: string) {
  const sinceISO = daysAgo(DAYS).toISOString();
  const prQuery = /* GraphQL */ `
    query($login:String!, $cursor:String) {
      user(login:$login){
        pullRequests(first:50, after:$cursor, orderBy:{field:CREATED_AT, direction:DESC}, states:[OPEN, MERGED, CLOSED]){
          pageInfo{ hasNextPage endCursor }
          nodes{
            createdAt
            mergedAt
            additions
            deletions
            changedFiles
            number
            title
            repository{ nameWithOwner }
            reviews(first:20){ nodes{ createdAt } }
            comments(first:20){ nodes{ createdAt } }
            files(first:100){ nodes{ path } }
          }
        }
      }
    }
  `;

  const reviewContribQuery = /* GraphQL */ `
    query($login:String!, $cursor:String){
      user(login:$login){
        contributionsCollection{
          pullRequestReviewContributions(first:50, after:$cursor){
            pageInfo{ hasNextPage endCursor }
            nodes{
              occurredAt
              pullRequest{ createdAt author{ login } repository{ nameWithOwner } }
            }
          }
        }
      }
    }
  `;

  async function pageAll<T>(q: string, path: string[]): Promise<T[]> {
    let out: T[] = [];
    let cursor: string | undefined;
    for (let i = 0; i < 10; i++) {
      const data: any = await gql<any>(q, { login, cursor });
      let node: any = data;
      for (const p of path) node = node?.[p];
      out = out.concat(node.nodes as T[]);
      if (!node.pageInfo?.hasNextPage) break;
      cursor = node.pageInfo.endCursor;
      const last: any = node.nodes[node.nodes.length - 1];
      const lastDate = (last?.createdAt || last?.occurredAt);
      if (lastDate && new Date(lastDate) < daysAgo(DAYS + 30)) break;
    }
    return out;
  }

  const [prsAll, reviewContribsAll] = await Promise.all([
    pageAll<PRNode>(prQuery, ["user", "pullRequests"]),
    pageAll<ReviewContribNode>(reviewContribQuery, ["user", "contributionsCollection", "pullRequestReviewContributions"]),
  ]);

  const prs = prsAll.filter(pr => withinWindow(pr.createdAt, DAYS));
  const reviewsAuthored = reviewContribsAll.filter(rc => withinWindow(rc.occurredAt, DAYS));
  return { prs, reviewsAuthored, sinceISO };
}

// ------------------------- Scoring -------------------------

function computeAttributes(data: { prs: PRNode[]; reviewsAuthored: ReviewContribNode[]; sinceISO: string }) {
  const { prs, reviewsAuthored } = data;
  const mergedPRs = prs.filter(p => p.mergedAt);

  const prSizes = mergedPRs.map(p => p.additions + p.deletions);
  const testPRs = mergedPRs.filter(p => p.files.nodes.some(f => /test|spec|__tests__/i.test(f.path)));

  // Responsiveness: time to first comment or review
  function firstResponseHours(p: PRNode): number | null {
    const allTimes = [...p.reviews.nodes, ...p.comments.nodes]
      .map(n => new Date(n.createdAt).getTime())
      .sort((a, b) => a - b);
    if (!allTimes.length) return null;
    const t0 = new Date(p.createdAt).getTime();
    const dt = (allTimes[0] - t0) / 36e5;
    return dt < 0 ? null : dt;
  }
  const responseHours = mergedPRs.map(firstResponseHours).filter((x): x is number => x !== null);

  const meanResponse = responseHours.length ? mean(responseHours) : 48;
  const respScore = 1 - clamp01(Math.log10(1 + meanResponse) / Math.log10(49));

  const testRatio = mergedPRs.length ? testPRs.length / mergedPRs.length : 0;
  const median = (xs: number[]) => xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;
  const medianSize = prSizes.length ? median(prSizes) : 0;
  const throughput = mergedPRs.length / Math.max(1, medianSize ? Math.log10(medianSize + 10) : 1);

  const attributes: Record<string, number> = {};

  // 1) Code Quality (simple proxy by PR size — smaller tends to be better)
  attributes["Code Quality"] = mapTo20(clamp01(1 - mean(prSizes) / 5000));

  // 2) Test Discipline (% merged PRs that touch tests)
  attributes["Test Discipline"] = mapTo20(testRatio);

  // 3) Responsiveness (faster first interaction on PR is better)
  attributes["Responsiveness"] = mapTo20(respScore);

  // 4) Throughput (log-scaled merged PR count)
  attributes["Throughput"] = mapTo20(clamp01(Math.log10(1 + mergedPRs.length) / Math.log10(21)));

  // 5) Review Quality (reviews authored on others' PRs; log-scaled)
  const reviewCount = reviewsAuthored.length;
  const review01 = Math.log10(1 + reviewCount) / Math.log10(11);
  attributes["Review Quality"] = mapTo20(review01);

  // 6) Documentation Quality (ratio of merged PRs touching docs/ or *.md)
  const docPRs = mergedPRs.filter(p => p.files.nodes.some(f => /\.md$|^docs\//i.test(f.path)));
  const docRatio = mergedPRs.length ? docPRs.length / mergedPRs.length : 0;
  attributes["Documentation Quality"] = mapTo20(docRatio);

  const overall = mapTo20(mean(Object.values(attributes).map(v => v / 20))); (mean(Object.values(attributes).map(v => v / 20)));
  return { attributes, overall };
}

// ------------------------- Main -------------------------
(async () => {
  try {
    const data = await fetchUserWindow(LOGIN);
    const { attributes, overall } = computeAttributes(data);
    const output = {
      login: LOGIN,
      window_days: DAYS,
      since: data.sinceISO,
      overall,
      attributes,
      counts: { prs: data.prs.length, merged: data.prs.filter(p => p.mergedAt).length, reviews_authored: data.reviewsAuthored.length },
    };
    if (AS_JSON) console.log(JSON.stringify(output, null, 2));
    else {
      console.log(`\nFM24 GitHub Score for @${LOGIN} (last ${DAYS} days)`);
      console.log(`Overall: ${overall}/20`);
      for (const [k, v] of Object.entries(output.attributes)) console.log(`${k.padEnd(20)} ${String(v).padStart(2)}/20`);
      console.log("\nCounts:", output.counts);
    }
  } catch (err: any) {
    console.error("\nError:", err?.message || err);
    process.exit(1);
  }
})();
