import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import fs from "node:fs/promises";
import * as schema from "../../database/schema";

type TestDbSetup = {
  db: ReturnType<typeof drizzlePglite>;
  cleanup: () => Promise<void>;
};

export async function createTestDb(testFilenamePath: string): Promise<TestDbSetup> {
  const testName = path.basename(testFilenamePath, path.extname(testFilenamePath));
  const dbDir = path.resolve(__dirname, "../..", ".data/tests", `${testName}`);

  await cleanup();
  const client = new PGlite(dbDir);
  const db = drizzlePglite({ client, schema, logger: false });
  await migrate(db, {
    migrationsFolder: path.resolve(process.cwd(), "database/migrations"),
  });

  async function cleanup() {
    await fs.rm(dbDir, { recursive: true, force: true });
  }

  return {
    db,
    cleanup,
  };
}
