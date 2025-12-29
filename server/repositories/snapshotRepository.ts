import { desc } from "drizzle-orm";
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

  async createSnapshotWithNames(input: {
    count: number;
    names: string[];
    timestamp: string;
  }): Promise<string> {
    const snapshotId = await this.db.transaction(async (tx) => {
      const [snap] = await tx
        .insert(snapshots)
        .values({
          count: input.count,
        })
        .returning();

      if (!snap) throw new Error("Failed to insert snapshot");

      if (input.names.length > 0) {
        await tx.insert(snapshotNames).values(
          input.names.map((name, i) => ({
            snapshotId: snap.id,
            name,
            position: i,
            createdAt: input.timestamp,
          })),
        );
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
}
