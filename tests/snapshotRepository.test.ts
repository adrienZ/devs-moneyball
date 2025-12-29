import { describe, expect, it, beforeEach, vi } from "vitest";
import { createTestDb } from "./helpers/pgliteTestDb";

let dbSetup: Awaited<ReturnType<typeof createTestDb>>;

beforeEach(async ({ task }) => {
  vi.resetModules();
  const suiteName = task.parent?.name ?? "snapshotRepository";
  dbSetup = await createTestDb(`${suiteName}-${task.name}`);
  vi.doMock("../database/client", () => ({
    useDrizzle: () => dbSetup.db,
  }));
});

afterEach(async () => {
  await dbSetup.cleanup();
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
