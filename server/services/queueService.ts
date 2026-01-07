import { PgBoss } from "pg-boss";
import { consola } from "consola";

// #region Types
export type PullRequestStatsJobData = {
  developerId: string;
  cohortSnapshotSourceId?: string;
};
// #endregion Types

// #region Queue Names
export const QUEUE_PULL_REQUEST_STATS = "pull-request-stats";
// #endregion Queue Names

// #region Service
let boss: PgBoss | null = null;

export function getQueueService(): PgBoss {
  if (!boss) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required for pg-boss");
    }
    boss = new PgBoss(connectionString);
    boss.on("error", (error) => {
      consola.error("pg-boss error:", error);
    });
  }
  return boss;
}

export async function startQueueService(): Promise<void> {
  const queue = getQueueService();
  await queue.start();
  await queue.createQueue(QUEUE_PULL_REQUEST_STATS);
  consola.success("pg-boss queue service started");
}

export async function enqueuePullRequestStats(
  jobs: PullRequestStatsJobData[],
): Promise<void> {
  const queue = getQueueService();
  for (const job of jobs) {
    await queue.send(QUEUE_PULL_REQUEST_STATS, job);
  }
}
// #endregion Service

