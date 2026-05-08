import { RowDataPacket } from "mysql2";
import { getDbPool } from "@/src/server/db/pool";
import { hasTable } from "@/src/server/db/schema";
import { buildServerScopeCondition } from "@/src/server/repositories/server-scope";
import { toFixedNumber, toNumber } from "@/src/server/utils/numbers";

export type SuspiciousSort = "soldierName" | "kdr" | "hsr" | "rounds";
export type SuspiciousOrder = "asc" | "desc";

export type SuspiciousQueryInput = {
  serverId?: number;
  serverIds?: number[];
  gameId: number;
  sort: SuspiciousSort;
  order: SuspiciousOrder;
  page: number;
  pageSize: number;
};

export type SuspiciousPlayer = {
  playerId: number;
  soldierName: string;
  countryCode: string | null;
  rounds: number;
  kdr: number;
  hsr: number;
  banStatus: "active" | "expired" | null;
};

export type SuspiciousResult = {
  players: SuspiciousPlayer[];
  totalRows: number;
  totalPages: number;
  page: number;
  pageSize: number;
};

type CountRow = RowDataPacket & {
  totalRows: number;
};

type SuspiciousRow = RowDataPacket & {
  playerId: number;
  soldierName: string;
  countryCode: string | null;
  rounds: number;
  kdr: number | null;
  hsr: number | null;
  banStatus?: string | null;
};

const SORT_SQL: Record<SuspiciousSort, string> = {
  soldierName: "tpd.SoldierName",
  kdr: "(SUM(tps.Kills) / NULLIF(SUM(tps.Deaths), 0))",
  hsr: "(SUM(tps.Headshots) / NULLIF(SUM(tps.Kills), 0))",
  rounds: "SUM(tps.Rounds)"
};

const SUSPICIOUS_HAVING_SQL = `
  (
    (
      (SUM(tps.Kills) / NULLIF(SUM(tps.Deaths), 0)) > 5
      AND (SUM(tps.Headshots) / NULLIF(SUM(tps.Kills), 0)) > 0.70
      AND SUM(tps.Kills) > 30
      AND SUM(tps.Rounds) > 1
    )
    OR (
      (SUM(tps.Kills) / NULLIF(SUM(tps.Deaths), 0)) > 10
      AND SUM(tps.Kills) > 50
      AND SUM(tps.Rounds) > 1
    )
  )
`;

function normalizeSort(value: string | null): SuspiciousSort {
  switch (value) {
    case "soldierName":
    case "kdr":
    case "hsr":
    case "rounds":
      return value;
    default:
      return "kdr";
  }
}

function normalizeOrder(value: string | null): SuspiciousOrder {
  return value === "asc" ? "asc" : "desc";
}

function normalizePage(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }

  return Math.floor(value);
}

export function parseSuspiciousSort(value: string | null): SuspiciousSort {
  return normalizeSort(value);
}

export function parseSuspiciousOrder(value: string | null): SuspiciousOrder {
  return normalizeOrder(value);
}

export function parseSuspiciousPage(value: string | null): number {
  if (!value) {
    return 1;
  }

  return normalizePage(Number.parseInt(value, 10));
}

export async function getSuspiciousPlayers(
  input: SuspiciousQueryInput
): Promise<SuspiciousResult> {
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
        FROM tbl_playerstats tps
        INNER JOIN tbl_server_player tsp ON tsp.StatsID = tps.StatsID
        INNER JOIN tbl_playerdata tpd ON tsp.PlayerID = tpd.PlayerID
        WHERE ${scope.sql}
          AND tpd.GameID = ?
        GROUP BY tpd.PlayerID
        HAVING ${SUSPICIOUS_HAVING_SQL}
      ) suspicious_players
    `,
    [...scope.params, input.gameId]
  );

  const totalRows = Number(countRows[0]?.totalRows ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const boundedPage = Math.min(page, totalPages);
  const offset = (boundedPage - 1) * pageSize;

  const adkatsAvailable = await hasTable("adkats_bans");
  const [rows] = await pool.query<SuspiciousRow[]>(
    `
      SELECT
        tpd.PlayerID AS playerId,
        tpd.SoldierName AS soldierName,
        tpd.CountryCode AS countryCode,
        SUM(tps.Rounds) AS rounds,
        (SUM(tps.Kills) / NULLIF(SUM(tps.Deaths), 0)) AS kdr,
        (SUM(tps.Headshots) / NULLIF(SUM(tps.Kills), 0)) AS hsr
        ${adkatsAvailable ? ", adk.ban_status AS banStatus" : ""}
      FROM tbl_playerstats tps
      INNER JOIN tbl_server_player tsp ON tsp.StatsID = tps.StatsID
      INNER JOIN tbl_playerdata tpd ON tsp.PlayerID = tpd.PlayerID
      ${adkatsAvailable ? "LEFT JOIN adkats_bans adk ON adk.player_id = tpd.PlayerID" : ""}
      WHERE ${scope.sql}
        AND tpd.GameID = ?
      GROUP BY tpd.PlayerID, tpd.SoldierName, tpd.CountryCode ${adkatsAvailable ? ", adk.ban_status" : ""}
      HAVING ${SUSPICIOUS_HAVING_SQL}
      ORDER BY ${sortExpression} ${orderSql}, tpd.SoldierName ${secondaryOrderSql}
      LIMIT ? OFFSET ?
    `,
    [...scope.params, input.gameId, pageSize, offset]
  );

  return {
    players: rows.map((row) => ({
      playerId: Number(row.playerId),
      soldierName: row.soldierName,
      countryCode: row.countryCode,
      rounds: Number(row.rounds ?? 0),
      kdr: toFixedNumber(row.kdr),
      hsr: toFixedNumber(toNumber(row.hsr) * 100),
      banStatus:
        row.banStatus === "Active"
          ? "active"
          : row.banStatus === "Expired"
            ? "expired"
            : null
    })),
    totalRows,
    totalPages,
    page: boundedPage,
    pageSize
  };
}
