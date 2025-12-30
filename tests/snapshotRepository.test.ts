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
  it("creates snapshots with names and returns the latest snapshot", async () => {
    const { SnapshotRepository } = await import("../server/repositories/snapshotRepository");
    const repository = SnapshotRepository.getInstance();

    const timestamp = new Date().toISOString();
    const snapshotId = await repository.createSnapshotWithNames({
      count: 2,
      names: ["alpha", "beta", "alpha"],
      timestamp,
    });

    const latest = await repository.findLatest();
    expect(latest?.id).toBe(snapshotId);
    expect(latest?.count).toBe(2);
    const storedNames = await repository.listNamesBySnapshotId(snapshotId);
    expect(storedNames.sort()).toEqual(["alpha", "beta"]);
  });

  it("stores names independently per snapshot", async () => {
    const { SnapshotRepository } = await import("../server/repositories/snapshotRepository");
    const repository = SnapshotRepository.getInstance();

    const firstId = await repository.createSnapshotWithNames({
      count: 2,
      names: ["alpha", "beta"],
      timestamp: new Date().toISOString(),
    });
    const secondId = await repository.createSnapshotWithNames({
      count: 2,
      names: ["gamma", "delta"],
      timestamp: new Date().toISOString(),
    });

    const firstNames = await repository.listNamesBySnapshotId(firstId);
    const secondNames = await repository.listNamesBySnapshotId(secondId);

    expect(firstNames.sort()).toEqual(["alpha", "beta"]);
    expect(secondNames.sort()).toEqual(["gamma", "delta"]);
    expect([...firstNames, ...secondNames].sort()).toEqual([
      "alpha",
      "beta",
      "gamma",
      "delta",
    ]);
  });

  it("skips inserting names that already exist", async () => {
    const { SnapshotRepository } = await import("../server/repositories/snapshotRepository");
    const repository = SnapshotRepository.getInstance();

    const firstId = await repository.createSnapshotWithNames({
      count: 2,
      names: ["alpha", "beta"],
      timestamp: new Date().toISOString(),
    });
    const secondId = await repository.createSnapshotWithNames({
      count: 2,
      names: ["alpha", "beta"],
      timestamp: new Date().toISOString(),
    });

    const firstNames = await repository.listNamesBySnapshotId(firstId);
    const secondNames = await repository.listNamesBySnapshotId(secondId);

    expect(firstNames.sort()).toEqual(["alpha", "beta"]);
    expect(secondNames).toEqual([]);
  });
});
