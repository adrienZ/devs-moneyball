import { defineNitroPlugin } from "nitropack/runtime";
import { consola } from "consola";
import {
  getQueueService,
  startQueueService,
  QUEUE_PULL_REQUEST_STATS,
  type PullRequestStatsJobData,
} from "~~/server/services/queueService";
import { DeveloperRepository } from "~~/server/repositories/developerRepository";
import { PullRequestStatsRepository } from "~~/server/repositories/pullRequestStatsRepository";
import { SnapshotRepository } from "~~/server/repositories/snapshotRepository";
import { ensurePullRequestStats } from "~~/server/services/pullRequestStatsService";

export default defineNitroPlugin(async () => {
  // pg-boss requires a real PostgreSQL connection
  if (!process.env.DATABASE_URL) {
    consola.warn("pg-boss: DATABASE_URL not set, queue service disabled");
    return;
  }

  await startQueueService();

  const boss = getQueueService();

  // Register worker for pull request stats jobs
  await boss.work<PullRequestStatsJobData>(QUEUE_PULL_REQUEST_STATS, async ([job]) => {
    const { developerId, cohortSnapshotSourceId } = job.data;

    const developerRepository = DeveloperRepository.getInstance();
    const pullRequestStatsRepository = PullRequestStatsRepository.getInstance();
    const snapshotRepository = SnapshotRepository.getInstance();
    const developer = await developerRepository.findById(developerId);

    if (!developer) {
      consola.error(`pg-boss: Developer ${developerId} not found`);
      throw new Error(`Developer ${developerId} not found`);
    }

    const result = await ensurePullRequestStats(developer, {
      cohortSnapshotSourceId,
    });

    if (result) {
      consola.info(`pg-boss: Processed PR stats for ${developer.username}`);
    }

    if (cohortSnapshotSourceId) {
      const snapshot = await snapshotRepository.findById(cohortSnapshotSourceId);
      if (snapshot && snapshot.status !== "ready") {
        const totalStats = await pullRequestStatsRepository.countBySnapshotId(
          cohortSnapshotSourceId,
        );
        if (totalStats >= snapshot.count) {
          await snapshotRepository.updateStatus(cohortSnapshotSourceId, "ready");
          consola.info(`pg-boss: Snapshot ${cohortSnapshotSourceId} marked ready`);
        }
      }
    }
  });
});
