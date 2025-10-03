import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import path from "node:path";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;

let db: ReturnType<typeof drizzlePostgres>;

if (DATABASE_URL) {
  // Production: use PostgreSQL
  db = drizzlePostgres(postgres(DATABASE_URL, { prepare: false, ssl: "require" }), { schema });
}
else {
  // Development: use PGlite
  const __dirname = new URL(".", import.meta.url).pathname;
  const dbFilesysPath = path.resolve(__dirname, "../../.data/pglite");
  const client = new PGlite(dbFilesysPath);
  db = drizzlePglite({ client, schema, logger: false }) as unknown as ReturnType<typeof drizzlePostgres>;
}

export function useDrizzle() {
  return db;
}
