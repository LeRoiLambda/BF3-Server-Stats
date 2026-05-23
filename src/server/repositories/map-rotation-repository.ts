import { RowDataPacket } from "mysql2";
import { getDbPool } from "@/src/server/db/pool";
import { buildServerScopeCondition } from "@/src/server/repositories/server-scope";
import { toDateTimeString } from "@/src/server/utils/dates";

export type MapRotationEntry = {
  serverId: number;
  serverName: string | null;
  mapIndex: number;
  mapCode: string;
  gamemode: string;
  rounds: number;
  isCurrent: boolean;
  isNext: boolean;
  currentRound: number;
  totalRounds: number;
  updatedAt: string | null;
};

type MapRotationRow = RowDataPacket & {
  serverId: number;
  serverName: string | null;
  mapIndex: number;
  mapCode: string;
  gamemode: string;
  rounds: number | null;
  isCurrent: number | boolean | null;
  isNext: number | boolean | null;
  currentRound: number | null;
  totalRounds: number | null;
  updatedAt: string | Date | null;
};

export async function listServerMapRotation(input: {
  serverId?: number;
  serverIds?: number[];
}): Promise<MapRotationEntry[]> {
  const pool = getDbPool();
  const scope = buildServerScopeCondition("ml.server_id", input);
  const [rows] = await pool.query<MapRotationRow[]>(
    `
      SELECT
        ml.server_id AS serverId,
        ts.ServerName AS serverName,
        ml.map_index AS mapIndex,
        ml.map_file AS mapCode,
        ml.map_mode AS gamemode,
        ml.map_rounds AS rounds,
        ml.map_current AS isCurrent,
        ml.map_next AS isNext,
        ml.map_round_current AS currentRound,
        ml.map_round_total AS totalRounds,
        ml.maplist_time AS updatedAt
      FROM adkats_maplist ml
      LEFT JOIN tbl_server ts ON ts.ServerID = ml.server_id
      WHERE ${scope.sql}
      ORDER BY ml.server_id ASC, ml.map_index ASC
    `,
    scope.params
  );

  return rows.map((row) => ({
    serverId: Number(row.serverId),
    serverName: row.serverName ?? null,
    mapIndex: Number(row.mapIndex),
    mapCode: row.mapCode,
    gamemode: row.gamemode,
    rounds: Number(row.rounds ?? 0),
    isCurrent: Boolean(row.isCurrent),
    isNext: Boolean(row.isNext),
    currentRound: Number(row.currentRound ?? 0),
    totalRounds: Number(row.totalRounds ?? 0),
    updatedAt: toDateTimeString(row.updatedAt)
  }));
}
