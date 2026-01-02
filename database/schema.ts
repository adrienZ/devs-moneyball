import {
  pgTable,
  uuid,
  timestamp,
  integer,
  text,
  serial,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { randomUUID } from "node:crypto";

// No withTimezone, keep mode:"string" so we read/write ISO strings cleanly in pglite
const defaultDateColumns = {
  createdAt: timestamp({ mode: "string" })
    .$defaultFn(() => new Date().toISOString())
    .notNull(),
  updatedAt: timestamp({ mode: "string" }),
  deletedAt: timestamp({ mode: "string" }),
};

export const snapshots = pgTable(
  "cohorts_snapshots",
  {
    id: uuid()
      .$defaultFn(() => randomUUID())
      .primaryKey(),
    count: integer().notNull(),
    ...defaultDateColumns,
  },
);

export const snapshotNames = pgTable(
  "cohorts_snapshot_names",
  {
    id: serial().primaryKey(),
    snapshotId: uuid()
      .notNull()
      .references(() => snapshots.id, { onDelete: "cascade" }),
    name: text().unique().notNull(),
    ...defaultDateColumns,
  },
  t => ({
    bySnapshotIdx: index("cohorts_snapshot_names_snapshot_idx").on(t.snapshotId),
  }),
);

// (optional) helpers
export const snapshotsRelations = relations(snapshots, ({ many }) => ({
  names: many(snapshotNames),
}));

export const snapshotNamesRelations = relations(snapshotNames, ({ one }) => ({
  snapshot: one(snapshots, {
    fields: [snapshotNames.snapshotId],
    references: [snapshots.id],
  }),
}));

export const developper = pgTable("developper", {
  id: text().primaryKey(),
  username: text().notNull(),
  githubId: text().notNull().unique(),
  avatarUrl: text().notNull(),
  bio: text(),
  ...defaultDateColumns,
});

export const githubPullRequestStats = pgTable(
  "github_pull_request_stats",
  {
    id: uuid()
      .$defaultFn(() => randomUUID())
      .primaryKey(),
    developerId: text()
      .notNull()
      .references(() => developper.id, { onDelete: "cascade" }),
    cohortSnapshotSourceId: uuid().references(() => snapshots.id, { onDelete: "set null" }),
    totalPullRequestContributions: integer().notNull(),
    totalPullRequestReviewContributions: integer().notNull(),
    pullRequestsTotalCount: integer().notNull(),
    pullRequestsWeeklyCount: integer().notNull(),
    pullRequestsWeeklyCap: integer().notNull(),
    mergedPullRequestsTotalCount: integer().notNull(),
    closedPullRequestsTotalCount: integer().notNull(),
    openPullRequestsTotalCount: integer().notNull(),
    ...defaultDateColumns,
  },
  table => ({
    developerUnique: uniqueIndex("github_pull_request_stats_developer_id_uk").on(
      table.developerId,
    ),
    cohortSnapshotIdx: index("github_pull_request_stats_cohort_snapshot_idx").on(
      table.cohortSnapshotSourceId,
    ),
  }),
);
