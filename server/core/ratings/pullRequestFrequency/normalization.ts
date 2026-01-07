export type PullRequestFrequencyTotalsInput = {
  userPullRequestsTotal: number;
  cohortPullRequestsTotals: number[];
};

export function normalizePullRequestFrequencyTotals(
  input: PullRequestFrequencyTotalsInput,
): PullRequestFrequencyTotalsInput {
  return input;
}
