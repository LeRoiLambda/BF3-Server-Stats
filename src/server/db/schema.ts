import { RowDataPacket } from "mysql2";
import { getDbPool } from "@/src/server/db/pool";

const tableAvailabilityCache = new Map<string, boolean>();

export async function hasTable(tableName: string): Promise<boolean> {
  const normalizedName = tableName.trim();
  if (!normalizedName) {
    return false;
  }

  const cached = tableAvailabilityCache.get(normalizedName);
  if (cached !== undefined) {
    return cached;
  }

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

  const available = rows.length > 0;
  tableAvailabilityCache.set(normalizedName, available);
  return available;
}

