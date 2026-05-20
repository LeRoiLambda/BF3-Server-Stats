import { RowDataPacket } from "mysql2";
import { getDbPool } from "@/src/server/db/pool";
import { hasTable } from "@/src/server/db/schema";
import { buildServerScopeCondition } from "@/src/server/repositories/server-scope";
import { toDateTimeString } from "@/src/server/utils/dates";
import { toFixedNumber } from "@/src/server/utils/numbers";

export type BanSort = "date" | "soldierName" | "kdr" | "hsr";
export type BanOrder = "asc" | "desc";

export type BansQueryInput = {
  serverId?: number;
  serverIds?: number[];
  gameId: number;
  sort: BanSort;
  order: BanOrder;
  page: number;
  pageSize: number;
};

export type BannedPlayer = {
  playerId: number;
  soldierName: string;
  countryCode: string | null;
  kdr: number;
  hsr: number;
  bannedAt: string | null;
  reason: string | null;
};

export type BansResult = {
  available: boolean;
  players: BannedPlayer[];
  totalRows: number;
  totalPages: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
};

type BannedRow = RowDataPacket & {
  playerId: number;
  soldierName: string;
  countryCode: string | null;
  kdr: number | null;
  hsr: number | null;
  bannedAt?: string | Date | null;
  reason?: string | null;
};

type CountRow = RowDataPacket & {
  totalRows: number;
};

const SORT_SQL: Record<BanSort, string> = {
  date: "MAX(adk.ban_startTime)",
  soldierName: "tpd.SoldierName",
  kdr: "COALESCE((SUM(tps.Kills) / NULLIF(SUM(tps.Deaths), 0)), 0)",
  hsr: "COALESCE(((SUM(tps.Headshots) / NULLIF(SUM(tps.Kills), 0)) * 100), 0)"
};

function normalizeSort(value: string | null): BanSort {
  switch (value) {
    case "date":
    case "soldierName":
    case "kdr":
    case "hsr":
      return value;
    default:
      return "date";
  }
}

function normalizeOrder(value: string | null): BanOrder {
  return value === "asc" ? "asc" : "desc";
}

function normalizePage(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }

  return Math.floor(value);
}

export function parseBanSort(value: string | null): BanSort {
  return normalizeSort(value);
}

export function parseBanOrder(value: string | null): BanOrder {
  return normalizeOrder(value);
}

export function parseBanPage(value: string | null): number {
  if (!value) {
    return 1;
  }

  return normalizePage(Number.parseInt(value, 10));
}

function banOrderBy(sort: BanSort, order: BanOrder): string {
  const orderSql = order.toUpperCase();

  if (sort === "soldierName") {
    return `${SORT_SQL.soldierName} ${orderSql}, tpd.PlayerID ASC`;
  }

  return `${SORT_SQL[sort]} ${orderSql}, tpd.SoldierName ASC, tpd.PlayerID ASC`;
}

function toBannedPlayer(row: BannedRow): BannedPlayer {
  return {
    playerId: Number(row.playerId),
    soldierName: row.soldierName,
    countryCode: row.countryCode,
    kdr: toFixedNumber(row.kdr),
    hsr: toFixedNumber(row.hsr),
    bannedAt: toDateTimeString(row.bannedAt),
    reason: row.reason ? row.reason : null
  };
}

export async function getBannedPlayers(
  input: BansQueryInput
): Promise<BansResult> {
  const adkatsAvailable = await hasTable("adkats_bans");
  const sort = normalizeSort(input.sort);
  const order = normalizeOrder(input.order);
  const requestedPage = normalizePage(input.page);
  const pageSize = Math.max(1, Math.min(100, Math.floor(input.pageSize)));
  if (!adkatsAvailable) {
    return {
      players: [],
      totalRows: 0,
      totalPages: 1,
      page: 1,
      pageSize,
      hasNextPage: false,
      available: false
    };
  }

  const pool = getDbPool();
  const scope = buildServerScopeCondition("tsp.ServerID", input);

  const countParams: Array<string | number> = [...scope.params, input.gameId];
  const [countRows] = await pool.query<CountRow[]>(
    `
      SELECT COUNT(*) AS totalRows
      FROM (
        SELECT tpd.PlayerID
        FROM tbl_playerdata tpd
        INNER JOIN tbl_server_player tsp ON tsp.PlayerID = tpd.PlayerID
        INNER JOIN tbl_playerstats tps ON tps.StatsID = tsp.StatsID
        INNER JOIN adkats_bans adk ON adk.player_id = tpd.PlayerID
        WHERE ${scope.sql}
          AND tpd.GameID = ?
          AND adk.ban_status = 'Active'
        GROUP BY tpd.PlayerID
      ) banned_players
    `,
    countParams
  );
  const totalRows = Number(countRows[0]?.totalRows ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * pageSize;

  const adkatsRecordsAvailable = await hasTable("adkats_records_main");
  const params: Array<string | number | null> = [...scope.params, input.gameId];
  const sql = `
      SELECT
        tpd.PlayerID AS playerId,
        tpd.SoldierName AS soldierName,
        tpd.CountryCode AS countryCode,
        (SUM(tps.Kills) / NULLIF(SUM(tps.Deaths), 0)) AS kdr,
        ((SUM(tps.Headshots) / NULLIF(SUM(tps.Kills), 0)) * 100) AS hsr,
        MAX(adk.ban_startTime) AS bannedAt
        ${adkatsRecordsAvailable ? ", abr.record_message AS reason" : ""}
      FROM tbl_playerdata tpd
      INNER JOIN tbl_server_player tsp ON tsp.PlayerID = tpd.PlayerID
      INNER JOIN tbl_playerstats tps ON tps.StatsID = tsp.StatsID
      INNER JOIN adkats_bans adk ON adk.player_id = tpd.PlayerID
      ${adkatsRecordsAvailable ? "LEFT JOIN adkats_records_main abr ON abr.record_id = adk.latest_record_id" : ""}
      WHERE ${scope.sql}
        AND tpd.GameID = ?
        AND adk.ban_status = 'Active'
      GROUP BY tpd.PlayerID, tpd.SoldierName, tpd.CountryCode ${adkatsRecordsAvailable ? ", abr.record_message" : ""}
      ORDER BY ${banOrderBy(sort, order)}
      LIMIT ? OFFSET ?
    `;
  params.push(pageSize, offset);

  const [rows] = await pool.query<BannedRow[]>(sql, params);

  return {
    players: rows.map(toBannedPlayer),
    totalRows,
    totalPages,
    page,
    pageSize,
    hasNextPage: page < totalPages,
    available: true
  };
}
