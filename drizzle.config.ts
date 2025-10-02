import { defineConfig } from "drizzle-kit";
import path from "node:path";

const DATABASE_URL = process.env.DATABASE_URL;

export default defineConfig({
  dialect: "postgresql",
  schema: path.resolve(__dirname, "./database/schema.ts"),
  out: "./database/migrations",
  verbose: true,
  driver: DATABASE_URL ? undefined : "pglite",
  strict: true,
  dbCredentials: {
    // pglite specific
    url: DATABASE_URL ?? path.resolve(__dirname, "./.data/pglite"),
  },
});
