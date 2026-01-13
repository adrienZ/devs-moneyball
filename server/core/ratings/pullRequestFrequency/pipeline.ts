import { normalizePullRequestFrequencyTotals } from "~~/server/core/ratings/pullRequestFrequency/normalization";
import { ratePullRequestFrequency } from "~~/server/core/ratings/pullRequestFrequency/score";

export type PullRequestFrequencyPipelineInput = {
  userPullRequestsTotal: number;
  cohortPullRequestsTotals: number[];
};

export function ratePullRequestFrequencyFromTotals(
  input: PullRequestFrequencyPipelineInput,
): number {
  const normalized = normalizePullRequestFrequencyTotals(input);
  return ratePullRequestFrequency({
    userPullRequests: normalized.userPullRequestsTotal,
    cohortCounts: normalized.cohortPullRequestsTotals,
  });
}
