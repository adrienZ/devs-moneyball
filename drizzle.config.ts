import { defineConfig } from "drizzle-kit";
import path from "node:path";

export default defineConfig({
  dialect: "postgresql",
  schema: path.resolve(__dirname, "./database/schemas"),
  out: "./database/migrations",
  verbose: true,
  driver: "pglite",
  strict: true,
  dbCredentials: {
    // pglite specific
    url: path.resolve(__dirname, "./.data/pglite"),
  },
});
