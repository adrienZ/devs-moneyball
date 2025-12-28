import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import path from "node:path";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;

let db: ReturnType<typeof drizzlePostgres>;

if (!DATABASE_URL) {
  // Fallback or testing: use PGlite
  const __dirname = new URL(".", import.meta.url).pathname;
  const dbFilesysPath = path.resolve(__dirname, "../../.data/pglite");
  const client = new PGlite(dbFilesysPath);
  db = drizzlePglite({ client, schema, logger: false }) as unknown as ReturnType<typeof drizzlePostgres>;
}
else if (DATABASE_URL.includes("supabase")) {
  // Production: use supabase pooler
  db = drizzlePostgres(postgres(DATABASE_URL, { prepare: false, ssl: "require" }), { schema });
}
else {
  db = drizzlePostgres(postgres(DATABASE_URL), { schema });
}

export function useDrizzle() {
  return db;
}
