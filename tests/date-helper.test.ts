import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMergedPullRequestsSinceDateFromWeeks } from "../server/utils/date-helper";

describe("getMergedPullRequestsSinceDateFromWeeks", () => {
  const oneWeek = 1;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-08-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the expected date string for a 1-week lookback", () => {
    expect(getMergedPullRequestsSinceDateFromWeeks(oneWeek)).toBe("2024-08-08");
  });

  it("returns the expected date string for a 4-week lookback", () => {
    expect(getMergedPullRequestsSinceDateFromWeeks(4)).toBe("2024-07-18");
  });

  it("returns the expected date string for a 52-week lookback", () => {
    expect(getMergedPullRequestsSinceDateFromWeeks(52)).toBe("2023-08-17");
  });
});
