import { RowDataPacket } from "mysql2";
import { getDbPool } from "@/src/server/db/pool";

// Schema checks are cached for a minute, so optional tables that are added or
// dropped while the app runs (such as AdKats') are picked up.
const SCHEMA_CACHE_TTL_MS = 60_000;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9_]+$/;

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

export async function hasTableRows(tableName: string): Promise<boolean> {
  const normalizedName = tableName.trim();
  if (!IDENTIFIER_PATTERN.test(normalizedName) || !(await hasTable(normalizedName))) {
    return false;
  }

  return cachedSchemaFlag(`rows:${normalizedName}`, async () => {
    const pool = getDbPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 1 AS present FROM \`${normalizedName}\` LIMIT 1`
    );

    return rows.length > 0;
  });
}
