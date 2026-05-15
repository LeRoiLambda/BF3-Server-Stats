import { RowDataPacket } from "mysql2";
import { getDbPool } from "@/src/server/db/pool";
import { hasTable } from "@/src/server/db/schema";
import { buildServerScopeCondition } from "@/src/server/repositories/server-scope";
import { toDateTimeString } from "@/src/server/utils/dates";

export type ChatSort = "date" | "soldierName" | "message";
export type ChatOrder = "asc" | "desc";

export type ChatQueryInput = {
  serverId?: number;
  serverIds?: number[];
  gameId: number;
  sort: ChatSort;
  order: ChatOrder;
  page: number;
  pageSize: number;
  query: string | null;
};

export type ChatLogEntry = {
  id: number;
  serverId: number;
  serverName: string | null;
  logDate: string;
  soldierName: string;
  countryCode: string | null;
  message: string;
  subset: string | null;
  playerId: number;
  banStatus: "active" | "expired" | null;
};

export type ChatDateRange = {
  low: string;
  high: string;
};

export type ChatSearchSuggestionKind = "date" | "player" | "message";

export type ChatSearchSuggestion = {
  kind: ChatSearchSuggestionKind;
  value: string;
  label: string;
  detail: string | null;
};

export type ChatSearchSuggestionInput = {
  serverId?: number;
  serverIds?: number[];
  gameId: number;
  query: string;
  limit: number;
};

export type ChatLogResult = {
  entries: ChatLogEntry[];
  totalRows: number | null;
  totalPages: number | null;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  dateRange: ChatDateRange | null;
};

type ChatPageIdRow = RowDataPacket & {
  id: number;
};

type ChatRow = RowDataPacket & {
  id: number;
  serverId: number;
  serverName: string | null;
  logDate: string;
  soldierName: string;
  countryCode: string | null;
  message: string;
  subset: string | null;
  playerId: number;
  banStatus?: string | null;
};

type ChatSuggestionRow = RowDataPacket & {
  value: string | null;
  lastSeen: string | null;
};

const SORT_SQL: Record<ChatSort, string> = {
  date: "cl.logDate",
  soldierName: "cl.logSoldierName",
  message: "cl.logMessage"
};

function normalizeSort(value: string | null): ChatSort {
  switch (value) {
    case "date":
    case "soldierName":
    case "message":
      return value;
    default:
      return "date";
  }
}

function normalizeOrder(value: string | null): ChatOrder {
  return value === "asc" ? "asc" : "desc";
}

function normalizePage(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }

  return Math.floor(value);
}

function normalizeQuery(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function toSqlMinuteString(date: Date): string {
  return [
    date.getFullYear(),
    "-",
    pad2(date.getMonth() + 1),
    "-",
    pad2(date.getDate()),
    " ",
    pad2(date.getHours()),
    ":",
    pad2(date.getMinutes())
  ].join("");
}

function dayStartWithMinute(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 1, 0, 0);
  return next;
}

function dayEndWithMinute(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 0, 0);
  return next;
}

export function resolveChatDateRange(query: string | null): ChatDateRange | null {
  if (!query) {
    return null;
  }

  const parsed = new Date(query);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const now = new Date();
  const diffSeconds = Math.max(Math.floor((now.getTime() - parsed.getTime()) / 1000), 0);
  const lowered = query.toLowerCase();
  let low: Date;
  let high: Date;

  if (diffSeconds < 3600) {
    low = new Date(now.getTime() - 3600 * 1000);
    high = now;
  } else if (lowered.includes("week")) {
    low = dayStartWithMinute(parsed);
    high = dayEndWithMinute(new Date(parsed.getTime() + 6 * 86400 * 1000));
  } else if (lowered.includes("month")) {
    low = dayStartWithMinute(parsed);
    high = dayEndWithMinute(new Date(parsed.getTime() + 30 * 86400 * 1000));
  } else if (lowered.includes("year")) {
    low = dayStartWithMinute(parsed);
    high = dayEndWithMinute(new Date(parsed.getTime() + 365 * 86400 * 1000));
  } else if (query.includes(":")) {
    low = new Date(parsed.getTime() - 5 * 60 * 1000);
    high = new Date(parsed.getTime() + 5 * 60 * 1000);
  } else {
    low = dayStartWithMinute(parsed);
    high = dayEndWithMinute(parsed);
  }

  if (high.getTime() > now.getTime()) {
    high = now;
  }

  return {
    low: toSqlMinuteString(low),
    high: toSqlMinuteString(high)
  };
}

function addSuggestion(
  suggestions: ChatSearchSuggestion[],
  seen: Set<string>,
  suggestion: ChatSearchSuggestion,
  limit: number
) {
  if (suggestions.length >= limit) {
    return;
  }

  const key = `${suggestion.kind}:${suggestion.value.trim().toLowerCase()}`;
  if (seen.has(key) || !suggestion.value.trim()) {
    return;
  }

  seen.add(key);
  suggestions.push(suggestion);
}

export function parseChatSort(value: string | null): ChatSort {
  return normalizeSort(value);
}

export function parseChatOrder(value: string | null): ChatOrder {
  return normalizeOrder(value);
}

export function parseChatPage(value: string | null): number {
  if (!value) {
    return 1;
  }

  return normalizePage(Number.parseInt(value, 10));
}

export async function searchChatSuggestions(
  input: ChatSearchSuggestionInput
): Promise<ChatSearchSuggestion[]> {
  const query = normalizeQuery(input.query);
  if (!query || query.length < 2) {
    return [];
  }

  const safeLimit = Math.max(1, Math.min(12, Math.floor(input.limit)));
  const scope = buildServerScopeCondition("cl.ServerID", input);
  const pool = getDbPool();
  const suggestions: ChatSearchSuggestion[] = [];
  const seen = new Set<string>();
  const dateRange = resolveChatDateRange(query);

  if (dateRange) {
    addSuggestion(
      suggestions,
      seen,
      {
        kind: "date",
        value: query,
        label: "Date range",
        detail: `${dateRange.low} - ${dateRange.high}`
      },
      safeLimit
    );
  }

  const playerParams: Array<string | number> = [
    input.gameId,
    ...scope.params,
    `%${query}%`,
    safeLimit
  ];
  const messageParams: Array<string | number> = [
    input.gameId,
    ...scope.params,
    `%${query}%`,
    safeLimit
  ];

  const [playerRows, messageRows] = await Promise.all([
    pool.query<ChatSuggestionRow[]>(
      `
        SELECT
          cl.logSoldierName AS value,
          MAX(cl.logDate) AS lastSeen
        FROM tbl_chatlog cl
        INNER JOIN tbl_playerdata tpd ON tpd.PlayerID = cl.logPlayerID AND tpd.GameID = ?
        WHERE ${scope.sql}
          AND cl.logSoldierName LIKE ?
        GROUP BY cl.logSoldierName
        ORDER BY MAX(cl.logDate) DESC, cl.logSoldierName ASC
        LIMIT ?
      `,
      playerParams
    ),
    pool.query<ChatSuggestionRow[]>(
      `
        SELECT
          TRIM(cl.logMessage) AS value,
          MAX(cl.logDate) AS lastSeen
        FROM tbl_chatlog cl
        INNER JOIN tbl_playerdata tpd ON tpd.PlayerID = cl.logPlayerID AND tpd.GameID = ?
        WHERE ${scope.sql}
          AND TRIM(cl.logMessage) != ''
          AND cl.logMessage LIKE ?
        GROUP BY TRIM(cl.logMessage)
        ORDER BY MAX(cl.logDate) DESC
        LIMIT ?
      `,
      messageParams
    )
  ]);

  for (const row of playerRows[0]) {
    if (!row.value) {
      continue;
    }

    addSuggestion(
      suggestions,
      seen,
      {
        kind: "player",
        value: row.value,
        label: row.value,
        detail: row.lastSeen ? `Last chat ${toDateTimeString(row.lastSeen)}` : null
      },
      safeLimit
    );
  }

  for (const row of messageRows[0]) {
    if (!row.value) {
      continue;
    }

    addSuggestion(
      suggestions,
      seen,
      {
        kind: "message",
        value: row.value,
        label: row.value,
        detail: row.lastSeen ? `Seen ${toDateTimeString(row.lastSeen)}` : null
      },
      safeLimit
    );
  }

  return suggestions;
}

function chatOrderBy(sort: ChatSort, order: ChatOrder): string {
  const orderSql = order.toUpperCase();
  if (sort === "date") {
    return `cl.logDate ${orderSql}, cl.ID ${orderSql}`;
  }

  return `${SORT_SQL[sort]} ${orderSql}, cl.logDate DESC, cl.ID DESC`;
}

export async function getServerChatLog(
  input: ChatQueryInput
): Promise<ChatLogResult> {
  const pool = getDbPool();
  const sort = normalizeSort(input.sort);
  const order = normalizeOrder(input.order);
  const page = normalizePage(input.page);
  const pageSize = Math.max(1, Math.min(100, Math.floor(input.pageSize)));
  const query = normalizeQuery(input.query);
  const dateRange = resolveChatDateRange(query);
  const scope = buildServerScopeCondition("cl.ServerID", input);
  const offset = (page - 1) * pageSize;
  const orderBySql = chatOrderBy(sort, order);

  const pageParams: Array<string | number> = [input.gameId, ...scope.params];
  let pageSql = `
    SELECT cl.ID AS id
    FROM tbl_chatlog cl
    INNER JOIN tbl_playerdata tpd ON tpd.PlayerID = cl.logPlayerID AND tpd.GameID = ?
    WHERE ${scope.sql}
  `;

  if (dateRange) {
    pageSql += " AND cl.logDate BETWEEN ? AND ? ";
    pageParams.push(dateRange.low, dateRange.high);
  } else if (query) {
    pageSql += `
      AND (
        cl.logSoldierName LIKE ?
        OR cl.logMessage LIKE ?
        OR cl.logDate LIKE ?
      )
    `;
    const pattern = `%${query}%`;
    pageParams.push(pattern, pattern, pattern);
  }

  pageSql += `
    ORDER BY ${orderBySql}
    LIMIT ? OFFSET ?
  `;
  pageParams.push(pageSize + 1, offset);

  const [pageRows] = await pool.query<ChatPageIdRow[]>(pageSql, pageParams);
  const hasNextPage = pageRows.length > pageSize;
  const pageIds = pageRows.slice(0, pageSize).map((row) => Number(row.id));

  if (pageIds.length === 0) {
    return {
      entries: [],
      totalRows: null,
      totalPages: null,
      page,
      pageSize,
      hasNextPage: false,
      dateRange
    };
  }

  const adkatsAvailable = await hasTable("adkats_bans");
  const idPlaceholders = pageIds.map(() => "?").join(", ");
  const orderedIdPlaceholders = pageIds.map(() => "?").join(", ");
  const logParams: Array<string | number> = [
    input.gameId,
    ...pageIds,
    ...pageIds
  ];
  const [rows] = await pool.query<ChatRow[]>(
    `
      SELECT
        cl.ID AS id,
        cl.ServerID AS serverId,
        ts.ServerName AS serverName,
        cl.logDate AS logDate,
        cl.logSoldierName AS soldierName,
        tpd.CountryCode AS countryCode,
        TRIM(cl.logMessage) AS message,
        cl.logSubset AS subset,
        cl.logPlayerID AS playerId
      ${adkatsAvailable ? ", adk.ban_status AS banStatus" : ""}
      FROM tbl_chatlog cl
      LEFT JOIN tbl_server ts ON ts.ServerID = cl.ServerID
      INNER JOIN tbl_playerdata tpd ON tpd.PlayerID = cl.logPlayerID AND tpd.GameID = ?
      ${adkatsAvailable ? "LEFT JOIN adkats_bans adk ON adk.player_id = cl.logPlayerID" : ""}
      WHERE cl.ID IN (${idPlaceholders})
      ORDER BY FIELD(cl.ID, ${orderedIdPlaceholders})
    `,
    logParams
  );

  return {
    entries: rows.map((row) => ({
      id: Number(row.id),
      serverId: Number(row.serverId),
      serverName: row.serverName ?? null,
      logDate: toDateTimeString(row.logDate) ?? "",
      soldierName: row.soldierName,
      countryCode: row.countryCode ?? null,
      message: row.message,
      subset: row.subset ?? null,
      playerId: Number(row.playerId),
      banStatus:
        row.banStatus === "Active"
          ? "active"
          : row.banStatus === "Expired"
            ? "expired"
            : null
    })),
    totalRows: null,
    totalPages: null,
    page,
    pageSize,
    hasNextPage,
    dateRange
  };
}
