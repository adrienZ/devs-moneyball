import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

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
