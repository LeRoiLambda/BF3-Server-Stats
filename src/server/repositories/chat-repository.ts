import { RowDataPacket } from "mysql2";
import { getDbPool } from "@/src/server/db/pool";
import { hasColumn, hasTable } from "@/src/server/db/schema";
import { containsPattern, searchableText } from "@/src/server/db/search";
import { buildServerScopeCondition } from "@/src/server/repositories/server-scope";
import { fromLoggerTime, toLoggerTime } from "@/src/server/utils/logger-clock";
import { formatSiteTime, siteTimeZone } from "@/src/server/utils/site-time";
import {
  naiveDateToWallClock,
  wallClockInTimeZone,
  wallClockToInstant,
  wallClockToNaiveDate
} from "@/src/server/utils/time-zones";

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
  logDate: Date | null;
  soldierName: string;
  countryCode: string | null;
  message: string;
  subset: string | null;
  playerId: number | null;
  banStatus: "active" | "expired" | null;
};

export type ChatDateRange = {
  low: Date;
  high: Date;
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

type ChatCountRow = RowDataPacket & {
  totalRows: number;
};

type ChatRow = RowDataPacket & {
  id: number;
  serverId: number;
  serverName: string | null;
  logDate: string | null;
  soldierName: string | null;
  countryCode: string | null;
  message: string;
  subset: string | null;
  playerId: number | null;
  banStatus?: string | null;
};

type ChatSuggestionRow = RowDataPacket & {
  value: string | null;
  lastSeen: string | null;
};

// Highest ?page= served, which keeps LIMIT/OFFSET within MySQL's range.
const MAX_CHAT_PAGE = 1_000_000;

const DATE_QUERY_PATTERN =
  /^(\d{4})[-/.](\d{1,2})(?:[-/.](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?)?$/;
const CURRENT_OR_LAST_PERIOD_PATTERN = /^(this|last) (week|month|year)$/;
const PERIODS_AGO_PATTERN = /^(\d{1,3}) (day|week|month|year)s? ago$/;

type CalendarPeriod = "day" | "week" | "month" | "year";

// Range on the site's clock, held in Dates whose UTC fields are the wall-clock
// fields.
type WallClockRange = {
  low: Date;
  high: Date;
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

  return Math.min(Math.floor(value), MAX_CHAT_PAGE);
}

function normalizeQuery(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

function startOfPeriod(date: Date, period: CalendarPeriod): Date {
  const start = new Date(Date.UTC(
    date.getUTCFullYear(),
    period === "year" ? 0 : date.getUTCMonth(),
    period === "month" || period === "year" ? 1 : date.getUTCDate()
  ));

  if (period === "week") {
    start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  }

  return start;
}

function shiftPeriod(date: Date, period: CalendarPeriod, amount: number): Date {
  const shifted = new Date(date);

  switch (period) {
    case "day":
      shifted.setUTCDate(shifted.getUTCDate() + amount);
      break;
    case "week":
      shifted.setUTCDate(shifted.getUTCDate() + amount * 7);
      break;
    case "month":
      shifted.setUTCMonth(shifted.getUTCMonth() + amount);
      break;
    case "year":
      shifted.setUTCFullYear(shifted.getUTCFullYear() + amount);
      break;
  }

  return shifted;
}

// The whole calendar period (Monday-based for weeks) `periodsAgo` periods
// before the one containing `date`.
function calendarPeriodRange(
  date: Date,
  period: CalendarPeriod,
  periodsAgo: number
): WallClockRange {
  const low = shiftPeriod(startOfPeriod(date, period), period, -periodsAgo);

  return {
    low,
    high: addSeconds(shiftPeriod(low, period, 1), -1)
  };
}

// "2024-01" matches that month, "2024-01-15" that day, and "2024-01-15 21:30"
// five minutes either side.
function parseDateQuery(query: string): WallClockRange | null {
  const match = DATE_QUERY_PATTERN.exec(query);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const hasDay = match[3] !== undefined;
  const day = hasDay ? Number(match[3]) : 1;
  const hasTime = match[4] !== undefined;
  const hour = hasTime ? Number(match[4]) : 0;
  const minute = hasTime ? Number(match[5]) : 0;
  const second = match[6] !== undefined ? Number(match[6]) : 0;
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

  // Rejects impossible values such as 2024-02-31 or 25:00.
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute ||
    date.getUTCSeconds() !== second
  ) {
    return null;
  }

  if (!hasDay) {
    return calendarPeriodRange(date, "month", 0);
  }

  if (!hasTime) {
    return calendarPeriodRange(date, "day", 0);
  }

  return {
    low: addSeconds(date, -5 * 60),
    high: addSeconds(date, 5 * 60)
  };
}

function parseCalendarQuery(query: string, today: Date): WallClockRange | null {
  if (query === "today") {
    return calendarPeriodRange(today, "day", 0);
  }

  if (query === "yesterday") {
    return calendarPeriodRange(today, "day", 1);
  }

  const currentOrLast = CURRENT_OR_LAST_PERIOD_PATTERN.exec(query);
  if (currentOrLast) {
    return calendarPeriodRange(
      today,
      currentOrLast[2] as CalendarPeriod,
      currentOrLast[1] === "last" ? 1 : 0
    );
  }

  const periodsAgo = PERIODS_AGO_PATTERN.exec(query);
  if (periodsAgo) {
    return calendarPeriodRange(
      today,
      periodsAgo[2] as CalendarPeriod,
      Number(periodsAgo[1])
    );
  }

  return null;
}

// Only queries that parse as dates become date ranges; any other text, such as
// "ak 47" or "top 10", is matched against names and messages. Dates and
// periods such as "today" are read on the site's clock, like the times shown.
export function resolveChatDateRange(query: string | null): ChatDateRange | null {
  const trimmed = query?.trim();
  if (!trimmed) {
    return null;
  }

  const phrase = trimmed.toLowerCase().replace(/\s+/g, " ");
  const now = new Date();
  if (phrase === "now" || phrase === "last hour") {
    return {
      low: addSeconds(now, -3600),
      high: now
    };
  }

  const timeZone = siteTimeZone();
  const range =
    parseDateQuery(trimmed) ??
    parseCalendarQuery(phrase, wallClockToNaiveDate(wallClockInTimeZone(now, timeZone)));
  if (!range) {
    return null;
  }

  const low = wallClockToInstant(naiveDateToWallClock(range.low), timeZone);
  const high = wallClockToInstant(naiveDateToWallClock(range.high), timeZone);

  return {
    low,
    high: low.getTime() <= now.getTime() && high.getTime() > now.getTime() ? now : high
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
        detail: `${formatSiteTime(dateRange.low)} - ${formatSiteTime(dateRange.high)}`
      },
      safeLimit
    );
  }

  const pattern = containsPattern(query);
  const playerParams: Array<string | number> = [
    ...scope.params,
    pattern,
    safeLimit
  ];
  const messageParams: Array<string | number> = [
    ...scope.params,
    pattern,
    safeLimit
  ];

  const [playerRows, messageRows] = await Promise.all([
    pool.query<ChatSuggestionRow[]>(
      `
        SELECT
          cl.logSoldierName AS value,
          MAX(cl.logDate) AS lastSeen
        FROM tbl_chatlog cl
        WHERE ${scope.sql}
          AND ${searchableText("cl.logSoldierName")} LIKE ?
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
        WHERE ${scope.sql}
          AND TRIM(cl.logMessage) != ''
          AND ${searchableText("cl.logMessage")} LIKE ?
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

    const lastSeen = fromLoggerTime(row.lastSeen);
    addSuggestion(
      suggestions,
      seen,
      {
        kind: "player",
        value: row.value,
        label: row.value,
        detail: lastSeen ? `Last chat ${formatSiteTime(lastSeen)}` : null
      },
      safeLimit
    );
  }

  for (const row of messageRows[0]) {
    if (!row.value) {
      continue;
    }

    const lastSeen = fromLoggerTime(row.lastSeen);
    addSuggestion(
      suggestions,
      seen,
      {
        kind: "message",
        value: row.value,
        label: row.value,
        detail: lastSeen ? `Seen ${formatSiteTime(lastSeen)}` : null
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
  let page = normalizePage(input.page);
  const pageSize = Math.max(1, Math.min(100, Math.floor(input.pageSize)));
  const query = normalizeQuery(input.query);
  const dateRange = resolveChatDateRange(query);
  const scope = buildServerScopeCondition("cl.ServerID", input);
  const orderBySql = chatOrderBy(sort, order);

  const filterParams: Array<string | number> = [...scope.params];
  let filterSql = `WHERE ${scope.sql}`;

  if (dateRange) {
    // Chat times are on the stats logger's clock.
    filterSql += " AND cl.logDate BETWEEN ? AND ? ";
    filterParams.push(toLoggerTime(dateRange.low), toLoggerTime(dateRange.high));
  } else if (query) {
    filterSql += `
      AND (
        ${searchableText("cl.logSoldierName")} LIKE ?
        OR ${searchableText("cl.logMessage")} LIKE ?
      )
    `;
    const pattern = containsPattern(query);
    filterParams.push(pattern, pattern);
  }

  const fetchPageRows = async (targetPage: number) => {
    const [rows] = await pool.query<ChatPageIdRow[]>(
      `
        SELECT cl.ID AS id
        FROM tbl_chatlog cl
        ${filterSql}
        ORDER BY ${orderBySql}
        LIMIT ? OFFSET ?
      `,
      [...filterParams, pageSize + 1, (targetPage - 1) * pageSize]
    );
    return rows;
  };

  let pageRows = await fetchPageRows(page);
  if (pageRows.length === 0 && page > 1) {
    // A page past the end shows the last page.
    const [countRows] = await pool.query<ChatCountRow[]>(
      `
        SELECT COUNT(*) AS totalRows
        FROM tbl_chatlog cl
        ${filterSql}
      `,
      filterParams
    );
    const lastPage = Math.max(
      1,
      Math.ceil(Number(countRows[0]?.totalRows ?? 0) / pageSize)
    );
    if (lastPage < page) {
      page = lastPage;
      pageRows = await fetchPageRows(page);
    }
  }

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

  const [adkatsAvailable, loggedPlayerIdAvailable] = await Promise.all([
    hasTable("adkats_bans"),
    hasColumn("tbl_chatlog", "logPlayerID")
  ]);
  const idPlaceholders = pageIds.map(() => "?").join(", ");
  const orderedIdPlaceholders = pageIds.map(() => "?").join(", ");
  const logParams: Array<string | number> = [
    input.gameId,
    ...pageIds,
    input.gameId,
    ...pageIds
  ];
  // tbl_chatlog.logPlayerID exists only with AdKats and is NULL for server
  // messages and for chat sent before a player's first stats upload; such lines
  // match the speaker by name, and lines without any player are kept.
  const namedPlayerIdSql = `(
    SELECT MIN(p.PlayerID)
    FROM tbl_playerdata p
    WHERE p.GameID = ?
      AND p.SoldierName = cl.logSoldierName
  )`;
  const [rows] = await pool.query<ChatRow[]>(
    `
      SELECT
        chat.id,
        chat.serverId,
        ts.ServerName AS serverName,
        chat.logDate,
        chat.soldierName,
        tpd.CountryCode AS countryCode,
        chat.message,
        chat.subset,
        tpd.PlayerID AS playerId
      ${adkatsAvailable ? ", adk.ban_status AS banStatus" : ""}
      FROM (
        SELECT
          cl.ID AS id,
          cl.ServerID AS serverId,
          cl.logDate AS logDate,
          cl.logSoldierName AS soldierName,
          TRIM(cl.logMessage) AS message,
          cl.logSubset AS subset,
          ${
            loggedPlayerIdAvailable
              ? `COALESCE(cl.logPlayerID, ${namedPlayerIdSql})`
              : namedPlayerIdSql
          } AS playerId
        FROM tbl_chatlog cl
        WHERE cl.ID IN (${idPlaceholders})
      ) chat
      LEFT JOIN tbl_server ts ON ts.ServerID = chat.serverId
      LEFT JOIN tbl_playerdata tpd ON tpd.PlayerID = chat.playerId AND tpd.GameID = ?
      ${adkatsAvailable ? "LEFT JOIN adkats_bans adk ON adk.player_id = tpd.PlayerID" : ""}
      ORDER BY FIELD(chat.id, ${orderedIdPlaceholders})
    `,
    logParams
  );

  return {
    entries: rows.map((row) => ({
      id: Number(row.id),
      serverId: Number(row.serverId),
      serverName: row.serverName ?? null,
      logDate: fromLoggerTime(row.logDate),
      soldierName: row.soldierName ?? "",
      countryCode: row.countryCode ?? null,
      message: row.message,
      subset: row.subset ?? null,
      playerId: row.playerId === null ? null : Number(row.playerId),
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
