import postgres from "postgres";

export async function ensureTables() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return;

  const sql = postgres(connectionString, { max: 1 });

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        github_url TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS post_versions (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        language TEXT NOT NULL,
        title TEXT NOT NULL,
        subtitle TEXT,
        body TEXT NOT NULL DEFAULT '',
        tags TEXT NOT NULL DEFAULT '[]',
        cover_image TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(post_id, language)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS publications (
        id SERIAL PRIMARY KEY,
        post_version_id INTEGER NOT NULL REFERENCES post_versions(id) ON DELETE CASCADE,
        platform_id TEXT NOT NULL,
        platform_post_id TEXT,
        url TEXT,
        is_draft BOOLEAN NOT NULL DEFAULT FALSE,
        is_live BOOLEAN DEFAULT TRUE,
        last_checked_at TIMESTAMP,
        published_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS platform_credentials (
        id SERIAL PRIMARY KEY,
        platform_id TEXT UNIQUE NOT NULL,
        credentials TEXT NOT NULL DEFAULT '{}',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS commit_cache (
        id SERIAL PRIMARY KEY,
        github_url TEXT NOT NULL,
        commits TEXT NOT NULL DEFAULT '[]',
        fetched_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;

    console.log("[db] Tables ensured");
  } catch (e) {
    console.error("[db] Migration error:", e);
  } finally {
    await sql.end();
  }
}
