import { RowDataPacket } from "mysql2";
import { getDbPool } from "@/src/server/db/pool";
import { hasTable } from "@/src/server/db/schema";
import { buildServerScopeCondition } from "@/src/server/repositories/server-scope";
import { toFixedNumber, toNumber } from "@/src/server/utils/numbers";

export type BanSort = "soldierName" | "kdr" | "hsr";
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
  reason: string | null;
};

export type BansResult = {
  available: boolean;
  players: BannedPlayer[];
  totalRows: number;
  totalPages: number;
  page: number;
  pageSize: number;
};

type CountRow = RowDataPacket & {
  totalRows: number;
};

type BannedRow = RowDataPacket & {
  playerId: number;
  soldierName: string;
  countryCode: string | null;
  kdr: number | null;
  hsr: number | null;
  reason?: string | null;
};

const SORT_SQL: Record<BanSort, string> = {
  soldierName: "tpd.SoldierName",
  kdr: "(SUM(tps.Kills) / NULLIF(SUM(tps.Deaths), 0))",
  hsr: "(SUM(tps.Headshots) / NULLIF(SUM(tps.Kills), 0))"
};

function normalizeSort(value: string | null): BanSort {
  switch (value) {
    case "soldierName":
    case "kdr":
    case "hsr":
      return value;
    default:
      return "kdr";
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

export async function getBannedPlayers(
  input: BansQueryInput
): Promise<BansResult> {
  const adkatsAvailable = await hasTable("adkats_bans");
  if (!adkatsAvailable) {
    return {
      available: false,
      players: [],
      totalRows: 0,
      totalPages: 1,
      page: 1,
      pageSize: input.pageSize
    };
  }

  const pool = getDbPool();
  const sort = normalizeSort(input.sort);
  const order = normalizeOrder(input.order);
  const page = normalizePage(input.page);
  const pageSize = Math.max(1, Math.min(100, Math.floor(input.pageSize)));
  const sortExpression = SORT_SQL[sort];
  const orderSql = order.toUpperCase();
  const secondaryOrderSql = order === "asc" ? "DESC" : "ASC";
  const scope = buildServerScopeCondition("tsp.ServerID", input);

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
    [...scope.params, input.gameId]
  );

  const totalRows = Number(countRows[0]?.totalRows ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const boundedPage = Math.min(page, totalPages);
  const offset = (boundedPage - 1) * pageSize;

  const adkatsRecordsAvailable = await hasTable("adkats_records_main");
  const [rows] = await pool.query<BannedRow[]>(
    `
      SELECT
        tpd.PlayerID AS playerId,
        tpd.SoldierName AS soldierName,
        tpd.CountryCode AS countryCode,
        (SUM(tps.Kills) / NULLIF(SUM(tps.Deaths), 0)) AS kdr,
        (SUM(tps.Headshots) / NULLIF(SUM(tps.Kills), 0)) AS hsr
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
      ORDER BY ${sortExpression} ${orderSql}, tpd.SoldierName ${secondaryOrderSql}
      LIMIT ? OFFSET ?
    `,
    [...scope.params, input.gameId, pageSize, offset]
  );

  return {
    available: true,
    players: rows.map((row) => ({
      playerId: Number(row.playerId),
      soldierName: row.soldierName,
      countryCode: row.countryCode,
      kdr: toFixedNumber(row.kdr),
      hsr: toFixedNumber(toNumber(row.hsr) * 100),
      reason: row.reason ? row.reason : null
    })),
    totalRows,
    totalPages,
    page: boundedPage,
    pageSize
  };
}
