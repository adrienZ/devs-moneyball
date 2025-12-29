import { describe, expect, it, beforeEach, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./helpers/pgliteTestDb";

let dbSetup: Awaited<ReturnType<typeof createTestDb>>;

beforeEach(async () => {
  vi.resetModules();
  dbSetup = await createTestDb("pullRequestStatsRepository");
  vi.doMock("../database/client", () => ({
    useDrizzle: () => dbSetup.db,
  }));
});

afterEach(async () => {
  await dbSetup.cleanup();
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
