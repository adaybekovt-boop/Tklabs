import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  termsAccepted: integer("terms_accepted", { mode: "boolean" }).notNull().default(false),
  termsAcceptedAt: integer("terms_accepted_at", { mode: "timestamp_ms" }),
  termsVersion: text("terms_version"),
  language: text("language", { enum: ["ru", "en"] }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});
