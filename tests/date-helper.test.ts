import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMergedPullRequestsSinceDate } from "../server/utils/date-helper";

describe("getMergedPullRequestsSinceDate", () => {
  const msInDay = 24 * 60 * 60 * 1000;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-08-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the expected date string for a day lookback", () => {
    expect(getMergedPullRequestsSinceDate(msInDay)).toBe("2024-08-14");
  });

  it("returns the expected date string for a week lookback", () => {
    expect(getMergedPullRequestsSinceDate(7 * msInDay)).toBe("2024-08-08");
  });

  it("returns the expected date string for a year lookback", () => {
    expect(getMergedPullRequestsSinceDate(365 * msInDay)).toBe("2023-08-16");
  });
});
