export function percentileToTwentyScale(percentile: number): number {
  return 1 + Math.floor((percentile / 100) * 19);
}
