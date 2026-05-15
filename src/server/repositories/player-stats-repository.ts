import { RowDataPacket } from "mysql2";
import { getDbPool } from "@/src/server/db/pool";
import { hasTable } from "@/src/server/db/schema";
import { toFixedNumber } from "@/src/server/utils/numbers";

export type LeaderSort = "soldierName" | "score" | "kills" | "kdr" | "hsr";
export type SortOrder = "asc" | "desc";
export type CurrentPlayerSort = "soldierName" | "score" | "kills" | "deaths" | "squad";
export type CurrentPlayerOrder = "asc" | "desc";

export type LeaderboardQueryInput = {
  serverId: number;
  gameId: number;
  sort: LeaderSort;
  order: SortOrder;
  page: number;
  pageSize: number;
  search: string | null;
};

export type AllServersLeaderboardQueryInput = {
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
  available: boolean;
  players: LeaderboardPlayer[];
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
  playerId: number;
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
  playerId: number;
  soldierName: string;
  score: number;
  kills: number;
  deaths: number;
  teamId: number;
  squadId: number;
  countryCode: string | null;
  banStatus: "active" | "expired" | null;
};

const SORT_SQL: Record<LeaderSort, string> = {
  soldierName: "tpd.SoldierName",
  score: "COALESCE(tps.Score, 0)",
  kills: "COALESCE(tps.Kills, 0)",
  kdr: "COALESCE((tps.Kills / NULLIF(tps.Deaths, 0)), 0)",
  hsr: "COALESCE(((tps.Headshots / NULLIF(tps.Kills, 0)) * 100), 0)"
};

const ALL_SERVERS_SORT_SQL: Record<LeaderSort, string> = {
  soldierName: "tpd.SoldierName",
  score: "COALESCE(SUM(tps.Score), 0)",
  kills: "COALESCE(SUM(tps.Kills), 0)",
  kdr: "COALESCE((SUM(tps.Kills) / NULLIF(SUM(tps.Deaths), 0)), 0)",
  hsr: "COALESCE(((SUM(tps.Headshots) / NULLIF(SUM(tps.Kills), 0)) * 100), 0)"
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

async function hasSessionsTable(): Promise<boolean> {
  return hasTable("tbl_sessions");
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

function leaderboardOrderBy(
  sort: LeaderSort,
  order: SortOrder,
  aggregate: boolean
): string {
  const sortSql = aggregate ? ALL_SERVERS_SORT_SQL[sort] : SORT_SQL[sort];
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

export async function getServerLeaderboard(
  input: LeaderboardQueryInput
): Promise<LeaderboardResult> {
  const pool = getDbPool();
  const sort = normalizeSort(input.sort);
  const order = normalizeOrder(input.order);
  const requestedPage = normalizePage(input.page);
  const pageSize = Math.max(1, Math.min(100, Math.floor(input.pageSize)));
  const search = input.search?.trim() ? input.search.trim() : null;

  const countParams: Array<string | number> = [
    input.serverId,
    input.gameId
  ];
  let countSql = `
    SELECT COUNT(*) AS totalRows
    FROM tbl_playerstats tps
    INNER JOIN tbl_server_player tsp ON tsp.StatsID = tps.StatsID
    INNER JOIN tbl_playerdata tpd ON tsp.PlayerID = tpd.PlayerID
    WHERE tsp.ServerID = ?
      AND tpd.GameID = ?
  `;

  if (search) {
    countSql += " AND tpd.SoldierName LIKE ? ";
    countParams.push(`%${search}%`);
  }

  const [countRows] = await pool.query<CountRow[]>(countSql, countParams);
  const totalRows = Number(countRows[0]?.totalRows ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * pageSize;
  const adkatsAvailable = await hasAdkatsBansTable();
  const leaderParams: Array<string | number | null> = [
    input.serverId,
    input.gameId
  ];
  let leaderSql = `
    SELECT
      tpd.PlayerID AS playerId,
      tpd.SoldierName AS soldierName,
      tpd.CountryCode AS countryCode,
      tps.Score AS score,
      tps.Kills AS kills,
      (tps.Kills / NULLIF(tps.Deaths, 0)) AS kdr,
      ((tps.Headshots / NULLIF(tps.Kills, 0)) * 100) AS hsr
      ${adkatsAvailable ? ", adk.ban_status AS banStatus" : ""}
    FROM tbl_playerstats tps
    INNER JOIN tbl_server_player tsp ON tsp.StatsID = tps.StatsID
    INNER JOIN tbl_playerdata tpd ON tsp.PlayerID = tpd.PlayerID
    ${adkatsAvailable ? "LEFT JOIN adkats_bans adk ON adk.player_id = tpd.PlayerID" : ""}
    WHERE tsp.ServerID = ?
      AND tpd.GameID = ?
  `;

  if (search) {
    leaderSql += " AND tpd.SoldierName LIKE ? ";
    leaderParams.push(`%${search}%`);
  }

  leaderSql += `
    ORDER BY ${leaderboardOrderBy(sort, order, false)}
    LIMIT ? OFFSET ?
  `;
  leaderParams.push(pageSize, offset);

  const [rows] = await pool.query<PlayerRow[]>(leaderSql, leaderParams);

  return {
    players: rows.map(toLeaderboardPlayer),
    totalRows,
    totalPages,
    page,
    pageSize,
    hasNextPage: page < totalPages
  };
}

export async function getAllServersLeaderboard(
  input: AllServersLeaderboardQueryInput
): Promise<LeaderboardResult> {
  const serverIds = Array.from(
    new Set(
      input.serverIds
        .map((serverId) => Number(serverId))
        .filter((serverId) => Number.isFinite(serverId) && serverId > 0)
    )
  );

  if (serverIds.length === 0) {
    return {
      players: [],
      totalRows: 0,
      totalPages: 1,
      page: 1,
      pageSize: Math.max(1, Math.min(100, Math.floor(input.pageSize))),
      hasNextPage: false
    };
  }

  const pool = getDbPool();
  const sort = normalizeSort(input.sort);
  const order = normalizeOrder(input.order);
  const requestedPage = normalizePage(input.page);
  const pageSize = Math.max(1, Math.min(100, Math.floor(input.pageSize)));
  const search = input.search?.trim() ? input.search.trim() : null;
  const serverPlaceholders = serverIds.map(() => "?").join(", ");

  const countParams: Array<string | number> = [...serverIds, input.gameId];
  let countSql = `
    SELECT COUNT(DISTINCT tpd.PlayerID) AS totalRows
    FROM tbl_playerstats tps
    INNER JOIN tbl_server_player tsp ON tsp.StatsID = tps.StatsID
    INNER JOIN tbl_playerdata tpd ON tsp.PlayerID = tpd.PlayerID
    WHERE tsp.ServerID IN (${serverPlaceholders})
      AND tpd.GameID = ?
  `;

  if (search) {
    countSql += " AND tpd.SoldierName LIKE ? ";
    countParams.push(`%${search}%`);
  }

  const [countRows] = await pool.query<CountRow[]>(countSql, countParams);
  const totalRows = Number(countRows[0]?.totalRows ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * pageSize;

  const adkatsAvailable = await hasAdkatsBansTable();
  const leaderParams: Array<string | number | null> = [
    ...serverIds,
    input.gameId
  ];

  let leaderSql = `
    SELECT
      tpd.PlayerID AS playerId,
      tpd.SoldierName AS soldierName,
      tpd.CountryCode AS countryCode,
      SUM(tps.Score) AS score,
      SUM(tps.Kills) AS kills,
      (SUM(tps.Kills) / NULLIF(SUM(tps.Deaths), 0)) AS kdr,
      ((SUM(tps.Headshots) / NULLIF(SUM(tps.Kills), 0)) * 100) AS hsr
      ${adkatsAvailable ? ", adk.ban_status AS banStatus" : ""}
    FROM tbl_playerstats tps
    INNER JOIN tbl_server_player tsp ON tsp.StatsID = tps.StatsID
    INNER JOIN tbl_playerdata tpd ON tsp.PlayerID = tpd.PlayerID
    ${adkatsAvailable ? "LEFT JOIN adkats_bans adk ON adk.player_id = tpd.PlayerID" : ""}
    WHERE tsp.ServerID IN (${serverPlaceholders})
      AND tpd.GameID = ?
  `;

  if (search) {
    leaderSql += " AND tpd.SoldierName LIKE ? ";
    leaderParams.push(`%${search}%`);
  }

  leaderSql += `
    GROUP BY tpd.PlayerID, tpd.SoldierName, tpd.CountryCode ${adkatsAvailable ? ", adk.ban_status" : ""}
  `;

  leaderSql += `
    ORDER BY ${leaderboardOrderBy(sort, order, true)}
    LIMIT ? OFFSET ?
  `;
  leaderParams.push(pageSize, offset);

  const [rows] = await pool.query<PlayerRow[]>(leaderSql, leaderParams);

  return {
    players: rows.map(toLeaderboardPlayer),
    totalRows,
    totalPages,
    page,
    pageSize,
    hasNextPage: page < totalPages
  };
}

export async function getWeeklyServerLeaderboard(input: {
  serverId: number;
  gameId: number;
  limit?: number;
}): Promise<WeeklyLeaderboardResult> {
  const sessionsAvailable = await hasSessionsTable();
  if (!sessionsAvailable) {
    return {
      available: false,
      players: []
    };
  }

  const pool = getDbPool();
  const adkatsAvailable = await hasAdkatsBansTable();
  const safeLimit = Math.max(1, Math.min(100, Math.floor(input.limit ?? 20)));

  const [rows] = await pool.query<PlayerRow[]>(
    `
      SELECT
        tpd.PlayerID AS playerId,
        tpd.SoldierName AS soldierName,
        tpd.CountryCode AS countryCode,
        SUM(tss.Score) AS score,
        SUM(tss.Kills) AS kills,
        (SUM(tss.Kills) / NULLIF(SUM(tss.Deaths), 0)) AS kdr,
        ((SUM(tss.Headshots) / NULLIF(SUM(tss.Kills), 0)) * 100) AS hsr
        ${adkatsAvailable ? ", adk.ban_status AS banStatus" : ""}
      FROM tbl_sessions tss
      INNER JOIN tbl_server_player tsp ON tss.StatsID = tsp.StatsID
      INNER JOIN tbl_playerdata tpd ON tsp.PlayerID = tpd.PlayerID
      ${adkatsAvailable ? "LEFT JOIN adkats_bans adk ON adk.player_id = tpd.PlayerID" : ""}
      WHERE tsp.ServerID = ?
        AND tpd.GameID = ?
        AND tss.Starttime BETWEEN CURDATE() - INTERVAL 7 DAY AND CURDATE()
      GROUP BY tpd.PlayerID, tpd.SoldierName, tpd.CountryCode ${adkatsAvailable ? ", adk.ban_status" : ""}
      ORDER BY score DESC, tpd.SoldierName ASC
      LIMIT ?
    `,
    [input.serverId, input.gameId, safeLimit]
  );

  return {
    available: true,
    players: rows.map((row) => ({
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
    }))
  };
}

export async function getAllServersWeeklyLeaderboard(input: {
  serverIds: number[];
  gameId: number;
  limit?: number;
}): Promise<WeeklyLeaderboardResult> {
  const serverIds = Array.from(
    new Set(
      input.serverIds
        .map((serverId) => Number(serverId))
        .filter((serverId) => Number.isFinite(serverId) && serverId > 0)
    )
  );
  if (serverIds.length === 0) {
    return {
      available: true,
      players: []
    };
  }

  const sessionsAvailable = await hasSessionsTable();
  if (!sessionsAvailable) {
    return {
      available: false,
      players: []
    };
  }

  const pool = getDbPool();
  const adkatsAvailable = await hasAdkatsBansTable();
  const safeLimit = Math.max(1, Math.min(100, Math.floor(input.limit ?? 20)));
  const serverPlaceholders = serverIds.map(() => "?").join(", ");

  const [rows] = await pool.query<PlayerRow[]>(
    `
      SELECT
        tpd.PlayerID AS playerId,
        tpd.SoldierName AS soldierName,
        tpd.CountryCode AS countryCode,
        SUM(tss.Score) AS score,
        SUM(tss.Kills) AS kills,
        (SUM(tss.Kills) / NULLIF(SUM(tss.Deaths), 0)) AS kdr,
        ((SUM(tss.Headshots) / NULLIF(SUM(tss.Kills), 0)) * 100) AS hsr
        ${adkatsAvailable ? ", adk.ban_status AS banStatus" : ""}
      FROM tbl_sessions tss
      INNER JOIN tbl_server_player tsp ON tss.StatsID = tsp.StatsID
      INNER JOIN tbl_playerdata tpd ON tsp.PlayerID = tpd.PlayerID
      ${adkatsAvailable ? "LEFT JOIN adkats_bans adk ON adk.player_id = tpd.PlayerID" : ""}
      WHERE tsp.ServerID IN (${serverPlaceholders})
        AND tpd.GameID = ?
        AND tss.Starttime BETWEEN CURDATE() - INTERVAL 7 DAY AND CURDATE()
      GROUP BY tpd.PlayerID, tpd.SoldierName, tpd.CountryCode ${adkatsAvailable ? ", adk.ban_status" : ""}
      ORDER BY score DESC, tpd.SoldierName ASC
      LIMIT ?
    `,
    [...serverIds, input.gameId, safeLimit]
  );

  return {
    available: true,
    players: rows.map((row) => ({
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
    }))
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

  const [rows] = await pool.query<CurrentPlayerRow[]>(
    `
      SELECT
        resolved.playerId AS playerId,
        cp.Soldiername AS soldierName,
        cp.Score AS score,
        cp.Kills AS kills,
        cp.Deaths AS deaths,
        cp.TeamID AS teamId,
        cp.SquadID AS squadId,
        cp.CountryCode AS countryCode
        ${adkatsAvailable ? ", adk.ban_status AS banStatus" : ""}
      FROM tbl_currentplayers cp
      INNER JOIN (
        SELECT
          MIN(tpd.PlayerID) AS playerId,
          tpd.SoldierName AS soldierName
        FROM tbl_playerdata tpd
        INNER JOIN tbl_server_player tsp ON tsp.PlayerID = tpd.PlayerID
        WHERE tpd.GameID = ?
          AND tsp.ServerID = ?
        GROUP BY tpd.SoldierName
      ) resolved ON resolved.soldierName = cp.Soldiername
      ${adkatsAvailable ? "LEFT JOIN adkats_bans adk ON adk.player_id = resolved.playerId" : ""}
      WHERE cp.ServerID = ?
      ORDER BY cp.TeamID ASC, ${sortExpression} ${orderSql}, cp.Soldiername ASC
      LIMIT 128
    `,
    [input.gameId, input.serverId, input.serverId]
  );

  return rows.map((row) => ({
    playerId: Number(row.playerId),
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
