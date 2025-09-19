import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import path from "node:path";
import * as schema from "./schemas";

const __dirname = new URL(".", import.meta.url).pathname;
const dbFilesysPath = path.resolve(__dirname, "../../.data/pglite");

const client = new PGlite(dbFilesysPath);

export const db = drizzle({ client, schema, logger: import.meta.dev });
