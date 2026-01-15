import { PgBoss } from "pg-boss";
import { consola } from "consola";
import { PullRequestStatsJob } from "~~/server/jobs/pullRequestStatsJob";

// #region Types
export type PullRequestStatsJobData = {
  developerId: string;
  cohortSnapshotSourceId?: string;
};
// #endregion Types

// #region Queue Names
export const QUEUE_PULL_REQUEST_STATS = "pull-request-stats" as const;
// #endregion Queue Names

// #region Service
export class QueueService {
  private static instance: QueueService | null = null;
  private boss: PgBoss | null = null;
  private pullRequestStatsJob: PullRequestStatsJob | null = null;

  static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  private getBoss(): PgBoss {
    if (!this.boss) {
      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) {
        throw new Error("DATABASE_URL is required for pg-boss");
      }
      this.boss = new PgBoss(connectionString);
      this.boss.on("error", (error) => {
        consola.error("pg-boss error:", error);
      });
    }
    return this.boss;
  }

  getPullRequestStatsJob(): PullRequestStatsJob {
    if (!this.pullRequestStatsJob) {
      this.pullRequestStatsJob = new PullRequestStatsJob(this.getBoss());
    }
    return this.pullRequestStatsJob;
  }

  async startQueues(): Promise<void> {
    const queue = this.getBoss();
    await queue.start();
    await queue.createQueue(QUEUE_PULL_REQUEST_STATS);
    await this.getPullRequestStatsJob().start();
    consola.success("pg-boss queue service started");
  }
}
// #endregion Service
