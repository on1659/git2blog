const postgres = require("postgres");
const Database = require("better-sqlite3");

async function migrate() {
  const sql = postgres(
    process.env.DATABASE_URL ||
      "postgresql://postgres:gwllvVNKhoimBwlHSUyBiXzJDVMMrOAA@switchyard.proxy.rlwy.net:40273/railway",
    { max: 1 }
  );

  // Create tables
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS posts (
      id SERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      github_url TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
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
    );
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
    );
    CREATE TABLE IF NOT EXISTS platform_credentials (
      id SERIAL PRIMARY KEY,
      platform_id TEXT UNIQUE NOT NULL,
      credentials TEXT NOT NULL DEFAULT '{}',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS commit_cache (
      id SERIAL PRIMARY KEY,
      github_url TEXT NOT NULL,
      commits TEXT NOT NULL DEFAULT '[]',
      fetched_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  console.log("Tables created");

  // Read from SQLite
  const sdb = new Database("data/git2blog.db");

  // Posts
  const posts = sdb.prepare("SELECT * FROM posts").all();
  for (const p of posts) {
    await sql`INSERT INTO posts (id, slug, github_url, status, created_at, updated_at) VALUES
      (${p.id}, ${p.slug}, ${p.github_url}, ${p.status}, ${p.created_at}, ${p.updated_at})
    ON CONFLICT (id) DO NOTHING`;
  }
  await sql.unsafe("SELECT setval('posts_id_seq', (SELECT COALESCE(MAX(id),1) FROM posts))");
  console.log(`Posts: ${posts.length}`);

  // Post versions
  const versions = sdb.prepare("SELECT * FROM post_versions").all();
  for (const v of versions) {
    await sql`INSERT INTO post_versions (id, post_id, language, title, subtitle, body, tags, cover_image, created_at, updated_at) VALUES
      (${v.id}, ${v.post_id}, ${v.language}, ${v.title}, ${v.subtitle}, ${v.body}, ${v.tags}, ${v.cover_image}, ${v.created_at}, ${v.updated_at})
    ON CONFLICT (id) DO NOTHING`;
  }
  await sql.unsafe("SELECT setval('post_versions_id_seq', (SELECT COALESCE(MAX(id),1) FROM post_versions))");
  console.log(`Versions: ${versions.length}`);

  // Publications
  const pubs = sdb.prepare("SELECT * FROM publications").all();
  for (const p of pubs) {
    await sql`INSERT INTO publications (id, post_version_id, platform_id, platform_post_id, url, is_draft, is_live, last_checked_at, published_at) VALUES
      (${p.id}, ${p.post_version_id}, ${p.platform_id}, ${p.platform_post_id}, ${p.url}, ${!!p.is_draft}, ${!!p.is_live}, ${p.last_checked_at}, ${p.published_at})
    ON CONFLICT (id) DO NOTHING`;
  }
  await sql.unsafe("SELECT setval('publications_id_seq', (SELECT COALESCE(MAX(id),1) FROM publications))");
  console.log(`Publications: ${pubs.length}`);

  // Credentials
  const creds = sdb.prepare("SELECT * FROM platform_credentials").all();
  for (const c of creds) {
    await sql`INSERT INTO platform_credentials (id, platform_id, credentials, is_active, created_at) VALUES
      (${c.id}, ${c.platform_id}, ${c.credentials}, ${!!c.is_active}, ${c.created_at})
    ON CONFLICT (platform_id) DO NOTHING`;
  }
  await sql.unsafe("SELECT setval('platform_credentials_id_seq', (SELECT COALESCE(MAX(id),1) FROM platform_credentials))");
  console.log(`Credentials: ${creds.length}`);

  sdb.close();
  await sql.end();
  console.log("Migration complete!");
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
