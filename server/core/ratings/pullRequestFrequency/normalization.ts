type WeeklyCapConfig = {
  capPerWeek: number;
};

function applyWeeklyCapToTotal(totalCount: number, config: WeeklyCapConfig): number {
  return Math.min(totalCount, config.capPerWeek);
}

export type PullRequestFrequencyTotalsInput = {
  userPullRequestsTotal: number;
  cohortPullRequestsTotals: number[];
};

export type PullRequestFrequencyNormalizationConfig = WeeklyCapConfig;

export function normalizePullRequestFrequencyTotals(
  input: PullRequestFrequencyTotalsInput,
  config: PullRequestFrequencyNormalizationConfig,
): PullRequestFrequencyTotalsInput {
  return {
    userPullRequestsTotal: applyWeeklyCapToTotal(input.userPullRequestsTotal, config),
    cohortPullRequestsTotals: input.cohortPullRequestsTotals.map(
      count => applyWeeklyCapToTotal(count, config),
    ),
  };
}
