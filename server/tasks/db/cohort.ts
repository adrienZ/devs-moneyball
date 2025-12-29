import { defineTask } from "nitropack/runtime";
import { getGithubClient } from "~~/server/githubClient";
import { parse } from "graphql";
import { nanoid } from "nanoid";
import { ensurePullRequestStats } from "~~/server/services/pullRequestStatsService";
import type { PullRequestStatsResponse } from "~~/server/services/pullRequestStatsService";
import { z } from "zod";
import { DeveloperRepository } from "~~/server/repositories/developerRepository";
import { SnapshotRepository } from "~~/server/repositories/snapshotRepository";

interface CohortUser {
  id: string;
  login: string;
  followers: {
    totalCount: number;
  };
  avatarUrl: string;
  bio: string | null;
}

function buildUsersQuery(logins: string[]) {
  return `
    query GetUsersInfo{
      ${logins
        .map(
          (login, i) => `
          user_${i}: user(login: "${login}") {
            id
            login
            followers {
              totalCount
            }
            avatarUrl
            bio
          }
        `,
        )
        .join("\n")}
    }
  `;
}

const payloadSchema = z.object({
  msDuration: z.number().nonnegative().optional(),
});

export default defineTask({
  meta: {
    name: "db:cohort",
    description: "Fetch and store a new cohort snapshot",
  },
  async run({ payload }) {
    const snapshotRepository = SnapshotRepository.getInstance();
    const developerRepository = DeveloperRepository.getInstance();

    const safePayload = payloadSchema.parse(payload);

    if (safePayload.msDuration) {
      const durationMs = safePayload.msDuration;

      const lastSnapshot = await snapshotRepository.findLatest();

      if (lastSnapshot) {
        const lastTime = new Date(lastSnapshot.createdAt).getTime();
        const timeSinceLastSnapshot = Date.now() - lastTime;

        if (timeSinceLastSnapshot < durationMs) {
          const daysSince = Math.floor(timeSinceLastSnapshot / (1000 * 60 * 60 * 24));
          const durationDays = Math.floor(durationMs / (1000 * 60 * 60 * 24));
          return {
            result: {
              skipped: true,
              message: `[${lastSnapshot.id}] Cohort snapshot taken ${daysSince} days ago, which is within the specified duration of ${durationDays} days.`,
            },
          };
        }
      }
    }

    const { names, snapshotId } = await $fetch("/api/getCohort");

    const cohortDevs: Record<string, CohortUser> = await getGithubClient().call(parse(buildUsersQuery(names)), {});

    const rows = Object.values(cohortDevs).map((user: CohortUser) => ({
      id: nanoid(),
      username: user.login,
      githubId: user.id,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
    }));

    const insertedDevs = await developerRepository.insertMany(rows);

    const developers = await developerRepository.listByUsernames(names);

    const pullRequestStats = (
      await Promise.all(
        developers.map(developer => ensurePullRequestStats(developer, {
          cohortSnapshotSourceId: snapshotId,
        })),
      )
    ).filter((stats): stats is PullRequestStatsResponse => stats !== null);

    return {
      result: {
        skipped: false,
        message: `Cohort snapshot created with ${insertedDevs.length} new developers. Fetched PR stats for ${pullRequestStats.length} developers.`,
      },
    };
  },
});
