import { RowDataPacket } from "mysql2";
import { getDbPool } from "@/src/server/db/pool";

type PingRow = RowDataPacket & {
  ok: number;
};

export async function pingDatabase(): Promise<boolean> {
  const pool = getDbPool();
  const [rows] = await pool.query<PingRow[]>("SELECT 1 AS ok");
  return rows[0]?.ok === 1;
}
