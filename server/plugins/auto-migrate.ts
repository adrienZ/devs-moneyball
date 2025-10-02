import { migrate } from "drizzle-orm/postgres-js/migrator";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { defineNitroPlugin } from "nitropack/runtime";
import { useDrizzle } from "../../database/client";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js/driver";

export default defineNitroPlugin(async () => {
  const db = useDrizzle();
  if (import.meta.dev && !(db instanceof PostgresJsDatabase)) {
    await migrate(db, {
      migrationsFolder: resolve(
        fileURLToPath(import.meta.url),
        "../../../", // don't forget .nuxt folder is ancestor
        "./database/migrations",
      ),
    });
  }
});
