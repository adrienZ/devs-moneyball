const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

export function getMergedPullRequestsSinceDate(lookbackWeeks: number): string {
  const now = new Date();
  const since = new Date(now.getTime() - lookbackWeeks * WEEK_IN_MS);
  return since.toISOString().split("T")[0] ?? since.toISOString();
}

export function getMergedPullRequestsSinceDateTime(lookbackWeeks: number): string {
  const now = new Date();
  const since = new Date(now.getTime() - lookbackWeeks * WEEK_IN_MS);
  return since.toISOString();
}
