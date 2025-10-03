import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import path from "node:path";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;

let db: ReturnType<typeof drizzlePostgres>;

if (DATABASE_URL) {
  // Production: use PostgreSQL with connection pooling and retry logic
  const sql = postgres(DATABASE_URL, {
    prepare: false,
    ssl: "require",
    debug: true,
    // Connection pooling settings
    max: 10, // Maximum number of connections
    idle_timeout: 20, // Close idle connections after 20 seconds
    connect_timeout: 10, // Connection timeout after 10 seconds
    // Query timeouts
    timeout: 5000, // 5s statement timeout
    // Connection lifetime management
    max_lifetime: 60 * 30, // Connection lifetime 30 minutes
    // Error handling
    onnotice: notice => console.log("DB Notice:", notice),
    onparameter: status => console.log("DB Parameter:", status),
  });

  db = drizzlePostgres(sql, { schema });
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
