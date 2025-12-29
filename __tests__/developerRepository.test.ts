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
  const baseDir = path.join(os.homedir(), ".data", "developerRepository");
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
