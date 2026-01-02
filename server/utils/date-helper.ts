export function getMergedPullRequestsSinceDate(lookbackMs: number): string {
  const now = new Date();
  const since = new Date(now.getTime() - lookbackMs);
  return since.toISOString().split("T")[0] ?? since.toISOString();
}
