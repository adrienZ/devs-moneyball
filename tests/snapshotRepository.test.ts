import { describe, expect, it, beforeEach, vi } from "vitest";
import { createTestDb } from "./helpers/pgliteTestDb";

beforeEach(async ({ task }) => {
  vi.resetModules();
  const dbSetup = await createTestDb(task.file.filepath);

  vi.doMock("../database/client", () => ({
    useDrizzle: () => dbSetup.db,
  }));
});

describe("SnapshotRepository", () => {
  it("creates snapshots and returns the latest snapshot", async () => {
    const { SnapshotRepository } = await import("../server/repositories/snapshotRepository");
    const repository = SnapshotRepository.getInstance();

    const timestamp = new Date().toISOString();
    const snapshotId = await repository.createSnapshotWithNames({
      count: 2,
      names: ["alpha", "beta"],
      timestamp,
    });

    const latest = await repository.findLatest();
    expect(latest?.id).toBe(snapshotId);
    expect(latest?.count).toBe(2);
  });
});
