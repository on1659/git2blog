import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const posts = sqliteTable("posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").unique().notNull(),
  githubUrl: text("github_url"),
  status: text("status", { enum: ["draft", "published"] })
    .notNull()
    .default("draft"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const postVersions = sqliteTable("post_versions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  postId: integer("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  language: text("language", { enum: ["ko", "en"] }).notNull(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  body: text("body").notNull().default(""),
  tags: text("tags").notNull().default("[]"),
  coverImage: text("cover_image"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const publications = sqliteTable("publications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  postVersionId: integer("post_version_id")
    .notNull()
    .references(() => postVersions.id, { onDelete: "cascade" }),
  platformId: text("platform_id").notNull(),
  platformPostId: text("platform_post_id"),
  url: text("url"),
  isDraft: integer("is_draft", { mode: "boolean" }).notNull().default(false),
  isLive: integer("is_live", { mode: "boolean" }).default(true),
  lastCheckedAt: text("last_checked_at"),
  publishedAt: text("published_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const platformCredentials = sqliteTable("platform_credentials", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  platformId: text("platform_id").unique().notNull(),
  credentials: text("credentials").notNull().default("{}"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const commitCache = sqliteTable("commit_cache", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  githubUrl: text("github_url").notNull(),
  commits: text("commits").notNull().default("[]"),
  fetchedAt: text("fetched_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});
