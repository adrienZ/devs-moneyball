import { eq, sql } from "drizzle-orm";
import { useDrizzle } from "~~/database/client";
import { developper, githubPullRequestStats } from "~~/database/schema";

type DrizzleClient = ReturnType<typeof useDrizzle>;
type PullRequestStatsRecord = typeof githubPullRequestStats.$inferSelect;
type PullRequestStatsInsert = typeof githubPullRequestStats.$inferInsert;
type CohortPullRequestPoint = {
  login: string;
  pullRequestsCount: number;
};

export class PullRequestStatsRepository {
  private static instance: PullRequestStatsRepository | null = null;

  static getInstance(): PullRequestStatsRepository {
    if (!PullRequestStatsRepository.instance) {
      PullRequestStatsRepository.instance = new PullRequestStatsRepository();
    }

    return PullRequestStatsRepository.instance;
  }

  private get db(): DrizzleClient {
    return useDrizzle();
  }

  async findByDeveloperId(developerId: string): Promise<PullRequestStatsRecord | null> {
    const record = await this.db
      .select()
      .from(githubPullRequestStats)
      .where(eq(githubPullRequestStats.developerId, developerId))
      .limit(1);

    return record.at(0) ?? null;
  }

  async updateCohortSnapshotSource(
    developerId: string,
    cohortSnapshotSourceId: string,
  ): Promise<PullRequestStatsRecord | null> {
    const nowIso = new Date().toISOString();
    const [updatedRecord] = await this.db
      .update(githubPullRequestStats)
      .set({
        cohortSnapshotSourceId,
        updatedAt: nowIso,
      })
      .where(eq(githubPullRequestStats.developerId, developerId))
      .returning();

    return updatedRecord ?? null;
  }

  async upsert(values: PullRequestStatsInsert): Promise<PullRequestStatsRecord | null> {
    const [savedRecord] = await this.db
      .insert(githubPullRequestStats)
      .values(values)
      .onConflictDoUpdate({
        target: githubPullRequestStats.developerId,
        set: values,
      })
      .returning();

    return savedRecord ?? null;
  }

  async listCohortPullRequestCounts(snapshotId: string): Promise<number[]> {
    const totalCount = sql<number>`
      ${githubPullRequestStats.mergedPullRequestsOwnCount}
      + ${githubPullRequestStats.mergedPullRequestsExternalCount}
    `;
    return this.db
      .select({ total: totalCount })
      .from(githubPullRequestStats)
      .where(eq(githubPullRequestStats.cohortSnapshotSourceId, snapshotId))
      .then(rows => rows.map(row => row.total));
  }

  async listCohortPullRequestPoints(snapshotId: string): Promise<CohortPullRequestPoint[]> {
    const totalCount = sql<number>`
      ${githubPullRequestStats.mergedPullRequestsOwnCount}
      + ${githubPullRequestStats.mergedPullRequestsExternalCount}
    `;
    return this.db
      .select({
        login: developper.username,
        pullRequestsCount: totalCount,
      })
      .from(githubPullRequestStats)
      .innerJoin(developper, eq(githubPullRequestStats.developerId, developper.id))
      .where(eq(githubPullRequestStats.cohortSnapshotSourceId, snapshotId));
  }

  async countBySnapshotId(snapshotId: string): Promise<number> {
    const rows = await this.db
      .select({ total: sql<number>`count(*)` })
      .from(githubPullRequestStats)
      .where(eq(githubPullRequestStats.cohortSnapshotSourceId, snapshotId));
    return rows.at(0)?.total ?? 0;
  }
}
