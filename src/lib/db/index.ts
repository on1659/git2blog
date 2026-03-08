import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const globalForDb = globalThis as unknown as {
  __db?: ReturnType<typeof drizzle<typeof schema>>;
  __sqlite?: InstanceType<typeof Database>;
};

function createDb() {
  if (globalForDb.__db) return globalForDb.__db;

  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, "git2blog.db");
  const sqlite = new Database(dbPath);

  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("foreign_keys = ON");

  // Auto-create tables
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      github_url TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS post_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      language TEXT NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT,
      body TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]',
      cover_image TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(post_id, language)
    );

    CREATE TABLE IF NOT EXISTS publications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_version_id INTEGER NOT NULL REFERENCES post_versions(id) ON DELETE CASCADE,
      platform_id TEXT NOT NULL,
      platform_post_id TEXT,
      url TEXT,
      is_draft INTEGER NOT NULL DEFAULT 0,
      is_live INTEGER DEFAULT 1,
      last_checked_at TEXT,
      published_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS platform_credentials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform_id TEXT UNIQUE NOT NULL,
      credentials TEXT NOT NULL DEFAULT '{}',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS commit_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      github_url TEXT NOT NULL,
      commits TEXT NOT NULL DEFAULT '[]',
      fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // 마이그레이션: publications에 새 컬럼 추가 (기존 DB 호환)
  try {
    sqlite.exec(`ALTER TABLE publications ADD COLUMN is_live INTEGER DEFAULT 1`);
  } catch { /* 이미 존재 */ }
  try {
    sqlite.exec(`ALTER TABLE publications ADD COLUMN last_checked_at TEXT`);
  } catch { /* 이미 존재 */ }

  globalForDb.__sqlite = sqlite;
  globalForDb.__db = drizzle(sqlite, { schema });
  return globalForDb.__db;
}

export const db = createDb();
