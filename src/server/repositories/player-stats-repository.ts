import { RowDataPacket } from "mysql2";
import { getDbPool } from "@/src/server/db/pool";
import { hasServerSessions, hasTable } from "@/src/server/db/schema";
import { containsPattern, searchableText } from "@/src/server/db/search";
import { perAtLeastOneSql } from "@/src/server/db/ratios";
import { buildServerScopeCondition } from "@/src/server/repositories/server-scope";
import { toLoggerTime } from "@/src/server/utils/logger-clock";
import { toFixedNumber } from "@/src/server/utils/numbers";
import { siteTimeZone } from "@/src/server/utils/site-time";
import {
  naiveDateToWallClock,
  wallClockInTimeZone,
  wallClockToInstant,
  wallClockToNaiveDate
} from "@/src/server/utils/time-zones";

export type LeaderSort = "soldierName" | "score" | "kills" | "kdr" | "hsr";
export type SortOrder = "asc" | "desc";
export type CurrentPlayerSort = "soldierName" | "score" | "kills" | "deaths" | "squad";
export type CurrentPlayerOrder = "asc" | "desc";

export type LeaderboardQueryInput = {
  serverIds: number[];
  gameId: number;
  sort: LeaderSort;
  order: SortOrder;
  page: number;
  pageSize: number;
  search: string | null;
};

export type LeaderboardPlayer = {
  playerId: number;
  soldierName: string;
  countryCode: string | null;
  score: number;
  kills: number;
  kdr: number;
  hsr: number;
  banStatus: "active" | "expired" | null;
};

export type LeaderboardResult = {
  players: LeaderboardPlayer[];
  totalRows: number;
  totalPages: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
};

export type WeeklyLeaderboardResult = {
  // False when none of the servers has session history.
  available: boolean;
  players: LeaderboardPlayer[];
  resetAt: string;
  // Servers left out of the ranking because they have no session history.
  serverIdsWithoutSessions: number[];
};

type PlayerRow = RowDataPacket & {
  playerId: number;
  soldierName: string;
  countryCode: string | null;
  score: number;
  kills: number;
  kdr: number | null;
  hsr: number | null;
  banStatus?: string | null;
};

type CountRow = RowDataPacket & {
  totalRows: number;
};

type CurrentPlayerRow = RowDataPacket & {
  playerId: number | null;
  soldierName: string;
  score: number;
  kills: number;
  deaths: number;
  teamId: number;
  squadId: number;
  countryCode: string | null;
  banStatus?: string | null;
};

export type CurrentPlayer = {
  playerId: number | null;
  soldierName: string;
  score: number;
  kills: number;
  deaths: number;
  teamId: number;
  squadId: number;
  countryCode: string | null;
  banStatus: "active" | "expired" | null;
};

const CURRENT_PLAYER_SORT_SQL: Record<CurrentPlayerSort, string> = {
  soldierName: "cp.Soldiername",
  score: "cp.Score",
  kills: "cp.Kills",
  deaths: "cp.Deaths",
  squad: "cp.SquadID"
};

async function hasAdkatsBansTable(): Promise<boolean> {
  return hasTable("adkats_bans");
}

function currentWeekWindow(): {
  startSql: string;
  endSql: string;
  resetAt: string;
} {
  const timeZone = siteTimeZone();
  const today = wallClockInTimeZone(new Date(), timeZone);
  const localStart = wallClockToNaiveDate({
    ...today,
    hour: 0,
    minute: 0,
    second: 0
  });
  const daysSinceMonday = (localStart.getUTCDay() + 6) % 7;
  localStart.setUTCDate(localStart.getUTCDate() - daysSinceMonday);

  const localEnd = new Date(localStart);
  localEnd.setUTCDate(localEnd.getUTCDate() + 7);

  const start = wallClockToInstant(naiveDateToWallClock(localStart), timeZone);
  const end = wallClockToInstant(naiveDateToWallClock(localEnd), timeZone);
  // Session start times are on the stats logger's clock.
  return {
    startSql: toLoggerTime(start),
    endSql: toLoggerTime(end),
    resetAt: end.toISOString()
  };
}

function normalizeSort(sort: string | null): LeaderSort {
  switch (sort) {
    case "soldierName":
    case "score":
    case "kills":
    case "kdr":
    case "hsr":
      return sort;
    default:
      return "score";
  }
}

function normalizeOrder(order: string | null): SortOrder {
  return order === "asc" ? "asc" : "desc";
}

function normalizePage(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }

  return Math.floor(value);
}

function normalizeCurrentPlayerSort(value: string | null): CurrentPlayerSort {
  switch (value) {
    case "soldierName":
    case "score":
    case "kills":
    case "deaths":
    case "squad":
      return value;
    default:
      return "score";
  }
}

function normalizeCurrentPlayerOrder(value: string | null): CurrentPlayerOrder {
  return value === "asc" ? "asc" : "desc";
}

function parseAdkatsBanStatus(value: string | null | undefined): "active" | "expired" | null {
  if (value === "Active") {
    return "active";
  }

  if (value === "Expired") {
    return "expired";
  }

  return null;
}

export function parseLeaderSort(value: string | null): LeaderSort {
  return normalizeSort(value);
}

export function parseSortOrder(value: string | null): SortOrder {
  return normalizeOrder(value);
}

export function parseLeaderboardPage(value: string | null): number {
  if (!value) {
    return 1;
  }

  return normalizePage(Number.parseInt(value, 10));
}

export function parseCurrentPlayerSort(value: string | null): CurrentPlayerSort {
  return normalizeCurrentPlayerSort(value);
}

export function parseCurrentPlayerOrder(value: string | null): CurrentPlayerOrder {
  return normalizeCurrentPlayerOrder(value);
}

// A tbl_playerstats column: summed across a player's servers, or as stored
// when the board shows one server, where each player has a single row.
type StatSql = (column: string) => string;

function leaderboardStatSql(aggregate: boolean): StatSql {
  return aggregate ? (column) => `SUM(tps.${column})` : (column) => `tps.${column}`;
}

function leaderboardSortSql(sort: LeaderSort, stat: StatSql): string {
  switch (sort) {
    case "soldierName":
      return "tpd.SoldierName";
    case "score":
      return `COALESCE(${stat("Score")}, 0)`;
    case "kills":
      return `COALESCE(${stat("Kills")}, 0)`;
    case "kdr":
      return `COALESCE(${perAtLeastOneSql(stat("Kills"), stat("Deaths"))}, 0)`;
    case "hsr":
      return `COALESCE(((${stat("Headshots")} / NULLIF(${stat("Kills")}, 0)) * 100), 0)`;
  }
}

function leaderboardOrderBy(sort: LeaderSort, order: SortOrder, stat: StatSql): string {
  const sortSql = leaderboardSortSql(sort, stat);
  const orderSql = order.toUpperCase();

  if (sort === "soldierName") {
    return `${sortSql} ${orderSql}, tpd.PlayerID ASC`;
  }

  return `${sortSql} ${orderSql}, tpd.SoldierName ASC, tpd.PlayerID ASC`;
}

function toLeaderboardPlayer(row: PlayerRow): LeaderboardPlayer {
  return {
    playerId: Number(row.playerId),
    soldierName: row.soldierName,
    countryCode: row.countryCode,
    score: Number(row.score ?? 0),
    kills: Number(row.kills ?? 0),
    kdr: toFixedNumber(row.kdr),
    hsr: toFixedNumber(row.hsr),
    banStatus:
      row.banStatus === "Active"
        ? "active"
        : row.banStatus === "Expired"
          ? "expired"
          : null
  };
}

// The overall leaderboard of the given servers. A player's stats on several
// servers are summed; one server reads them without grouping, which costs
// less on large servers.
export async function getLeaderboard(input: LeaderboardQueryInput): Promise<LeaderboardResult> {
  const serverIds = Array.from(
    new Set(input.serverIds.filter((serverId) => Number.isInteger(serverId) && serverId > 0))
  );
  const pageSize = Math.max(1, Math.min(100, Math.floor(input.pageSize)));
  if (serverIds.length === 0) {
    return {
      players: [],
      totalRows: 0,
      totalPages: 1,
      page: 1,
      pageSize,
      hasNextPage: false
    };
  }

  const pool = getDbPool();
  const sort = normalizeSort(input.sort);
  const order = normalizeOrder(input.order);
  const requestedPage = normalizePage(input.page);
  const search = input.search?.trim() ? input.search.trim() : null;
  const aggregate = serverIds.length > 1;
  const stat = leaderboardStatSql(aggregate);
  const scope = buildServerScopeCondition("tsp.ServerID", { serverIds });
  const fromSql = `
    FROM tbl_playerstats tps
    INNER JOIN tbl_server_player tsp ON tsp.StatsID = tps.StatsID
    INNER JOIN tbl_playerdata tpd ON tsp.PlayerID = tpd.PlayerID
  `;
  const whereSql = `
    WHERE ${scope.sql}
      AND tpd.GameID = ?
      ${search ? `AND ${searchableText("tpd.SoldierName")} LIKE ?` : ""}
  `;
  const whereParams: Array<string | number> = [
    ...scope.params,
    input.gameId,
    ...(search ? [containsPattern(search)] : [])
  ];

  const [countRows] = await pool.query<CountRow[]>(
    `
      SELECT ${aggregate ? "COUNT(DISTINCT tpd.PlayerID)" : "COUNT(*)"} AS totalRows
      ${fromSql}
      ${whereSql}
    `,
    whereParams
  );
  const totalRows = Number(countRows[0]?.totalRows ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const adkatsAvailable = await hasAdkatsBansTable();

  const [rows] = await pool.query<PlayerRow[]>(
    `
      SELECT
        tpd.PlayerID AS playerId,
        tpd.SoldierName AS soldierName,
        tpd.CountryCode AS countryCode,
        ${stat("Score")} AS score,
        ${stat("Kills")} AS kills,
        ${perAtLeastOneSql(stat("Kills"), stat("Deaths"))} AS kdr,
        ((${stat("Headshots")} / NULLIF(${stat("Kills")}, 0)) * 100) AS hsr
        ${adkatsAvailable ? ", adk.ban_status AS banStatus" : ""}
      ${fromSql}
      ${adkatsAvailable ? "LEFT JOIN adkats_bans adk ON adk.player_id = tpd.PlayerID" : ""}
      ${whereSql}
      ${
        aggregate
          ? `GROUP BY tpd.PlayerID, tpd.SoldierName, tpd.CountryCode${
              adkatsAvailable ? ", adk.ban_status" : ""
            }`
          : ""
      }
      ORDER BY ${leaderboardOrderBy(sort, order, stat)}
      LIMIT ? OFFSET ?
    `,
    [...whereParams, pageSize, (page - 1) * pageSize]
  );

  return {
    players: rows.map(toLeaderboardPlayer),
    totalRows,
    totalPages,
    page,
    pageSize,
    hasNextPage: page < totalPages
  };
}

// The week's top players on the given servers, from their completed sessions:
// a session row covers a whole visit and is written when the player leaves.
export async function getWeeklyLeaderboard(input: {
  serverIds: number[];
  gameId: number;
  limit?: number;
}): Promise<WeeklyLeaderboardResult> {
  const weekWindow = currentWeekWindow();
  const serverIds = Array.from(
    new Set(input.serverIds.filter((serverId) => Number.isInteger(serverId) && serverId > 0))
  );
  const sessionFlags = await Promise.all(serverIds.map(hasServerSessions));
  const rankedServerIds = serverIds.filter((_, index) => sessionFlags[index]);
  const serverIdsWithoutSessions = serverIds.filter((_, index) => !sessionFlags[index]);
  if (rankedServerIds.length === 0) {
    return {
      available: false,
      players: [],
      resetAt: weekWindow.resetAt,
      serverIdsWithoutSessions
    };
  }

  const pool = getDbPool();
  const adkatsAvailable = await hasAdkatsBansTable();
  const safeLimit = Math.max(1, Math.min(100, Math.floor(input.limit ?? 20)));
  const scope = buildServerScopeCondition("tsp.ServerID", { serverIds: rankedServerIds });
  const [rows] = await pool.query<PlayerRow[]>(
    `
      SELECT
        tpd.PlayerID AS playerId,
        tpd.SoldierName AS soldierName,
        tpd.CountryCode AS countryCode,
        SUM(tss.Score) AS score,
        SUM(tss.Kills) AS kills,
        ${perAtLeastOneSql("SUM(tss.Kills)", "SUM(tss.Deaths)")} AS kdr,
        ((SUM(tss.Headshots) / NULLIF(SUM(tss.Kills), 0)) * 100) AS hsr
        ${adkatsAvailable ? ", adk.ban_status AS banStatus" : ""}
      FROM tbl_sessions tss
      INNER JOIN tbl_server_player tsp ON tss.StatsID = tsp.StatsID
      INNER JOIN tbl_playerdata tpd ON tsp.PlayerID = tpd.PlayerID
      ${adkatsAvailable ? "LEFT JOIN adkats_bans adk ON adk.player_id = tpd.PlayerID" : ""}
      WHERE ${scope.sql}
        AND tpd.GameID = ?
        AND tss.StartTime >= ?
        AND tss.StartTime < ?
      GROUP BY tpd.PlayerID, tpd.SoldierName, tpd.CountryCode ${adkatsAvailable ? ", adk.ban_status" : ""}
      ORDER BY score DESC, tpd.SoldierName ASC
      LIMIT ?
    `,
    [
      ...scope.params,
      input.gameId,
      weekWindow.startSql,
      weekWindow.endSql,
      safeLimit
    ]
  );

  return {
    available: true,
    players: rows.map(toLeaderboardPlayer),
    resetAt: weekWindow.resetAt,
    serverIdsWithoutSessions
  };
}

export async function listCurrentPlayersByServer(input: {
  serverId: number;
  gameId: number;
  sort: CurrentPlayerSort;
  order: CurrentPlayerOrder;
}): Promise<CurrentPlayer[]> {
  const pool = getDbPool();
  const sort = normalizeCurrentPlayerSort(input.sort);
  const order = normalizeCurrentPlayerOrder(input.order);
  const sortExpression = CURRENT_PLAYER_SORT_SQL[sort];
  const orderSql = order.toUpperCase();
  const adkatsAvailable = await hasAdkatsBansTable();

  // Names are matched across the game, as in chat: a player known from another
  // server links to their profile before their first stats here, which the
  // logger writes at the next map load. Players new to the game stay unlinked.
  const [rows] = await pool.query<CurrentPlayerRow[]>(
    `
      SELECT
        cp.playerId,
        cp.Soldiername AS soldierName,
        cp.Score AS score,
        cp.Kills AS kills,
        cp.Deaths AS deaths,
        cp.TeamID AS teamId,
        cp.SquadID AS squadId,
        cp.CountryCode AS countryCode
        ${adkatsAvailable ? ", adk.ban_status AS banStatus" : ""}
      FROM (
        SELECT
          tcp.Soldiername,
          tcp.Score,
          tcp.Kills,
          tcp.Deaths,
          tcp.TeamID,
          tcp.SquadID,
          tcp.CountryCode,
          (
            SELECT MIN(tpd.PlayerID)
            FROM tbl_playerdata tpd
            WHERE tpd.GameID = ?
              AND tpd.SoldierName = tcp.Soldiername
          ) AS playerId
        FROM tbl_currentplayers tcp
        WHERE tcp.ServerID = ?
      ) cp
      ${adkatsAvailable ? "LEFT JOIN adkats_bans adk ON adk.player_id = cp.playerId" : ""}
      ORDER BY cp.TeamID ASC, ${sortExpression} ${orderSql}, cp.Soldiername ASC
      LIMIT 128
    `,
    [input.gameId, input.serverId]
  );

  return rows.map((row) => ({
    playerId: row.playerId === null ? null : Number(row.playerId),
    soldierName: row.soldierName,
    score: Number(row.score ?? 0),
    kills: Number(row.kills ?? 0),
    deaths: Number(row.deaths ?? 0),
    teamId: Number(row.teamId ?? 0),
    squadId: Number(row.squadId ?? 0),
    countryCode: row.countryCode,
    banStatus: parseAdkatsBanStatus(row.banStatus)
  }));
}
