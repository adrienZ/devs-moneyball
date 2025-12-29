import { describe, expect, it, beforeEach, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import { randomUUID } from "node:crypto";
import os from "node:os";
import fs from "node:fs/promises";
import * as schema from "../database/schema";

let db: ReturnType<typeof drizzlePglite>;
let dataDir: string;

async function setupDb() {
  const baseDir = path.join(os.homedir(), ".data", "pullRequestStatsRepository");
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

describe("PullRequestStatsRepository", () => {
  it("upserts stats and lists cohort counts", async () => {
    const { DeveloperRepository } = await import("../server/repositories/developerRepository");
    const { SnapshotRepository } = await import("../server/repositories/snapshotRepository");
    const { PullRequestStatsRepository } = await import("../server/repositories/pullRequestStatsRepository");

    const developerRepository = DeveloperRepository.getInstance();
    const snapshotRepository = SnapshotRepository.getInstance();
    const statsRepository = PullRequestStatsRepository.getInstance();

    const developer = await developerRepository.upsertFromGithub({
      id: "dev-3",
      githubId: "gh-3",
      username: "bob",
      avatarUrl: "https://example.com/c.png",
      bio: null,
    });

    if (!developer) throw new Error("Failed to create developer");

    const snapshotId = await snapshotRepository.createSnapshotWithNames({
      count: 0,
      names: [],
      timestamp: new Date().toISOString(),
    });

    const saved = await statsRepository.upsert({
      id: randomUUID(),
      developerId: developer.id,
      cohortSnapshotSourceId: snapshotId,
      totalPullRequestContributions: 3,
      totalPullRequestReviewContributions: 2,
      pullRequestsTotalCount: 5,
      mergedPullRequestsTotalCount: 1,
      closedPullRequestsTotalCount: 1,
      openPullRequestsTotalCount: 3,
      updatedAt: new Date().toISOString(),
    });

    expect(saved?.developerId).toBe(developer.id);

    const fetched = await statsRepository.findByDeveloperId(developer.id);
    expect(fetched?.pullRequestsTotalCount).toBe(5);

    const newSnapshotId = await snapshotRepository.createSnapshotWithNames({
      count: 0,
      names: [],
      timestamp: new Date().toISOString(),
    });

    const updated = await statsRepository.updateCohortSnapshotSource(
      developer.id,
      newSnapshotId,
    );

    expect(updated?.cohortSnapshotSourceId).toBe(newSnapshotId);

    const counts = await statsRepository.listCohortPullRequestCounts(newSnapshotId);
    expect(counts).toEqual([5]);
  });
});
