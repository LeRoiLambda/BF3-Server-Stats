import { RowDataPacket } from "mysql2";
import { getDbPool } from "@/src/server/db/pool";

// Schema and data availability checks are cached for a minute, so optional
// tables that are added or dropped while the app runs (such as AdKats') are
// picked up.
const SCHEMA_CACHE_TTL_MS = 60_000;

type CachedSchemaFlag = {
  value: boolean;
  expiresAt: number;
};

const schemaFlagCache = new Map<string, CachedSchemaFlag>();

async function cachedSchemaFlag(
  key: string,
  load: () => Promise<boolean>
): Promise<boolean> {
  const cached = schemaFlagCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const value = await load();
  schemaFlagCache.set(key, {
    value,
    expiresAt: Date.now() + SCHEMA_CACHE_TTL_MS
  });
  return value;
}

export async function hasTable(tableName: string): Promise<boolean> {
  const normalizedName = tableName.trim();
  if (!normalizedName) {
    return false;
  }

  return cachedSchemaFlag(`table:${normalizedName}`, async () => {
    const pool = getDbPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
        LIMIT 1
      `,
      [normalizedName]
    );

    return rows.length > 0;
  });
}

export async function hasColumn(
  tableName: string,
  columnName: string
): Promise<boolean> {
  const normalizedTable = tableName.trim();
  const normalizedColumn = columnName.trim();
  if (!normalizedTable || !normalizedColumn) {
    return false;
  }

  return cachedSchemaFlag(
    `column:${normalizedTable}.${normalizedColumn}`,
    async () => {
      const pool = getDbPool();
      const [rows] = await pool.query<RowDataPacket[]>(
        `
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = ?
            AND COLUMN_NAME = ?
          LIMIT 1
        `,
        [normalizedTable, normalizedColumn]
      );

      return rows.length > 0;
    }
  );
}

// Whether the server has saved sessions. The stats logger saves them only
// when its "Session ON?" and "Save Sessiondata to DB?" settings are on, and
// each server's Procon layer has its own settings.
export async function hasServerSessions(serverId: number): Promise<boolean> {
  if (!(await hasTable("tbl_sessions"))) {
    return false;
  }

  return cachedSchemaFlag(`sessions:${serverId}`, async () => {
    const pool = getDbPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `
        SELECT 1 AS present
        FROM tbl_server_player tsp
        WHERE tsp.ServerID = ?
          AND EXISTS (SELECT 1 FROM tbl_sessions tss WHERE tss.StatsID = tsp.StatsID)
        LIMIT 1
      `,
      [serverId]
    );

    return rows.length > 0;
  });
}
