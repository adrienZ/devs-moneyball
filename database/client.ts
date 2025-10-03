import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/node-postgres";
import path from "node:path";
import * as schema from "./schema";
import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;

let db: ReturnType<typeof drizzlePostgres>;

if (DATABASE_URL) {
  const pool = new Pool({
    connectionString: DATABASE_URL,
  });

  db = drizzlePostgres(pool, { schema });
}
else {
  // Development: use PGlite
  const __dirname = new URL(".", import.meta.url).pathname;
  const dbFilesysPath = path.resolve(__dirname, "../../.data/pglite");
  const client = new PGlite(dbFilesysPath);
  db = drizzlePglite({ client, schema, logger: false }) as unknown as ReturnType<typeof drizzlePostgres>;
}

export function useDrizzle() {
  if (!db) {
    throw new Error("Database client not initialized");
  }
  return db;
}

// Handle process termination
process.on("beforeExit", async () => {
  if (DATABASE_URL && db?.$client) {
    try {
      await (db.$client as { end: () => Promise<void> }).end();
    }
    catch (error) {
      console.error("Error closing database connection:", error);
    }
  }
});
