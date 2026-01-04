import { ilike, inArray } from "drizzle-orm";
import { useDrizzle } from "~~/database/client";
import { developper } from "~~/database/schema";

type DrizzleClient = ReturnType<typeof useDrizzle>;
type DeveloperRecord = typeof developper.$inferSelect;
type DeveloperInsert = typeof developper.$inferInsert;

export class DeveloperRepository {
  private static instance: DeveloperRepository | null = null;

  static getInstance(): DeveloperRepository {
    if (!DeveloperRepository.instance) {
      DeveloperRepository.instance = new DeveloperRepository();
    }

    return DeveloperRepository.instance;
  }

  private get db(): DrizzleClient {
    return useDrizzle();
  }

  async findByUsername(username: string): Promise<DeveloperRecord | null> {
    const developerRecord = await this.db
      .select()
      .from(developper)
      // GitHub usernames are case-insensitive; match regardless of URL casing.
      .where(ilike(developper.username, username))
      .limit(1);

    return developerRecord.at(0) ?? null;
  }

  async upsertFromGithub(data: DeveloperInsert): Promise<DeveloperRecord | null> {
    const developer = await this.db
      .insert(developper)
      .values({
        id: data.id,
        githubId: data.githubId,
        username: data.username,
        bio: data.bio,
        avatarUrl: data.avatarUrl,
      })
      .onConflictDoUpdate({
        target: developper.githubId,
        set: {
          username: data.username,
          bio: data.bio,
          avatarUrl: data.avatarUrl,
        },
      })
      .returning()
      .execute()
      .then(rows => rows.at(0));

    return developer ?? null;
  }

  async insertMany(rows: DeveloperInsert[]): Promise<DeveloperRecord[]> {
    if (rows.length === 0) return [];
    return this.db
      .insert(developper)
      .values(rows)
      .returning()
      .onConflictDoNothing();
  }

  async listByUsernames(usernames: string[]): Promise<DeveloperRecord[]> {
    if (usernames.length === 0) return [];

    return this.db
      .select()
      .from(developper)
      .where(inArray(developper.username, usernames));
  }
}
