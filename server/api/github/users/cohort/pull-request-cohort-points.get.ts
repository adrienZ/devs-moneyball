import { defineEventHandler } from "h3";
import { PullRequestStatsRepository } from "~~/server/repositories/pullRequestStatsRepository";
import { SnapshotRepository } from "~~/server/repositories/snapshotRepository";

export default defineEventHandler(async () => {
  const snapshotRepository = SnapshotRepository.getInstance();
  const latestSnapshot = await snapshotRepository.findLatest();
  if (!latestSnapshot) {
    return [];
  }

  const pullRequestStatsRepository = PullRequestStatsRepository.getInstance();
  return pullRequestStatsRepository.listCohortPullRequestPoints(latestSnapshot.id);
});
