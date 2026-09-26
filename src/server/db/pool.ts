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
    // DATETIME values carry no zone: the logger's are on the Procon host's clock, AdKats' in UTC.
    dateStrings: true,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  // mysql2 escapes values with backslashes, which NO_BACKSLASH_ESCAPES turns into plain characters.
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
