import { RowDataPacket } from "mysql2";
import { getDbPool } from "@/src/server/db/pool";
import {
  buildServerScopeCondition,
  normalizeServerScopeInput,
  type ServerScopeInput
} from "@/src/server/repositories/server-scope";
import { toFixedNumber } from "@/src/server/utils/numbers";
import { toDateTimeString } from "@/src/server/utils/dates";

export type ServerDetailStats = {
  countPlayers: number;
  totalKills: number;
  totalDeaths: number;
  totalRounds: number;
  averageScore: number;
  averageKills: number;
  averageHeadshots: number;
  averageDeaths: number;
  averageSuicides: number;
  averageTeamKills: number;
  averageKdr: number;
  averageHsr: number;
};

export type ServerRoundSnapshot = {
  serverId: number;
  serverName: string | null;
  startedAt: string | null;
  mapCode: string;
  gamemode: string;
  minPlayers: number;
  averagePlayers: number;
  maxPlayers: number;
  joinedPlayers: number;
  leftPlayers: number;
};

export type ServerDailyPlayersSnapshot = {
  date: string;
  averagePlayers: number;
};

type ServerDetailStatsRow = RowDataPacket & {
  countPlayers: number | null;
  totalKills: number | null;
  totalDeaths: number | null;
  totalRounds: number | null;
  averageScore: number | null;
  averageKills: number | null;
  averageHeadshots: number | null;
  averageDeaths: number | null;
  averageSuicides: number | null;
  averageTeamKills: number | null;
  averageKdr: number | null;
  averageHsr: number | null;
};

type ServerRoundSnapshotRow = RowDataPacket & {
  serverId: number;
  serverName: string | null;
  startedAt: string | null;
  mapCode: string;
  gamemode: string;
  minPlayers: number | null;
  averagePlayers: number | null;
  maxPlayers: number | null;
  joinedPlayers: number | null;
  leftPlayers: number | null;
};

type ServerDailyPlayersSnapshotRow = RowDataPacket & {
  dateValue: string | Date | null;
  averagePlayers: number | null;
};

export async function getServerDetailStats(
  input: number | ServerScopeInput
): Promise<ServerDetailStats | null> {
  const pool = getDbPool();
  const scopeInput = normalizeServerScopeInput(input);
  const scope = buildServerScopeCondition("ServerID", scopeInput);
  const hasAllServersScope = (scopeInput.serverIds?.length ?? 0) > 0;
  const [rows] = await pool.query<ServerDetailStatsRow[]>(
    hasAllServersScope
      ? `
        SELECT
          SUM(CountPlayers) AS countPlayers,
          SUM(SumKills) AS totalKills,
          SUM(SumDeaths) AS totalDeaths,
          SUM(SumRounds) AS totalRounds,
          (SUM(SumScore) / NULLIF(SUM(CountPlayers), 0)) AS averageScore,
          (SUM(SumKills) / NULLIF(SUM(CountPlayers), 0)) AS averageKills,
          (SUM(SumHeadshots) / NULLIF(SUM(CountPlayers), 0)) AS averageHeadshots,
          (SUM(SumDeaths) / NULLIF(SUM(CountPlayers), 0)) AS averageDeaths,
          (SUM(SumSuicide) / NULLIF(SUM(CountPlayers), 0)) AS averageSuicides,
          (SUM(SumTKs) / NULLIF(SUM(CountPlayers), 0)) AS averageTeamKills,
          (SUM(SumKills) / NULLIF(SUM(SumDeaths), 0)) AS averageKdr,
          ((SUM(SumHeadshots) / NULLIF(SUM(SumKills), 0)) * 100) AS averageHsr
        FROM tbl_server_stats
        WHERE ${scope.sql}
      `
      : `
        SELECT
          CountPlayers AS countPlayers,
          SumKills AS totalKills,
          SumDeaths AS totalDeaths,
          SumRounds AS totalRounds,
          AvgScore AS averageScore,
          AvgKills AS averageKills,
          AvgHeadshots AS averageHeadshots,
          AvgDeaths AS averageDeaths,
          AvgSuicide AS averageSuicides,
          AvgTKs AS averageTeamKills,
          (SumKills / NULLIF(SumDeaths, 0)) AS averageKdr,
          ((SumHeadshots / NULLIF(SumKills, 0)) * 100) AS averageHsr
        FROM tbl_server_stats
        WHERE ${scope.sql}
        LIMIT 1
      `,
    scope.params
  );

  const row = rows[0];
  if (!row || row.countPlayers === null || row.countPlayers === undefined) {
    return null;
  }

  return {
    countPlayers: Number(row.countPlayers ?? 0),
    totalKills: Number(row.totalKills ?? 0),
    totalDeaths: Number(row.totalDeaths ?? 0),
    totalRounds: Number(row.totalRounds ?? 0),
    averageScore: toFixedNumber(row.averageScore),
    averageKills: toFixedNumber(row.averageKills),
    averageHeadshots: toFixedNumber(row.averageHeadshots),
    averageDeaths: toFixedNumber(row.averageDeaths),
    averageSuicides: toFixedNumber(row.averageSuicides),
    averageTeamKills: toFixedNumber(row.averageTeamKills),
    averageKdr: toFixedNumber(row.averageKdr),
    averageHsr: toFixedNumber(row.averageHsr)
  };
}

export async function listRecentServerRounds(
  input: number | ServerScopeInput,
  limit = 15
): Promise<ServerRoundSnapshot[]> {
  const pool = getDbPool();
  const boundedLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const scope = buildServerScopeCondition("ms.ServerID", input);
  const [rows] = await pool.query<ServerRoundSnapshotRow[]>(
    `
      SELECT
        ms.ServerID AS serverId,
        ts.ServerName AS serverName,
        ms.TimeRoundStarted AS startedAt,
        ms.MapName AS mapCode,
        ms.Gamemode AS gamemode,
        ms.MinPlayers AS minPlayers,
        ms.AvgPlayers AS averagePlayers,
        ms.MaxPlayers AS maxPlayers,
        ms.PlayersJoinedServer AS joinedPlayers,
        ms.PlayersLeftServer AS leftPlayers
      FROM tbl_mapstats ms
      LEFT JOIN tbl_server ts ON ts.ServerID = ms.ServerID
      WHERE ${scope.sql}
      ORDER BY ms.TimeRoundStarted DESC
      LIMIT ?
    `,
    [...scope.params, boundedLimit]
  );

  return rows.map((row) => ({
    serverId: Number(row.serverId),
    serverName: row.serverName ?? null,
    startedAt: toDateTimeString(row.startedAt),
    mapCode: row.mapCode,
    gamemode: row.gamemode,
    minPlayers: Number(row.minPlayers ?? 0),
    averagePlayers: toFixedNumber(row.averagePlayers),
    maxPlayers: Number(row.maxPlayers ?? 0),
    joinedPlayers: Number(row.joinedPlayers ?? 0),
    leftPlayers: Number(row.leftPlayers ?? 0)
  }));
}

export async function listServerDailyPlayerTrend(
  input: number | ServerScopeInput,
  limit = 7
): Promise<ServerDailyPlayersSnapshot[]> {
  const pool = getDbPool();
  const boundedLimit = Math.max(1, Math.min(31, Math.floor(limit)));
  const scope = buildServerScopeCondition("ServerID", input);
  const [rows] = await pool.query<ServerDailyPlayersSnapshotRow[]>(
    `
      SELECT
        DATE(TimeMapLoad) AS dateValue,
        AVG(MaxPlayers) AS averagePlayers
      FROM tbl_mapstats
      WHERE ${scope.sql}
        AND Gamemode != ''
        AND MapName != ''
      GROUP BY DATE(TimeMapLoad)
      ORDER BY DATE(TimeMapLoad) DESC
      LIMIT ?
    `,
    [...scope.params, boundedLimit]
  );

  return rows.map((row) => ({
    date:
      row.dateValue instanceof Date
        ? row.dateValue.toISOString().slice(0, 10)
        : String(row.dateValue ?? ""),
    averagePlayers: toFixedNumber(row.averagePlayers)
  }));
}
