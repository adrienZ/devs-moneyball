import { describe, expect, it, beforeEach, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import * as schema from "../database/schema";

let db: ReturnType<typeof drizzlePglite>;
let dataDir: string;

async function setupDb() {
  const baseDir = path.join(os.homedir(), ".data", "snapshotRepository");
  dataDir = path.join(baseDir, `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  await fs.mkdir(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  db = drizzlePglite({ client, schema, logger: false });
  await migrate(db, {
    migrationsFolder: path.resolve(process.cwd(), "database/migrations"),
  });
}

beforeEach(async () => {
  vi.resetModules();
  await setupDb();
  vi.doMock("../database/client", () => ({
    useDrizzle: () => db,
  }));
});

afterEach(async () => {
  if (dataDir) {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
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
