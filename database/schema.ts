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
    name: text().notNull(),
    position: integer().notNull(), // 0-based index on the page
    ...defaultDateColumns,
  },
  t => ({
    bySnapshotIdx: index("cohorts_snapshot_names_snapshot_idx").on(t.snapshotId),
    uniquePerSnapshotPosition: uniqueIndex(
      "cohorts_snapshot_names_snapshot_position_uk",
    ).on(t.snapshotId, t.position),
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
