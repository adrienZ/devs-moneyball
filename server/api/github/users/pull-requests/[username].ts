import { createError, defineEventHandler, getRouterParam } from "h3";
import { eq } from "drizzle-orm";
import { useDrizzle } from "~~/database/client";
import { developper } from "~~/database/schema";
import { ensurePullRequestStats } from "~~/server/services/pullRequestStatsService";

export default defineEventHandler(async (event) => {
  const username = getRouterParam(event, "username");
  if (!username) {
    throw createError({
      statusCode: 400,
      message: "Missing required parameter: username",
    });
  }

  const db = useDrizzle();

  const developerRecord = await db
    .select()
    .from(developper)
    .where(eq(developper.username, username))
    .limit(1);

  const developerRow = developerRecord.at(0);
  if (!developerRow) {
    throw createError({
      statusCode: 404,
      message: "Developer not found",
    });
  }

  const stats = await ensurePullRequestStats(db, developerRow);
  if (!stats) {
    throw createError({ statusCode: 404, message: "User not found" });
  }

  return stats;
});
