export function getMergedPullRequestsSinceDate(lookbackMs: number): string {
  const now = new Date();
  const since = new Date(now.getTime() - lookbackMs);
  return since.toISOString().split("T")[0] ?? since.toISOString();
}

export function getMergedPullRequestsSinceDateTime(lookbackMs: number): string {
  const now = new Date();
  const since = new Date(now.getTime() - lookbackMs);
  return since.toISOString();
}

const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

export function getLookbackWeeks(lookbackMs: number): number {
  return Math.max(1, Math.ceil(lookbackMs / WEEK_IN_MS));
}
