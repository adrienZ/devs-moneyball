import { date, integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

const defaultDatesColumns = {
  createdAt: timestamp({ mode: "string" })
    .$defaultFn(() => /* @__PURE__ */ new Date().toISOString())
    .notNull(),
  updatedAt: timestamp({ mode: "string" }),
  deletedAt: timestamp({ mode: "string" }),
};

export const developper = pgTable("developper", {
  id: text().primaryKey(),
  username: text().notNull(),
  githubId: text().notNull().unique(),
  avatarUrl: text().notNull(),
  bio: text(),
  ...defaultDatesColumns,
});

export const devActivity = pgTable("dev_activity", {
  devId: text("dev_id").notNull(),
  period: text("period").notNull(), // 'daily' | 'weekly' | 'yearly'
  periodStart: date("period_start").notNull(), // 'YYYY-MM-DD'
  prMergedRaw: integer("pr_merged_raw").notNull(),
  prMergedCapped: integer("pr_merged_capped").notNull(),
  capApplied: integer("cap_applied").notNull(),
  ...defaultDatesColumns,
}, t => ({
  pk: primaryKey({ columns: [t.devId, t.period, t.periodStart] }),
}));
