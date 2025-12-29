type PullRequestFrequencyInput = {
  userPullRequests: number;
  cohortCounts: number[];
};

export type PullRequestFrequencySeriesEntry = {
  weekStart: string;
  weekEnd: string;
  mergedCount: number;
  cappedCount: number;
};

export type PullRequestFrequencySeries = {
  series: PullRequestFrequencySeriesEntry[];
  totalCapped: number;
  windowedCapped: number | null;
  effectiveCount: number;
  periodStart: string;
  periodEnd: string;
  capPerWeek: number;
  periodWeeks: number;
  windowWeeks: number | null;
};

export type PullRequestFrequencyConfig = {
  capPerWeek: number;
  periodWeeks: number;
  windowWeeks?: number;
  periodEnd?: string;
};

export const defaultPullRequestFrequencyConfig: PullRequestFrequencyConfig = {
  // capPerWeek: cap each week's merged PR count to avoid bursty weeks dominating.
  // periodWeeks: total span (in weeks) for the series and total capped count.
  // windowWeeks: if set, effectiveCount uses the last N weeks of capped counts.
  capPerWeek: 5,
  periodWeeks: 12,
  windowWeeks: 4,
};

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0] ?? date.toISOString();
}

function getWeekStart(date: Date): Date {
  const utcDate = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  ));
  const day = utcDate.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  utcDate.setUTCDate(utcDate.getUTCDate() - diffToMonday);
  utcDate.setUTCHours(0, 0, 0, 0);
  return utcDate;
}

export function buildPullRequestFrequencySeries(
  mergedAtDates: string[],
  config: PullRequestFrequencyConfig = defaultPullRequestFrequencyConfig,
): PullRequestFrequencySeries {
  const capPerWeek = config.capPerWeek;
  const periodWeeks = config.periodWeeks;
  const windowWeeks = config.windowWeeks ?? null;
  const periodEndDate = config.periodEnd ? new Date(config.periodEnd) : new Date();
  const endWeekStart = getWeekStart(periodEndDate);
  const startWeekStart = new Date(endWeekStart);
  startWeekStart.setUTCDate(startWeekStart.getUTCDate() - ((periodWeeks - 1) * 7));

  const weekKeys = Array.from({ length: periodWeeks }, (_, index) => {
    const weekStart = new Date(startWeekStart);
    weekStart.setUTCDate(weekStart.getUTCDate() + (index * 7));
    return formatDate(weekStart);
  });

  const countsByWeek = new Map<string, number>();
  weekKeys.forEach(key => countsByWeek.set(key, 0));

  mergedAtDates.forEach((mergedAt) => {
    const mergedDate = new Date(mergedAt);
    if (Number.isNaN(mergedDate.getTime())) {
      return;
    }

    const weekStart = formatDate(getWeekStart(mergedDate));
    if (!countsByWeek.has(weekStart)) {
      return;
    }

    countsByWeek.set(weekStart, (countsByWeek.get(weekStart) ?? 0) + 1);
  });

  const series = weekKeys.map((weekStart) => {
    const weekStartDate = new Date(`${weekStart}T00:00:00.000Z`);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 6);
    const mergedCount = countsByWeek.get(weekStart) ?? 0;
    return {
      weekStart,
      weekEnd: formatDate(weekEndDate),
      mergedCount,
      cappedCount: Math.min(mergedCount, capPerWeek),
    };
  });

  const totalCapped = series.reduce((sum, entry) => sum + entry.cappedCount, 0);
  const windowedCapped = windowWeeks
    ? series.slice(-windowWeeks).reduce((sum, entry) => sum + entry.cappedCount, 0)
    : null;
  const effectiveCount = windowedCapped ?? totalCapped;

  return {
    series,
    totalCapped,
    windowedCapped,
    effectiveCount,
    periodStart: formatDate(startWeekStart),
    periodEnd: formatDate(endWeekStart),
    capPerWeek,
    periodWeeks,
    windowWeeks,
  };
}

export function ratePullRequestFrequency(
  input: PullRequestFrequencyInput,
): number {
  const { userPullRequests, cohortCounts } = input;
  const cohortSize = cohortCounts.length;
  if (cohortSize === 0) {
    return 0;
  }

  const belowOrEqual = cohortCounts.filter(value => value <= userPullRequests).length;
  return Math.round((belowOrEqual / cohortSize) * 100);
}
