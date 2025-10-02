import { defineTask } from "nitropack/runtime";
import { getGithubClient } from "~~/server/githubClient";
import { parse } from "graphql";
import { nanoid } from "nanoid";
import { developper } from "~~/database/schema";
import { useDrizzle } from "~~/database/client";

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

export default defineTask({
  meta: {
    name: "db:cohort",
    description: "Fetch and store a new cohort snapshot",
  },
  async run() {
    const { names } = await $fetch("/api/getCohort");

    const cohortDevs: Record<string, CohortUser> = await getGithubClient().call(parse(buildUsersQuery(names)), {});
    const db = useDrizzle();

    const rows = Object.values(cohortDevs).map((user: CohortUser) => ({
      id: nanoid(),
      username: user.login,
      githubId: user.id,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
    }));

    const insertedDevs = await db.insert(developper).values(rows).returning().onConflictDoNothing();

    return {
      result: {
        names,
        insertedDevs,
      },
    };
  },
});
