import type { PullRequestFrequencyPipelineConfig } from "~~/server/core/ratings/pullRequestFrequency/pipeline";

type RatingsConfig = {
  pullRequestFrequency: PullRequestFrequencyPipelineConfig;
  githubApi: {
    mergedPullRequestsLookbackMs: number;
  };
};

const mergedPullRequestsLookbackMs = 365 * 24 * 60 * 60 * 1000;

export const ratingsConfig: RatingsConfig = {
  pullRequestFrequency: {
    capPerWeek: 90,
    lookbackMs: mergedPullRequestsLookbackMs,
  },
  githubApi: {
    mergedPullRequestsLookbackMs,
  },
};
