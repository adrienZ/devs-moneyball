import { migrate } from "drizzle-orm/postgres-js/migrator";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { defineNitroPlugin, runTask } from "nitropack/runtime";
import { useDrizzle } from "../../database/client";
import { consola } from "consola";

export default defineNitroPlugin(async () => {
  const db = useDrizzle();

  await migrate(db, {
    migrationsFolder: resolve(
      fileURLToPath(import.meta.url),
      "../../../", // don't forget .nuxt folder is ancestor
      "./database/migrations",
    ),
  });

  const oneYearMs = 1000 * 60 * 60 * 24 * 365;
  const result = await runTask("db:cohort", {
    payload: {
      msDuration: oneYearMs,
    },
  });
  consola.success("Cohort task result:", JSON.stringify(result.result, null, 2));
});
