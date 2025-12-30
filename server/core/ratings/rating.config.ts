import type { PullRequestFrequencyPipelineConfig } from "~~/server/core/ratings/pullRequestFrequency/pipeline";

type RatingsConfig = {
  pullRequestFrequency: PullRequestFrequencyPipelineConfig;
  githubApi: {
    mergedPullRequestsLookbackYears: number;
  };
};

export const ratingsConfig: RatingsConfig = {
  pullRequestFrequency: {
    capPerWeek: 30,
  },
  githubApi: {
    mergedPullRequestsLookbackYears: 5,
  },
};
