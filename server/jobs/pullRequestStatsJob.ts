import { consola } from "consola";
import type { Job as PgBossJob } from "pg-boss";
import {
  QUEUE_PULL_REQUEST_STATS,
  type PullRequestStatsJobData,
} from "~~/server/services/queueService";
import { DeveloperRepository } from "~~/server/repositories/developerRepository";
import { PullRequestStatsRepository } from "~~/server/repositories/pullRequestStatsRepository";
import { SnapshotRepository } from "~~/server/repositories/snapshotRepository";
import { ensurePullRequestStats } from "~~/server/services/pullRequestStatsService";
import { BaseJob } from "./baseJob";

export class PullRequestStatsJob extends BaseJob<
  PullRequestStatsJobData,
  typeof QUEUE_PULL_REQUEST_STATS
> {
  readonly type = QUEUE_PULL_REQUEST_STATS;

  async work(jobs: PgBossJob<PullRequestStatsJobData>[]): Promise<void> {
    const job = jobs[0];
    if (!job) {
      consola.warn("pg-boss: No jobs received for pull request stats worker");
      return;
    }
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
  }
}
