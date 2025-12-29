import { describe, expect, it } from "vitest";
import {
  buildPullRequestFrequencySeries,
  ratePullRequestFrequency,
} from "../server/core/ratings/pullRequestFrequency";

describe("ratePullRequestFrequency", () => {
  it("returns 0 when there is no cohort data", () => {
    expect(ratePullRequestFrequency({ userPullRequests: 3, cohortCounts: [] })).toBe(0);
  });

  it("returns the percentile of the user within the cohort", () => {
    const percentile = ratePullRequestFrequency({
      userPullRequests: 5,
      cohortCounts: [1, 3, 5, 10],
    });

    expect(percentile).toBe(75);
  });

  it("handles a user with zero pull requests", () => {
    const percentile = ratePullRequestFrequency({
      userPullRequests: 0,
      cohortCounts: [0, 2, 4],
    });

    expect(percentile).toBe(33);
  });
});

describe("buildPullRequestFrequencySeries", () => {
  it("caps weekly counts and calculates windowed totals", () => {
    const series = buildPullRequestFrequencySeries(
      [
        "2024-03-04T12:00:00.000Z",
        "2024-03-04T13:00:00.000Z",
        "2024-03-12T12:00:00.000Z",
        "2024-03-12T13:00:00.000Z",
        "2024-03-12T14:00:00.000Z",
        "2024-03-20T12:00:00.000Z",
      ],
      {
        capPerWeek: 2,
        periodWeeks: 4,
        windowWeeks: 2,
        periodEnd: "2024-03-18",
      },
    );

    expect(series.series).toHaveLength(4);
    expect(series.totalCapped).toBe(5);
    expect(series.windowedCapped).toBe(3);
    expect(series.effectiveCount).toBe(3);
  });
});
