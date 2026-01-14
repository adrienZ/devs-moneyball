import { consola } from "consola";
import { defineNitroPlugin, runTask } from "nitropack/runtime";

export default defineNitroPlugin(async () => {
  const oneYearMs = 1000 * 60 * 60 * 24 * 365;
  const result = await runTask("db:cohort", {
    payload: {
      msDuration: oneYearMs,
    },
  });
  consola.success("Cohort task result:", JSON.stringify(result.result, null, 2));
});
