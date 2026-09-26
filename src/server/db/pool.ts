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
  // mysql2 escapes query values with backslashes. A server whose sql_mode has
  // NO_BACKSLASH_ESCAPES reads a backslash as a plain character, so a quote in
  // a value would end its string and the rest would run as SQL. Each new
  // connection takes that mode out of its session before its first query, or
  // is closed.
  pool.pool.on("connection", (connection) => {
    connection.query(
      `SET SESSION sql_mode = TRIM(BOTH ',' FROM
        REPLACE(CONCAT(',', @@SESSION.sql_mode, ','), ',NO_BACKSLASH_ESCAPES,', ','))`,
      (error) => {
        if (error) {
          console.error(`Closing a connection that kept NO_BACKSLASH_ESCAPES: ${error.message}`);
          connection.destroy();
        }
      }
    );
  });

  return pool;
}
