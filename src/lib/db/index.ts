import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { ensureTables } from "./migrate";

type DbType = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as {
  __db?: DbType;
  __sql?: ReturnType<typeof postgres>;
  __migrated?: boolean;
};

function getDb(): DbType {
  if (globalForDb.__db) return globalForDb.__db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // Build time — return a proxy that throws on actual use
    return new Proxy({} as DbType, {
      get(_, prop) {
        if (prop === "then") return undefined;
        throw new Error("DATABASE_URL 환경변수가 설정되지 않았습니다");
      },
    });
  }

  const sql = postgres(connectionString, { max: 10 });
  globalForDb.__sql = sql;
  globalForDb.__db = drizzle(sql, { schema });

  // Auto-create tables on first connection
  if (!globalForDb.__migrated) {
    globalForDb.__migrated = true;
    ensureTables().catch(console.error);
  }

  return globalForDb.__db;
}

export const db = getDb();
