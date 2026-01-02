import { normalizePullRequestFrequencyTotals } from "~~/server/core/ratings/pullRequestFrequency/normalization";
import { ratePullRequestFrequency } from "~~/server/core/ratings/pullRequestFrequency/score";

export type PullRequestFrequencyPipelineInput = {
  userPullRequestsTotal: number;
  cohortPullRequestsTotals: number[];
};

export type PullRequestFrequencyPipelineConfig = {
  capPerWeek: number;
  lookbackMs: number;
};

export function ratePullRequestFrequencyFromTotals(
  input: PullRequestFrequencyPipelineInput,
  config: PullRequestFrequencyPipelineConfig,
): number {
  const normalized = normalizePullRequestFrequencyTotals(input, config);
  return ratePullRequestFrequency({
    userPullRequests: normalized.userPullRequestsTotal,
    cohortCounts: normalized.cohortPullRequestsTotals,
  });
}
