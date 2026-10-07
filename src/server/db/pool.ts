import mysql, { type Pool } from "mysql2/promise";
import { readEnv } from "@/src/server/env";

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (pool) {
    return pool;
  }

  const env = readEnv();
  pool = mysql.createPool({
    host: env.BF3_STATS_DB_HOST,
    port: env.BF3_STATS_DB_PORT,
    user: env.BF3_STATS_DB_USER,
    password: env.BF3_STATS_DB_PASS,
    database: env.BF3_STATS_DB_NAME,
    // DATETIME values carry no time zone (logger: Procon host clock; AdKats:
    // UTC), so they are returned as the stored strings.
    dateStrings: true,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  return pool;
}
