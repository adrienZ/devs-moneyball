import { desc, eq, inArray } from "drizzle-orm";
import { useDrizzle } from "~~/database/client";
import { snapshotNames, snapshots } from "~~/database/schema";

type DrizzleClient = ReturnType<typeof useDrizzle>;
type SnapshotRecord = typeof snapshots.$inferSelect;

export class SnapshotRepository {
  private static instance: SnapshotRepository | null = null;

  static getInstance(): SnapshotRepository {
    if (!SnapshotRepository.instance) {
      SnapshotRepository.instance = new SnapshotRepository();
    }

    return SnapshotRepository.instance;
  }

  private get db(): DrizzleClient {
    return useDrizzle();
  }

  private dedupeNames(names: string[]): string[] {
    const seen = new Set<string>();
    return names.filter((name) => {
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });
  }

  async createSnapshot(count: number, lookbackWeeks: number): Promise<string> {
    const [snap] = await this.db
      .insert(snapshots)
      .values({ count, pullRequestFrequencyLookbackWeeks: lookbackWeeks })
      .returning();

    if (!snap) throw new Error("Failed to insert snapshot");
    return snap.id;
  }

  async createSnapshotWithNames(input: {
    count: number;
    names: string[];
    timestamp: string;
    pullRequestFrequencyLookbackWeeks: number;
  }): Promise<string> {
    const names = this.dedupeNames(input.names);
    const existing = names.length === 0
      ? []
      : await this.db
          .select({ name: snapshotNames.name })
          .from(snapshotNames)
          .where(inArray(snapshotNames.name, names))
          .then(rows => rows.map(row => row.name));
    const namesToInsert = names.filter(name => !existing.includes(name));
    const snapshotId = await this.db.transaction(async (tx) => {
      const [snap] = await tx
        .insert(snapshots)
        .values({
          count: input.count,
          pullRequestFrequencyLookbackWeeks: input.pullRequestFrequencyLookbackWeeks,
        })
        .returning();

      if (!snap) throw new Error("Failed to insert snapshot");

      if (namesToInsert.length > 0) {
        await tx
          .insert(snapshotNames)
          .values(
            namesToInsert.map(name => ({
              snapshotId: snap.id,
              name,
              createdAt: input.timestamp,
            })),
          )
          .onConflictDoNothing({ target: snapshotNames.name });
      }

      return snap.id;
    });

    return snapshotId;
  }

  async findLatest(): Promise<SnapshotRecord | null> {
    return this.db
      .select()
      .from(snapshots)
      .orderBy(desc(snapshots.createdAt))
      .limit(1)
      .then(rows => rows.at(0) ?? null);
  }

  async listNamesBySnapshotId(snapshotId: string): Promise<string[]> {
    return this.db
      .select({ name: snapshotNames.name })
      .from(snapshotNames)
      .where(eq(snapshotNames.snapshotId, snapshotId))
      .then(rows => rows.map(row => row.name));
  }
}
