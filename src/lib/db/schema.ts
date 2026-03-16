import { pgTable, serial, text, boolean, timestamp, unique } from "drizzle-orm/pg-core";

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  slug: text("slug").unique().notNull(),
  githubUrl: text("github_url"),
  category: text("category").notNull().default("general"),
  status: text("status", { enum: ["draft", "published"] })
    .notNull()
    .default("draft"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const postVersions = pgTable("post_versions", {
  id: serial("id").primaryKey(),
  postId: serial("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  language: text("language", { enum: ["ko", "en"] }).notNull(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  body: text("body").notNull().default(""),
  tags: text("tags").notNull().default("[]"),
  coverImage: text("cover_image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  unique("post_versions_post_id_language_unique").on(table.postId, table.language),
]);

export const publications = pgTable("publications", {
  id: serial("id").primaryKey(),
  postVersionId: serial("post_version_id")
    .notNull()
    .references(() => postVersions.id, { onDelete: "cascade" }),
  platformId: text("platform_id").notNull(),
  platformPostId: text("platform_post_id"),
  url: text("url"),
  isDraft: boolean("is_draft").notNull().default(false),
  isLive: boolean("is_live").default(true),
  lastCheckedAt: timestamp("last_checked_at"),
  publishedAt: timestamp("published_at").notNull().defaultNow(),
});

export const platformCredentials = pgTable("platform_credentials", {
  id: serial("id").primaryKey(),
  platformId: text("platform_id").unique().notNull(),
  credentials: text("credentials").notNull().default("{}"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const commitCache = pgTable("commit_cache", {
  id: serial("id").primaryKey(),
  githubUrl: text("github_url").notNull(),
  commits: text("commits").notNull().default("[]"),
  fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
});
