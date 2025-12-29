import { describe, expect, it, beforeEach, vi } from "vitest";
import { createTestDb } from "./helpers/pgliteTestDb";

let dbSetup: Awaited<ReturnType<typeof createTestDb>>;

beforeEach(async () => {
  vi.resetModules();
  dbSetup = await createTestDb("developerRepository");
  vi.doMock("../database/client", () => ({
    useDrizzle: () => dbSetup.db,
  }));
});

afterEach(async () => {
  await dbSetup.cleanup();
});

describe("DeveloperRepository", () => {
  it("upserts and fetches developers", async () => {
    const { DeveloperRepository } = await import("../server/repositories/developerRepository");
    const repository = DeveloperRepository.getInstance();

    const created = await repository.upsertFromGithub({
      id: "dev-1",
      githubId: "gh-1",
      username: "alice",
      avatarUrl: "https://example.com/a.png",
      bio: null,
    });

    expect(created?.username).toBe("alice");

    const fetched = await repository.findByUsername("alice");
    expect(fetched?.githubId).toBe("gh-1");

    const updated = await repository.upsertFromGithub({
      id: "dev-2",
      githubId: "gh-1",
      username: "alice-updated",
      avatarUrl: "https://example.com/b.png",
      bio: "Hello",
    });

    expect(updated?.username).toBe("alice-updated");
    const fetchedUpdated = await repository.findByUsername("alice-updated");
    expect(fetchedUpdated?.avatarUrl).toBe("https://example.com/b.png");
  });
});
