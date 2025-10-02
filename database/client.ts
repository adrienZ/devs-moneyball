import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import path from "node:path";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;

let db: ReturnType<typeof drizzlePglite> | ReturnType<typeof drizzlePg>;

if (DATABASE_URL) {
  // Production: use PostgreSQL
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: true,
  });
  db = drizzlePg(pool, { schema });
}
else {
  // Development: use PGlite
  const __dirname = new URL(".", import.meta.url).pathname;
  const dbFilesysPath = path.resolve(__dirname, "../../.data/pglite");
  const client = new PGlite(dbFilesysPath);
  db = drizzlePglite({ client, schema, logger: false });
}

export function useDrizzle() {
  return db;
}
