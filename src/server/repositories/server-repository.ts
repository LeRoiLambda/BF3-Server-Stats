import { RowDataPacket } from "mysql2";
import { getDbPool } from "@/src/server/db/pool";

export type ActiveServer = {
  gameId: number;
  serverId: number;
  serverName: string;
  mapName: string | null;
  gameMode: string | null;
  maxSlots: number;
  usedSlots: number;
  connectionState: string | null;
};

type ActiveServerRow = RowDataPacket & {
  gameId: number;
  serverId: number;
  serverName: string;
  mapName: string | null;
  gameMode: string | null;
  maxSlots: number;
  usedSlots: number;
  connectionState: string | null;
};

export type LegacyServerContext = {
  gameId: number | null;
  servers: ActiveServer[];
  validIdsCsv: string;
};

export async function listActiveServers(): Promise<ActiveServer[]> {
  const pool = getDbPool();

  const [rows] = await pool.query<ActiveServerRow[]>(
    `
      SELECT
        tg.GameID AS gameId,
        ts.ServerID AS serverId,
        ts.ServerName AS serverName,
        ts.mapName AS mapName,
        ts.Gamemode AS gameMode,
        ts.maxSlots AS maxSlots,
        ts.usedSlots AS usedSlots,
        ts.ConnectionState AS connectionState
      FROM tbl_games tg
      INNER JOIN tbl_server ts ON ts.GameID = tg.GameID
      WHERE tg.Name = 'BF3'
        AND (ts.ConnectionState IS NULL OR ts.ConnectionState = 'on')
      ORDER BY ts.ServerName ASC
    `
  );

  return rows.map((row) => ({
    gameId: row.gameId,
    serverId: row.serverId,
    serverName: row.serverName,
    mapName: row.mapName,
    gameMode: row.gameMode,
    maxSlots: Number(row.maxSlots ?? 0),
    usedSlots: Number(row.usedSlots ?? 0),
    connectionState: row.connectionState
  }));
}

export async function getLegacyServerContext(): Promise<LegacyServerContext> {
  const servers = await listActiveServers();
  const gameId = servers[0]?.gameId ?? null;
  const validIdsCsv = servers.map((server) => server.serverId).join(",");

  return {
    gameId,
    servers,
    validIdsCsv
  };
}

export async function getActiveServerById(
  serverId: number
): Promise<ActiveServer | null> {
  const servers = await listActiveServers();
  return servers.find((server) => server.serverId === serverId) ?? null;
}
