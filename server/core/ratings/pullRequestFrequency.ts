type PullRequestFrequencyInput = {
  userPullRequests: number;
  cohortCounts: number[];
};

export function ratePullRequestFrequency(
  input: PullRequestFrequencyInput,
): number {
  const { userPullRequests, cohortCounts } = input;
  const cohortSize = cohortCounts.length;
  if (cohortSize === 0) {
    return 0;
  }

  const belowOrEqual = cohortCounts.filter(value => value <= userPullRequests).length;
  return (belowOrEqual / cohortSize) * 100;
}
