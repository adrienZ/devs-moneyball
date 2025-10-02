import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import path from "node:path";
import * as schema from "./schema";

const __dirname = new URL(".", import.meta.url).pathname;
const dbFilesysPath = path.resolve(__dirname, "../../.data/pglite");

const client = new PGlite(dbFilesysPath);

const db = drizzle({ client, schema, logger: import.meta.dev, });

export function useDrizzle() {
  return db;
};