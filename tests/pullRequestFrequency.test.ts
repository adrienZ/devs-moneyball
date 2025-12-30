import { describe, expect, it } from "vitest";
import { ratePullRequestFrequency } from "../server/core/ratings/pullRequestFrequency/score";

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
