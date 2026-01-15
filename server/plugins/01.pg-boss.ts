import { defineNitroPlugin } from "nitropack/runtime";
import { consola } from "consola";
import { QueueService } from "~~/server/services/queueService";

export default defineNitroPlugin(async () => {
  // pg-boss requires a real PostgreSQL connection
  if (!process.env.DATABASE_URL) {
    consola.warn("pg-boss: DATABASE_URL not set, queue service disabled");
    return;
  }

  await QueueService.getInstance().startQueues();
});
