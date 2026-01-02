import { getLookbackWeeks } from "~~/server/utils/date-helper";

type WeeklyCapConfig = {
  capPerWeek: number;
  lookbackMs: number;
};

function applyWeeklyCapToTotal(totalCount: number, config: WeeklyCapConfig): number {
  const lookbackWeeks = getLookbackWeeks(config.lookbackMs);
  const windowedCap = config.capPerWeek * lookbackWeeks;
  return Math.min(totalCount, windowedCap);
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
