import { createError, defineEventHandler, getRouterParam } from "h3";
import { DeveloperRepository } from "~~/server/repositories/developerRepository";
import { ensurePullRequestStats } from "~~/server/services/pullRequestStatsService";

export default defineEventHandler(async (event) => {
  const username = getRouterParam(event, "username");
  if (!username) {
    throw createError({
      statusCode: 400,
      message: "Missing required parameter: username",
    });
  }

  const developerRepository = DeveloperRepository.getInstance();
  const developerRow = await developerRepository.findByUsername(username);
  if (!developerRow) {
    throw createError({
      statusCode: 404,
      message: "Developer not found",
    });
  }

  const stats = await ensurePullRequestStats(developerRow);
  if (!stats) {
    throw createError({ statusCode: 404, message: "User not found" });
  }

  return stats;
});
