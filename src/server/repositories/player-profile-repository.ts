import { RowDataPacket } from "mysql2";
import { getDbPool } from "@/src/server/db/pool";
import { hasTable } from "@/src/server/db/schema";
import {
  containsPattern,
  searchableText,
  startsWithPattern
} from "@/src/server/db/search";
import {
  buildServerScopeCondition,
  type ServerScopeCondition
} from "@/src/server/repositories/server-scope";
import { fromLoggerTime } from "@/src/server/utils/logger-clock";
import { toFixedNumber } from "@/src/server/utils/numbers";

export type PlayerProfile = {
  playerId: number;
  soldierName: string;
  countryCode: string | null;
  globalRank: number | null;
  suicides: number;
  score: number;
  kills: number;
  deaths: number;
  kdr: number;
  hsr: number;
  teamKills: number;
  headshots: number;
  rounds: number;
  killstreak: number;
  deathstreak: number;
  wins: number;
  losses: number;
  wlr: number;
  highScore: number;
  firstSeenOnServer: Date | null;
  lastSeenOnServer: Date | null;
  banStatus: "active" | "expired" | null;
  banReason: string | null;
  hasStats: boolean;
};

export type PlayerRankPositions = {
  totalPlayers: number;
  scoreRank: number | null;
  killsRank: number | null;
  kdrRank: number | null;
};

export type PlayerWeapon = {
  weaponCode: string | null;
  weaponFullName: string | null;
  damageType: string | null;
  kills: number;
  deaths: number;
  headshots: number;
  hsr: number;
};

export type PlayerDogtagLoss = {
  killerId: number;
  killerName: string;
  tagCount: number;
  banStatus: "active" | "expired" | null;
};

export type PlayerDogtagLossResult = {
  available: boolean;
  entries: PlayerDogtagLoss[];
};

export type PlayerDogtagCollection = {
  victimId: number;
  victimName: string;
  tagCount: number;
  banStatus: "active" | "expired" | null;
};

export type PlayerDogtagCollectionResult = {
  available: boolean;
  entries: PlayerDogtagCollection[];
};

export type PlayerSearchHit = {
  playerId: number;
  soldierName: string;
  countryCode: string | null;
  score: number;
  kills: number;
  kdr: number;
  banStatus: "active" | "expired" | null;
};

type PlayerProfileRow = RowDataPacket & {
  playerId: number;
  soldierName: string;
  countryCode: string | null;
  globalRank: number | null;
  statsRows: number;
  suicides: number | null;
  score: number | null;
  kills: number | null;
  deaths: number | null;
  kdr: number | null;
  hsr: number | null;
  teamKills: number | null;
  headshots: number | null;
  rounds: number | null;
  killstreak: number | null;
  deathstreak: number | null;
  wins: number | null;
  losses: number | null;
  wlr: number | null;
  highScore: number | null;
  firstSeenOnServer: string | null;
  lastSeenOnServer: string | null;
  banStatus?: string | null;
  banReason?: string | null;
};

type PlayerWeaponRow = RowDataPacket & {
  weaponCode: string | null;
  weaponFullName: string | null;
  damageType: string | null;
  kills: number | null;
  deaths: number | null;
  headshots: number | null;
  hsr: number | null;
};

type PlayerDogtagLossRow = RowDataPacket & {
  killerId: number;
  killerName: string;
  tagCount: number | null;
  banStatus?: string | null;
};

type PlayerDogtagCollectionRow = RowDataPacket & {
  victimId: number;
  victimName: string;
  tagCount: number | null;
  banStatus?: string | null;
};

type PlayerSearchRow = RowDataPacket & {
  playerId: number;
  soldierName: string;
  countryCode: string | null;
  score: number | null;
  kills: number | null;
  kdr: number | null;
  banStatus?: string | null;
};

type PlayerRankTotalRow = RowDataPacket & {
  totalPlayers: number;
};

type PlayerRankPositionRow = RowDataPacket & {
  rankPosition: number | null;
};

// A null serverId means all servers the site lists (serverIds); hidden servers
// are never included.
type PlayerServerScopeInput = {
  serverId: number | null;
  serverIds: number[];
};

export type PlayerProfileInput = PlayerServerScopeInput & {
  playerId: number;
  gameId: number;
};

export type PlayerSearchInput = PlayerServerScopeInput & {
  query: string;
  gameId: number;
  limit: number;
};

async function adkatsAvailability(): Promise<{
  bans: boolean;
  records: boolean;
}> {
  const [bans, records] = await Promise.all([
    hasTable("adkats_bans"),
    hasTable("adkats_records_main")
  ]);

  return {
    bans,
    records
  };
}

function parseBanStatus(value: string | null | undefined): "active" | "expired" | null {
  if (value === "Active") {
    return "active";
  }

  if (value === "Expired") {
    return "expired";
  }

  return null;
}

function normalizeQuery(value: string): string {
  return value.trim();
}

function playerServerScope(input: PlayerServerScopeInput): ServerScopeCondition {
  return buildServerScopeCondition(
    "tsp.ServerID",
    input.serverId !== null
      ? { serverId: input.serverId }
      : { serverIds: input.serverIds }
  );
}

function buildPlayerRankAggregateSql(
  input: PlayerProfileInput,
  metricSql: string,
  targetOnly: boolean
): { sql: string; params: Array<number | string> } {
  const scope = playerServerScope(input);
  const whereParts = ["tpd.GameID = ?", scope.sql];
  const params: Array<number | string> = [input.gameId, ...scope.params];

  if (targetOnly) {
    whereParts.push("tpd.PlayerID = ?");
    params.push(input.playerId);
  }

  return {
    sql: `
      SELECT
        tpd.PlayerID AS playerId,
        tpd.SoldierName AS soldierName,
        ${metricSql} AS metricValue
      FROM tbl_playerstats tps
      INNER JOIN tbl_server_player tsp ON tsp.StatsID = tps.StatsID
      INNER JOIN tbl_playerdata tpd ON tsp.PlayerID = tpd.PlayerID
      WHERE ${whereParts.join(" AND ")}
      GROUP BY tpd.PlayerID, tpd.SoldierName
    `,
    params
  };
}

async function countRankedPlayers(input: PlayerProfileInput): Promise<number> {
  const pool = getDbPool();
  const scope = playerServerScope(input);
  const whereParts = ["tpd.GameID = ?", scope.sql];
  const params: Array<number | string> = [input.gameId, ...scope.params];

  const [rows] = await pool.query<PlayerRankTotalRow[]>(
    `
      SELECT COUNT(DISTINCT tpd.PlayerID) AS totalPlayers
      FROM tbl_playerstats tps
      INNER JOIN tbl_server_player tsp ON tsp.StatsID = tps.StatsID
      INNER JOIN tbl_playerdata tpd ON tsp.PlayerID = tpd.PlayerID
      WHERE ${whereParts.join(" AND ")}
    `,
    params
  );

  return Number(rows[0]?.totalPlayers ?? 0);
}

async function getPlayerMetricRank(
  input: PlayerProfileInput,
  metricSql: string
): Promise<number | null> {
  const pool = getDbPool();
  const target = buildPlayerRankAggregateSql(input, metricSql, true);
  const ranked = buildPlayerRankAggregateSql(input, metricSql, false);
  const [rows] = await pool.query<PlayerRankPositionRow[]>(
    `
      SELECT
        CASE
          WHEN COUNT(target.playerId) = 0 THEN NULL
          ELSE COUNT(ranked.playerId) + 1
        END AS rankPosition
      FROM (${target.sql}) target
      LEFT JOIN (${ranked.sql}) ranked
        ON COALESCE(ranked.metricValue, 0) > COALESCE(target.metricValue, 0)
        OR (
          COALESCE(ranked.metricValue, 0) = COALESCE(target.metricValue, 0)
          AND (
            ranked.soldierName < target.soldierName
            OR (
              ranked.soldierName = target.soldierName
              AND ranked.playerId < target.playerId
            )
          )
        )
    `,
    [...target.params, ...ranked.params]
  );

  const rank = rows[0]?.rankPosition;
  return rank === null || rank === undefined ? null : Number(rank);
}

export async function getPlayerProfileById(
  input: PlayerProfileInput
): Promise<PlayerProfile | null> {
  const pool = getDbPool();
  const adkats = await adkatsAvailability();
  const adkatsJoin = adkats.bans
    ? "LEFT JOIN adkats_bans adk ON adk.player_id = tpd.PlayerID"
    : "";
  const adkatsFields = adkats.bans ? ", adk.ban_status AS banStatus" : "";
  const adkatsRecordsJoin =
    adkats.bans && adkats.records
      ? "LEFT JOIN adkats_records_main abr ON abr.record_id = adk.latest_record_id"
      : "";
  const adkatsReasonField =
    adkats.bans && adkats.records ? ", abr.record_message AS banReason" : "";

  const scope = playerServerScope(input);
  const adkatsGroupBy = [
    adkats.bans ? "adk.ban_status" : null,
    adkats.bans && adkats.records ? "abr.record_message" : null
  ]
    .filter(Boolean)
    .map((column) => `, ${column}`)
    .join("");

  // Starts from tbl_playerdata, so a player without stats in the scope still
  // has a profile.
  const [rows] = await pool.query<PlayerProfileRow[]>(
    `
      SELECT
        tpd.PlayerID AS playerId,
        tpd.SoldierName AS soldierName,
        tpd.CountryCode AS countryCode,
        tpd.GlobalRank AS globalRank,
        COUNT(tps.StatsID) AS statsRows,
        SUM(tps.Suicide) AS suicides,
        SUM(tps.Score) AS score,
        SUM(tps.Kills) AS kills,
        SUM(tps.Deaths) AS deaths,
        (SUM(tps.Kills) / NULLIF(SUM(tps.Deaths), 0)) AS kdr,
        ((SUM(tps.Headshots) / NULLIF(SUM(tps.Kills), 0)) * 100) AS hsr,
        SUM(tps.TKs) AS teamKills,
        SUM(tps.Headshots) AS headshots,
        SUM(tps.Rounds) AS rounds,
        MAX(tps.Killstreak) AS killstreak,
        MAX(tps.Deathstreak) AS deathstreak,
        SUM(tps.Wins) AS wins,
        SUM(tps.Losses) AS losses,
        (SUM(tps.Wins) / NULLIF(SUM(tps.Losses), 0)) AS wlr,
        MAX(tps.HighScore) AS highScore,
        MIN(tps.FirstSeenOnServer) AS firstSeenOnServer,
        MAX(tps.LastSeenOnServer) AS lastSeenOnServer
        ${adkatsFields}
        ${adkatsReasonField}
      FROM tbl_playerdata tpd
      LEFT JOIN tbl_server_player tsp ON tsp.PlayerID = tpd.PlayerID AND ${scope.sql}
      LEFT JOIN tbl_playerstats tps ON tps.StatsID = tsp.StatsID
      ${adkatsJoin}
      ${adkatsRecordsJoin}
      WHERE tpd.PlayerID = ?
        AND tpd.GameID = ?
      GROUP BY tpd.PlayerID, tpd.SoldierName, tpd.CountryCode, tpd.GlobalRank ${adkatsGroupBy}
      LIMIT 1
    `,
    [...scope.params, input.playerId, input.gameId]
  );

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    playerId: Number(row.playerId),
    soldierName: row.soldierName,
    countryCode: row.countryCode,
    globalRank:
      row.globalRank === null || row.globalRank === undefined
        ? null
        : Number(row.globalRank),
    suicides: Number(row.suicides ?? 0),
    score: Number(row.score ?? 0),
    kills: Number(row.kills ?? 0),
    deaths: Number(row.deaths ?? 0),
    kdr: toFixedNumber(row.kdr),
    hsr: toFixedNumber(row.hsr),
    teamKills: Number(row.teamKills ?? 0),
    headshots: Number(row.headshots ?? 0),
    rounds: Number(row.rounds ?? 0),
    killstreak: Number(row.killstreak ?? 0),
    deathstreak: Number(row.deathstreak ?? 0),
    wins: Number(row.wins ?? 0),
    losses: Number(row.losses ?? 0),
    wlr: toFixedNumber(row.wlr),
    highScore: Number(row.highScore ?? 0),
    firstSeenOnServer: fromLoggerTime(row.firstSeenOnServer),
    lastSeenOnServer: fromLoggerTime(row.lastSeenOnServer),
    banStatus: parseBanStatus(row.banStatus),
    banReason: row.banReason ?? null,
    hasStats: Number(row.statsRows ?? 0) > 0
  };
}

export async function getPlayerRankPositions(
  input: PlayerProfileInput
): Promise<PlayerRankPositions> {
  const [totalPlayers, scoreRank, killsRank, kdrRank] = await Promise.all([
    countRankedPlayers(input),
    getPlayerMetricRank(input, "SUM(tps.Score)"),
    getPlayerMetricRank(input, "SUM(tps.Kills)"),
    getPlayerMetricRank(input, "(SUM(tps.Kills) / NULLIF(SUM(tps.Deaths), 0))")
  ]);

  return {
    totalPlayers,
    scoreRank,
    killsRank,
    kdrRank
  };
}

export async function listPlayerWeapons(
  input: PlayerProfileInput
): Promise<PlayerWeapon[]> {
  const pool = getDbPool();
  const scope = playerServerScope(input);
  const whereParts = ["tsp.PlayerID = ?", "tpd.GameID = ?", scope.sql];
  const params: Array<number> = [input.playerId, input.gameId, ...scope.params];

  const [rows] = await pool.query<PlayerWeaponRow[]>(
    `
      SELECT
        tw.Friendlyname AS weaponCode,
        tw.Fullname AS weaponFullName,
        CASE
          WHEN LOWER(COALESCE(tw.Damagetype, '')) LIKE '%vehicle%'
            OR LOWER(COALESCE(tw.Damagetype, '')) = 'none'
            THEN 'vehicle'
          ELSE tw.Damagetype
        END AS damageType,
        SUM(ws.Kills) AS kills,
        SUM(ws.Deaths) AS deaths,
        SUM(ws.Headshots) AS headshots,
        ((SUM(ws.Headshots) / NULLIF(SUM(ws.Kills), 0)) * 100) AS hsr
      FROM tbl_weapons_stats ws
      INNER JOIN tbl_server_player tsp ON tsp.StatsID = ws.StatsID
      INNER JOIN tbl_playerdata tpd ON tsp.PlayerID = tpd.PlayerID
      INNER JOIN tbl_weapons tw ON tw.WeaponID = ws.WeaponID
      WHERE ${whereParts.join(" AND ")}
        AND (ws.Kills > 0 OR ws.Deaths > 0)
      GROUP BY tw.Friendlyname, tw.Fullname, tw.Damagetype
      ORDER BY kills DESC, deaths DESC, tw.Friendlyname ASC
    `,
    params
  );

  return rows.map((row) => ({
    weaponCode: row.weaponCode,
    weaponFullName: row.weaponFullName,
    damageType: row.damageType,
    kills: Number(row.kills ?? 0),
    deaths: Number(row.deaths ?? 0),
    headshots: Number(row.headshots ?? 0),
    hsr: toFixedNumber(row.hsr)
  }));
}

export async function listPlayerDogtagLosses(
  input: PlayerProfileInput & { limit?: number }
): Promise<PlayerDogtagLossResult> {
  const dogtagsAvailable = await hasTable("tbl_dogtags");
  if (!dogtagsAvailable) {
    return {
      available: false,
      entries: []
    };
  }

  const pool = getDbPool();
  const adkatsAvailable = await hasTable("adkats_bans");
  const safeLimit = Math.max(1, Math.min(50, Math.floor(input.limit ?? 20)));
  const scope = playerServerScope(input);
  const whereParts = ["tpd2.PlayerID = ?", "tpd2.GameID = ?", scope.sql];
  const params: Array<number> = [input.playerId, input.gameId, ...scope.params];

  params.push(safeLimit);

  const [rows] = await pool.query<PlayerDogtagLossRow[]>(
    `
      SELECT
        tpd.PlayerID AS killerId,
        tpd.SoldierName AS killerName,
        SUM(dt.Count) AS tagCount
        ${adkatsAvailable ? ", adk.ban_status AS banStatus" : ""}
      FROM tbl_dogtags dt
      INNER JOIN tbl_server_player tsp ON tsp.StatsID = dt.KillerID
      INNER JOIN tbl_server_player tsp2 ON tsp2.StatsID = dt.VictimID
      INNER JOIN tbl_playerdata tpd ON tsp.PlayerID = tpd.PlayerID
      INNER JOIN tbl_playerdata tpd2 ON tsp2.PlayerID = tpd2.PlayerID
      ${adkatsAvailable ? "LEFT JOIN adkats_bans adk ON adk.player_id = tpd.PlayerID" : ""}
      WHERE ${whereParts.join(" AND ")}
      GROUP BY tpd.PlayerID, tpd.SoldierName ${adkatsAvailable ? ", adk.ban_status" : ""}
      ORDER BY tagCount DESC, tpd.SoldierName ASC
      LIMIT ?
    `,
    params
  );

  return {
    available: true,
    entries: rows.map((row) => ({
      killerId: Number(row.killerId),
      killerName: row.killerName,
      tagCount: Number(row.tagCount ?? 0),
      banStatus: parseBanStatus(row.banStatus)
    }))
  };
}

export async function listPlayerDogtagCollections(
  input: PlayerProfileInput & { limit?: number }
): Promise<PlayerDogtagCollectionResult> {
  const dogtagsAvailable = await hasTable("tbl_dogtags");
  if (!dogtagsAvailable) {
    return {
      available: false,
      entries: []
    };
  }

  const pool = getDbPool();
  const adkatsAvailable = await hasTable("adkats_bans");
  const safeLimit = Math.max(1, Math.min(50, Math.floor(input.limit ?? 20)));
  const scope = playerServerScope(input);
  const whereParts = ["tpd.PlayerID = ?", "tpd.GameID = ?", scope.sql];
  const params: Array<number> = [input.playerId, input.gameId, ...scope.params];

  params.push(safeLimit);

  const [rows] = await pool.query<PlayerDogtagCollectionRow[]>(
    `
      SELECT
        tpd2.PlayerID AS victimId,
        tpd2.SoldierName AS victimName,
        SUM(dt.Count) AS tagCount
        ${adkatsAvailable ? ", adk.ban_status AS banStatus" : ""}
      FROM tbl_dogtags dt
      INNER JOIN tbl_server_player tsp ON tsp.StatsID = dt.KillerID
      INNER JOIN tbl_server_player tsp2 ON tsp2.StatsID = dt.VictimID
      INNER JOIN tbl_playerdata tpd ON tsp.PlayerID = tpd.PlayerID
      INNER JOIN tbl_playerdata tpd2 ON tsp2.PlayerID = tpd2.PlayerID
      ${adkatsAvailable ? "LEFT JOIN adkats_bans adk ON adk.player_id = tpd2.PlayerID" : ""}
      WHERE ${whereParts.join(" AND ")}
      GROUP BY tpd2.PlayerID, tpd2.SoldierName ${adkatsAvailable ? ", adk.ban_status" : ""}
      ORDER BY tagCount DESC, tpd2.SoldierName ASC
      LIMIT ?
    `,
    params
  );

  return {
    available: true,
    entries: rows.map((row) => ({
      victimId: Number(row.victimId),
      victimName: row.victimName,
      tagCount: Number(row.tagCount ?? 0),
      banStatus: parseBanStatus(row.banStatus)
    }))
  };
}

export async function searchPlayersByName(
  input: PlayerSearchInput
): Promise<PlayerSearchHit[]> {
  const query = normalizeQuery(input.query);
  if (!query) {
    return [];
  }

  const pool = getDbPool();
  const adkatsAvailable = await hasTable("adkats_bans");

  const scope = playerServerScope(input);
  const whereParts = [
    "tpd.GameID = ?",
    `${searchableText("tpd.SoldierName")} LIKE ?`,
    scope.sql
  ];
  const params: Array<number | string> = [
    input.gameId,
    containsPattern(query),
    ...scope.params,
    query,
    startsWithPattern(query),
    Math.max(1, Math.min(100, Math.floor(input.limit)))
  ];

  const [rows] = await pool.query<PlayerSearchRow[]>(
    `
      SELECT
        tpd.PlayerID AS playerId,
        tpd.SoldierName AS soldierName,
        tpd.CountryCode AS countryCode,
        SUM(tps.Score) AS score,
        SUM(tps.Kills) AS kills,
        (SUM(tps.Kills) / NULLIF(SUM(tps.Deaths), 0)) AS kdr
        ${adkatsAvailable ? ", adk.ban_status AS banStatus" : ""}
      FROM tbl_playerstats tps
      INNER JOIN tbl_server_player tsp ON tsp.StatsID = tps.StatsID
      INNER JOIN tbl_playerdata tpd ON tsp.PlayerID = tpd.PlayerID
      ${adkatsAvailable ? "LEFT JOIN adkats_bans adk ON adk.player_id = tpd.PlayerID" : ""}
      WHERE ${whereParts.join(" AND ")}
      GROUP BY tpd.PlayerID
      ORDER BY
        ${searchableText("tpd.SoldierName")} = ? DESC,
        ${searchableText("tpd.SoldierName")} LIKE ? DESC,
        score DESC,
        tpd.SoldierName ASC
      LIMIT ?
    `,
    params
  );

  return rows.map((row) => ({
    playerId: Number(row.playerId),
    soldierName: row.soldierName,
    countryCode: row.countryCode,
    score: Number(row.score ?? 0),
    kills: Number(row.kills ?? 0),
    kdr: toFixedNumber(row.kdr),
    banStatus: parseBanStatus(row.banStatus)
  }));
}
