import { RowDataPacket } from "mysql2";
import { getDbPool } from "@/src/server/db/pool";
import { perAtLeastOneSql } from "@/src/server/db/ratios";
import {
  buildServerScopeCondition,
  type ServerScopeInput
} from "@/src/server/repositories/server-scope";
import { fromLoggerTime, toLoggerTime } from "@/src/server/utils/logger-clock";
import { toFixedNumber } from "@/src/server/utils/numbers";
import { datesInZone, dayStartInZone } from "@/src/server/utils/time-zones";

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
  startedAt: Date | null;
  mapCode: string;
  gamemode: string;
  minPlayers: number;
  averagePlayers: number;
  maxPlayers: number;
  joinedPlayers: number;
  leftPlayers: number;
};

// `date` is a "YYYY-MM-DD" date in the time zone the trend was read for.
export type ServerDailyPlayersSnapshot = {
  date: string;
  averagePlayers: number;
  peakPlayers: number;
  roundCount: number;
};

type ServerDetailStatsRow = RowDataPacket & {
  countPlayers: number | null;
  totalKills: number | null;
  totalDeaths: number | null;
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

type RoundCountRow = RowDataPacket & {
  totalRounds: number | null;
};

type LoggerDateRow = RowDataPacket & {
  loggerDate: string | null;
};

type ServerDailyPlayersSnapshotRow = RowDataPacket & {
  dayDate: string | null;
  averagePlayers: number | null;
  peakPlayers: number | null;
  roundCount: number | null;
};

// A day in some time zone, with its start and end on the logger's clock.
type ZoneDay = {
  date: string;
  start: string;
  end: string;
};

export async function getServerDetailStats(
  input: ServerScopeInput
): Promise<ServerDetailStats | null> {
  const pool = getDbPool();
  const scope = buildServerScopeCondition("ServerID", input);
  const playerScope = buildServerScopeCondition("tsp.ServerID", input);
  const hasAllServersScope = (input.serverIds?.length ?? 0) > 0;
  // Players on several servers count once: tbl_server_player has one row per
  // player and server.
  const statsQuery = pool.query<ServerDetailStatsRow[]>(
    hasAllServersScope
      ? `
        SELECT
          MAX(players.countPlayers) AS countPlayers,
          SUM(SumKills) AS totalKills,
          SUM(SumDeaths) AS totalDeaths,
          (SUM(SumScore) / NULLIF(MAX(players.countPlayers), 0)) AS averageScore,
          (SUM(SumKills) / NULLIF(MAX(players.countPlayers), 0)) AS averageKills,
          (SUM(SumHeadshots) / NULLIF(MAX(players.countPlayers), 0)) AS averageHeadshots,
          (SUM(SumDeaths) / NULLIF(MAX(players.countPlayers), 0)) AS averageDeaths,
          (SUM(SumSuicide) / NULLIF(MAX(players.countPlayers), 0)) AS averageSuicides,
          (SUM(SumTKs) / NULLIF(MAX(players.countPlayers), 0)) AS averageTeamKills,
          ${perAtLeastOneSql("SUM(SumKills)", "SUM(SumDeaths)")} AS averageKdr,
          ((SUM(SumHeadshots) / NULLIF(SUM(SumKills), 0)) * 100) AS averageHsr
        FROM tbl_server_stats
        CROSS JOIN (
          SELECT COUNT(DISTINCT tsp.PlayerID) AS countPlayers
          FROM tbl_server_player tsp
          WHERE ${playerScope.sql}
        ) players
        WHERE ${scope.sql}
      `
      : `
        SELECT
          CountPlayers AS countPlayers,
          SumKills AS totalKills,
          SumDeaths AS totalDeaths,
          AvgScore AS averageScore,
          AvgKills AS averageKills,
          AvgHeadshots AS averageHeadshots,
          AvgDeaths AS averageDeaths,
          AvgSuicide AS averageSuicides,
          AvgTKs AS averageTeamKills,
          ${perAtLeastOneSql("SumKills", "SumDeaths")} AS averageKdr,
          ((SumHeadshots / NULLIF(SumKills, 0)) * 100) AS averageHsr
        FROM tbl_server_stats
        WHERE ${scope.sql}
        LIMIT 1
      `,
    hasAllServersScope ? [...playerScope.params, ...scope.params] : scope.params
  );
  // Rounds played, as on the maps page: tbl_mapstats has a row per round,
  // while tbl_server_stats.SumRounds adds up every player's rounds.
  const roundsQuery = pool.query<RoundCountRow[]>(
    `
      SELECT COUNT(*) AS totalRounds
      FROM tbl_mapstats
      WHERE ${scope.sql}
        AND Gamemode != ''
        AND MapName != ''
    `,
    scope.params
  );
  const [[rows], [roundRows]] = await Promise.all([statsQuery, roundsQuery]);

  const row = rows[0];
  if (!row || row.countPlayers === null || row.countPlayers === undefined) {
    return null;
  }

  return {
    countPlayers: Number(row.countPlayers ?? 0),
    totalKills: Number(row.totalKills ?? 0),
    totalDeaths: Number(row.totalDeaths ?? 0),
    totalRounds: Number(roundRows[0]?.totalRounds ?? 0),
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
  input: ServerScopeInput,
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
    startedAt: fromLoggerTime(row.startedAt),
    mapCode: row.mapCode,
    gamemode: row.gamemode,
    minPlayers: Number(row.minPlayers ?? 0),
    averagePlayers: toFixedNumber(row.averagePlayers),
    maxPlayers: Number(row.maxPlayers ?? 0),
    joinedPlayers: Number(row.joinedPlayers ?? 0),
    leftPlayers: Number(row.leftPlayers ?? 0)
  }));
}

// A day in any time zone overlaps at most two days on the logger's clock, so
// the rounds of the latest 2n + 2 logger days with rounds hold at least n + 1
// such days with rounds. Only the earliest of those can start before them.
function loggerDateLimit(dayCount: number): number {
  return dayCount * 2 + 2;
}

// The days in `timeZone` that overlap the given days on the logger's clock.
export function daysOverlapping(loggerDates: string[], timeZone: string): ZoneDay[] {
  const dates = new Set<string>();

  for (const loggerDate of loggerDates) {
    const first = fromLoggerTime(`${loggerDate} 00:00:00`);
    const last = fromLoggerTime(`${loggerDate} 23:59:59`);
    if (first && last) {
      for (const date of datesInZone(first, last, timeZone)) {
        dates.add(date);
      }
    }
  }

  return Array.from(dates)
    .sort()
    .map((date) => ({
      date,
      start: toLoggerTime(dayStartInZone(date, timeZone)),
      end: toLoggerTime(dayStartInZone(date, timeZone, 1))
    }));
}

// The latest `limit` days in `timeZone` that had rounds.
export async function listServerDailyPlayerTrend(
  input: ServerScopeInput,
  limit: number,
  timeZone: string
): Promise<ServerDailyPlayersSnapshot[]> {
  const pool = getDbPool();
  const boundedLimit = Math.max(1, Math.min(31, Math.floor(limit)));
  const scope = buildServerScopeCondition("ServerID", input);
  const roundsSql = `
    ${scope.sql}
    AND Gamemode != ''
    AND MapName != ''
    AND TimeMapLoad IS NOT NULL
  `;
  const dateLimit = loggerDateLimit(boundedLimit);
  const [dateRows] = await pool.query<LoggerDateRow[]>(
    `
      SELECT DATE(TimeMapLoad) AS loggerDate
      FROM tbl_mapstats
      WHERE ${roundsSql}
      GROUP BY DATE(TimeMapLoad)
      ORDER BY DATE(TimeMapLoad) DESC
      LIMIT ?
    `,
    [...scope.params, dateLimit]
  );
  const loggerDates = dateRows
    .map((row) => row.loggerDate)
    .filter((date): date is string => fromLoggerTime(`${date} 00:00:00`) !== null);
  const days = daysOverlapping(loggerDates, timeZone);
  if (days.length === 0) {
    return [];
  }

  const since = `${loggerDates[loggerDates.length - 1]} 00:00:00`;
  const [rows] = await pool.query<ServerDailyPlayersSnapshotRow[]>(
    `
      SELECT
        CASE
          ${days.map(() => "WHEN TimeMapLoad >= ? AND TimeMapLoad < ? THEN ?").join("\n          ")}
        END AS dayDate,
        AVG(MaxPlayers) AS averagePlayers,
        MAX(MaxPlayers) AS peakPlayers,
        COUNT(*) AS roundCount
      FROM tbl_mapstats
      WHERE ${roundsSql}
        AND TimeMapLoad >= ?
      GROUP BY dayDate
    `,
    [...days.flatMap((day) => [day.start, day.end, day.date]), ...scope.params, since]
  );

  // A day that starts before `since` is missing its earlier rounds, unless the
  // logger has none before `since`.
  const noEarlierRounds = dateRows.length < dateLimit;
  const completeDates = new Set(
    days.filter((day) => noEarlierRounds || day.start >= since).map((day) => day.date)
  );

  return rows
    .filter((row): row is ServerDailyPlayersSnapshotRow & { dayDate: string } =>
      row.dayDate !== null && completeDates.has(row.dayDate)
    )
    .sort((a, b) => b.dayDate.localeCompare(a.dayDate))
    .slice(0, boundedLimit)
    .map((row) => ({
      date: row.dayDate,
      averagePlayers: toFixedNumber(row.averagePlayers),
      peakPlayers: Number(row.peakPlayers ?? 0),
      roundCount: Number(row.roundCount ?? 0)
    }));
}
