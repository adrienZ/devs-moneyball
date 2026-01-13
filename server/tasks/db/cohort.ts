import { defineTask } from "nitropack/runtime";
import { getGithubClient } from "~~/server/githubClient";
import { parse } from "graphql";
import { nanoid } from "nanoid";
import { ensurePullRequestStats } from "~~/server/services/pullRequestStatsService";
import type { PullRequestStatsResponse } from "~~/server/services/pullRequestStatsService";
import { z } from "zod";
import { DeveloperRepository } from "~~/server/repositories/developerRepository";
import { SnapshotRepository } from "~~/server/repositories/snapshotRepository";
import { ratingsConfig } from "~~/server/core/ratings/ratings.config";

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

function chunkLogins(logins: string[], size: number): string[][] {
  if (size <= 0) return [logins];
  const chunks: string[][] = [];
  for (let i = 0; i < logins.length; i += size) {
    chunks.push(logins.slice(i, i + size));
  }
  return chunks;
}

function isCohortUser(user: CohortUser | null | undefined): user is CohortUser {
  return !!user;
}

async function fetchCohortUsers(logins: string[]): Promise<CohortUser[]> {
  const githubClient = getGithubClient();
  const chunks = chunkLogins(logins, 50);
  const users: CohortUser[] = [];

  for (const chunk of chunks) {
    try {
      const cohortDevs: Record<string, CohortUser | null> = await githubClient.call(
        parse(buildUsersQuery(chunk)),
        {},
      );
      users.push(...Object.values(cohortDevs).filter(isCohortUser));
    }
    catch {
      for (const login of chunk) {
        try {
          const cohortDevs: Record<string, CohortUser | null> = await githubClient.call(
            parse(buildUsersQuery([login])),
            {},
          );
          users.push(...Object.values(cohortDevs).filter(isCohortUser));
        }
        catch {
          // Ignore invalid logins and continue.
        }
      }
    }
  }

  return users;
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

    const { names } = await $fetch("/api/getGithubStarsName");
    const cohortLogins = names;

    const users = await fetchCohortUsers(cohortLogins);
    const resolvedLogins = users.map(user => user.login);

    const rows = users.map(user => ({
      id: nanoid(),
      username: user.login,
      githubId: user.id,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
    }));

    const insertedDevs = await developerRepository.insertMany(rows);

    const snapshotId = await snapshotRepository.createSnapshotWithNames({
      count: resolvedLogins.length,
      names: resolvedLogins,
      timestamp: new Date().toISOString(),
      pullRequestFrequencyLookbackWeeks: ratingsConfig.lookbackWeeks,
    });
    const developers = await developerRepository.listByUsernames(resolvedLogins);

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
