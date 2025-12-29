import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import * as schema from "../../database/schema";

type TestDbSetup = {
  db: ReturnType<typeof drizzlePglite>;
  cleanup: () => Promise<void>;
};

export async function createTestDb(name: string): Promise<TestDbSetup> {
  const baseDir = path.join(os.homedir(), ".data", name);
  const dataDir = path.join(baseDir, `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  await fs.mkdir(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  const db = drizzlePglite({ client, schema, logger: false });
  await migrate(db, {
    migrationsFolder: path.resolve(process.cwd(), "database/migrations"),
  });

  return {
    db,
    cleanup: async () => {
      await fs.rm(dataDir, { recursive: true, force: true });
    },
  };
}
