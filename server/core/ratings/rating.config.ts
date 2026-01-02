import type { PullRequestFrequencyPipelineConfig } from "~~/server/core/ratings/pullRequestFrequency/pipeline";

type RatingsConfig = {
  pullRequestFrequency: PullRequestFrequencyPipelineConfig;
  githubApi: {
    mergedPullRequestsLookbackMs: number;
  };
};

export const ratingsConfig: RatingsConfig = {
  pullRequestFrequency: {
    capPerWeek: 90,
  },
  githubApi: {
    mergedPullRequestsLookbackMs: 7 * 24 * 60 * 60 * 1000,
  },
};
