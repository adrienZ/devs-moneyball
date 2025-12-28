import { describe, expect, it } from "vitest";
import { percentileToTwentyScale } from "../server/core/ratings/percentileScale";

describe("percentileToTwentyScale", () => {
  it("maps the 0th percentile to 1", () => {
    expect(percentileToTwentyScale(0)).toBe(1);
  });

  it("maps the 100th percentile to 20", () => {
    expect(percentileToTwentyScale(100)).toBe(20);
  });

  it("maps mid percentiles to the expected rating", () => {
    expect(percentileToTwentyScale(50)).toBe(10);
    expect(percentileToTwentyScale(75)).toBe(15);
  });
});
