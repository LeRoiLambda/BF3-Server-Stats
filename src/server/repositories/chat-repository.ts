import { RowDataPacket } from "mysql2";
import { getDbPool } from "@/src/server/db/pool";
import { hasColumn, hasTable } from "@/src/server/db/schema";
import { containsPattern, searchableText } from "@/src/server/db/search";
import { buildServerScopeCondition } from "@/src/server/repositories/server-scope";
import type { ChatChannel, ChatPosition } from "@/src/server/routing/chat-params";
import { fromLoggerTime, toLoggerTime } from "@/src/server/utils/logger-clock";
import {
  formatSqlDateTime,
  naiveDateToWallClock,
  parseUtcDateTime
} from "@/src/server/utils/time-zones";

export type ChatPlayer = {
  playerId: number;
  soldierName: string;
  countryCode: string | null;
};

export type ChatMessage = {
  id: number;
  serverId: number;
  serverName: string | null;
  sentAt: Date | null;
  speaker: string;
  playerId: number | null;
  countryCode: string | null;
  banStatus: "active" | "expired" | null;
  // tbl_chatlog.logSubset: "Global", "Team" or "Squad".
  subset: string | null;
  text: string;
};

export type ChatLogInput = {
  serverIds: number[];
  gameId: number;
  terms: string[];
  playerId: number | null;
  channel: ChatChannel | null;
  position: ChatPosition;
  size: number;
};

// A run of consecutive matching messages, newest first.
export type ChatLog = {
  // The player whose messages are shown, when the filter names one that exists.
  player: ChatPlayer | null;
  messages: ChatMessage[];
  hasOlder: boolean;
  hasNewer: boolean;
  // The chat log's highest id before the messages were read. New messages
  // matching the filters come after it, however far back the last match is.
  latestLoggedId: number;
};

// Ids of consecutive matching messages, newest first.
export type ChatWindow = {
  ids: number[];
  hasOlder: boolean;
  hasNewer: boolean;
};

type Condition = {
  sql: string;
  params: Array<string | number>;
};

type IdRow = RowDataPacket & {
  id: number;
};

type SentRow = RowDataPacket & {
  id: number;
  logDate: string | null;
};

type ServerIdRow = RowDataPacket & {
  serverId: number;
};

type ChatPlayerRow = RowDataPacket & {
  playerId: number;
  soldierName: string | null;
  countryCode: string | null;
};

type ChatRow = RowDataPacket & {
  id: number;
  serverId: number;
  serverName: string | null;
  logDate: string | null;
  soldierName: string | null;
  countryCode: string | null;
  message: string | null;
  subset: string | null;
  playerId: number | null;
  banStatus?: string | null;
};

const MAX_CHAT_WINDOW_SIZE = 100;

const CHANNEL_SUBSETS: Record<ChatChannel, string> = {
  global: "Global",
  team: "Team",
  squad: "Squad"
};

const EMPTY_WINDOW: ChatWindow = { ids: [], hasOlder: false, hasNewer: false };

// Splits `size` messages between those before an anchor and the anchor with
// those after it, half each where both sides have enough. `older` is newest
// first and `newer` oldest first, each fetched `size + 1` deep.
export function centerChatWindow(older: number[], newer: number[], size: number): ChatWindow {
  const half = Math.floor(size / 2);
  const newerCount = Math.min(newer.length, size - Math.min(older.length, half));
  const olderCount = Math.min(older.length, size - newerCount);

  return {
    ids: [...newer.slice(0, newerCount).reverse(), ...older.slice(0, olderCount)],
    hasOlder: older.length > olderCount,
    hasNewer: newer.length > newerCount
  };
}

// The stored value for `instant` in tbl_chatlog.logDate. AdKats writes the
// chat log in UTC on servers where its "Post Stat Logger Chat Manually"
// setting is on; the stats logger writes it on its own clock elsewhere.
export function chatLogTime(instant: Date, postedByAdkats: boolean): string {
  return postedByAdkats
    ? formatSqlDateTime(naiveDateToWallClock(instant))
    : toLoggerTime(instant);
}

export function chatLogInstant(value: unknown, postedByAdkats: boolean): Date | null {
  return postedByAdkats ? parseUtcDateTime(value) : fromLoggerTime(value);
}

async function readLatestLoggedId(): Promise<number> {
  const [rows] = await getDbPool().query<IdRow[]>(
    "SELECT COALESCE(MAX(ID), 0) AS id FROM tbl_chatlog"
  );

  return Number(rows[0]?.id ?? 0);
}

// The servers, among `serverIds`, whose chat log AdKats writes. The setting's
// current value applies to all of a server's chat, including lines written
// before it changed.
async function listAdkatsChatServerIds(serverIds: number[]): Promise<Set<number>> {
  if (serverIds.length === 0 || !(await hasTable("adkats_settings"))) {
    return new Set();
  }

  const scope = buildServerScopeCondition("server_id", { serverIds });
  const [rows] = await getDbPool().query<ServerIdRow[]>(
    `
      SELECT server_id AS serverId
      FROM adkats_settings
      WHERE ${scope.sql}
        AND setting_name = 'Post Stat Logger Chat Manually'
        AND LOWER(TRIM(setting_value)) = 'true'
    `,
    scope.params
  );

  return new Set(rows.map((row) => Number(row.serverId)));
}

export async function getChatPlayer(
  playerId: number,
  gameId: number
): Promise<ChatPlayer | null> {
  const [rows] = await getDbPool().query<ChatPlayerRow[]>(
    `
      SELECT
        PlayerID AS playerId,
        SoldierName AS soldierName,
        CountryCode AS countryCode
      FROM tbl_playerdata
      WHERE PlayerID = ?
        AND GameID = ?
      LIMIT 1
    `,
    [playerId, gameId]
  );

  const row = rows[0];
  return row?.soldierName
    ? {
        playerId: Number(row.playerId),
        soldierName: row.soldierName,
        countryCode: row.countryCode ?? null
      }
    : null;
}

// Messages from a player carry their id in logPlayerID, which only AdKats
// adds and fills. Lines without one are matched by the speaker's name, as
// when they are shown.
async function messageFilter(input: ChatLogInput, player: ChatPlayer | null): Promise<Condition> {
  const scope = buildServerScopeCondition("cl.ServerID", { serverIds: input.serverIds });
  const parts = [scope.sql];
  const params: Array<string | number> = [...scope.params];

  if (input.channel) {
    parts.push("cl.logSubset = ?");
    params.push(CHANNEL_SUBSETS[input.channel]);
  }

  if (player) {
    const speakerSql = `${searchableText("cl.logSoldierName")} = ?`;
    if (await hasColumn("tbl_chatlog", "logPlayerID")) {
      parts.push(`(cl.logPlayerID = ? OR (cl.logPlayerID IS NULL AND ${speakerSql}))`);
      params.push(player.playerId, player.soldierName);
    } else {
      parts.push(speakerSql);
      params.push(player.soldierName);
    }
  }

  for (const term of input.terms) {
    parts.push(`${searchableText("cl.logMessage")} LIKE ?`);
    params.push(containsPattern(term));
  }

  return { sql: parts.join(" AND "), params };
}

// Ids of matching messages past `bound`, walking the log newest first (DESC)
// or oldest first (ASC). Ids follow the order messages were logged in.
async function selectMessageIds(
  filter: Condition,
  bound: Condition | null,
  direction: "ASC" | "DESC",
  limit: number
): Promise<number[]> {
  const [rows] = await getDbPool().query<IdRow[]>(
    `
      SELECT cl.ID AS id
      FROM tbl_chatlog cl
      WHERE ${filter.sql}
        ${bound ? `AND ${bound.sql}` : ""}
      ORDER BY cl.ID ${direction}
      LIMIT ?
    `,
    [...filter.params, ...(bound?.params ?? []), limit]
  );

  return rows.map((row) => Number(row.id));
}

async function selectLatestWindow(filter: Condition, size: number): Promise<ChatWindow> {
  const ids = await selectMessageIds(filter, null, "DESC", size + 1);

  return { ids: ids.slice(0, size), hasOlder: ids.length > size, hasNewer: false };
}

async function selectWindowBefore(
  filter: Condition,
  messageId: number,
  size: number
): Promise<ChatWindow> {
  const ids = await selectMessageIds(
    filter,
    { sql: "cl.ID < ?", params: [messageId] },
    "DESC",
    size + 1
  );

  return { ids: ids.slice(0, size), hasOlder: ids.length > size, hasNewer: true };
}

async function selectWindowAround(
  filter: Condition,
  anchorId: number,
  size: number
): Promise<ChatWindow> {
  const [older, newer] = await Promise.all([
    selectMessageIds(filter, { sql: "cl.ID < ?", params: [anchorId] }, "DESC", size + 1),
    selectMessageIds(filter, { sql: "cl.ID >= ?", params: [anchorId] }, "ASC", size + 1)
  ]);

  return centerChatWindow(older, newer, size);
}

// The first matching message sent at or after `instant`. Each server's
// logDate is read on the clock its chat log is written with, so servers whose
// chat AdKats writes are searched apart from the others.
async function firstMessageIdSince(
  filter: Condition,
  instant: Date,
  serverIds: number[],
  adkatsServerIds: Set<number>
): Promise<number | null> {
  const groups = [true, false]
    .map((postedByAdkats) => ({
      postedByAdkats,
      serverIds: serverIds.filter((serverId) => adkatsServerIds.has(serverId) === postedByAdkats)
    }))
    .filter((group) => group.serverIds.length > 0);
  const firsts = await Promise.all(
    groups.map(async (group) => {
      const scope = buildServerScopeCondition("cl.ServerID", { serverIds: group.serverIds });
      const [rows] = await getDbPool().query<SentRow[]>(
        `
          SELECT cl.ID AS id, cl.logDate AS logDate
          FROM tbl_chatlog cl
          WHERE ${filter.sql}
            AND ${scope.sql}
            AND cl.logDate >= ?
          ORDER BY cl.logDate ASC, cl.ID ASC
          LIMIT 1
        `,
        [...filter.params, ...scope.params, chatLogTime(instant, group.postedByAdkats)]
      );
      const row = rows[0];

      return row
        ? {
            id: Number(row.id),
            sentAt: chatLogInstant(row.logDate, group.postedByAdkats)?.getTime() ?? Infinity
          }
        : null;
    })
  );
  const [first] = firsts
    .filter((entry) => entry !== null)
    .sort((a, b) => a.sentAt - b.sentAt || a.id - b.id);

  return first?.id ?? null;
}

async function loadMessages(
  ids: number[],
  gameId: number,
  adkatsServerIds: Set<number>
): Promise<ChatMessage[]> {
  if (ids.length === 0) {
    return [];
  }

  const [adkatsBansAvailable, loggedPlayerIdAvailable] = await Promise.all([
    hasTable("adkats_bans"),
    hasColumn("tbl_chatlog", "logPlayerID")
  ]);
  // Server messages and speakers without a player record keep a null player.
  const namedPlayerIdSql = `(
    SELECT MIN(p.PlayerID)
    FROM tbl_playerdata p
    WHERE p.GameID = ?
      AND p.SoldierName = cl.logSoldierName
  )`;
  const [rows] = await getDbPool().query<ChatRow[]>(
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
        ${adkatsBansAvailable ? ", adk.ban_status AS banStatus" : ""}
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
        WHERE cl.ID IN (${ids.map(() => "?").join(", ")})
      ) chat
      LEFT JOIN tbl_server ts ON ts.ServerID = chat.serverId
      LEFT JOIN tbl_playerdata tpd ON tpd.PlayerID = chat.playerId AND tpd.GameID = ?
      ${adkatsBansAvailable ? "LEFT JOIN adkats_bans adk ON adk.player_id = tpd.PlayerID" : ""}
      ORDER BY chat.id DESC
    `,
    [gameId, ...ids, gameId]
  );

  return rows.map((row) => {
    const serverId = Number(row.serverId);

    return {
      id: Number(row.id),
      serverId,
      serverName: row.serverName ?? null,
      sentAt: chatLogInstant(row.logDate, adkatsServerIds.has(serverId)),
      speaker: row.soldierName ?? "",
      playerId: row.playerId === null ? null : Number(row.playerId),
      countryCode: row.countryCode ?? null,
      banStatus:
        row.banStatus === "Active"
          ? "active"
          : row.banStatus === "Expired"
            ? "expired"
            : null,
      subset: row.subset ?? null,
      text: row.message ?? ""
    };
  });
}

// Reads `size` consecutive messages that match the filters, at the position
// asked for, newest first in the order they were logged.
export async function getChatLog(input: ChatLogInput): Promise<ChatLog> {
  const latestLoggedId = await readLatestLoggedId();
  const player =
    input.playerId === null ? null : await getChatPlayer(input.playerId, input.gameId);
  if (input.playerId !== null && !player) {
    return { player: null, messages: [], hasOlder: false, hasNewer: false, latestLoggedId };
  }

  const size = Math.max(1, Math.min(MAX_CHAT_WINDOW_SIZE, Math.floor(input.size)));
  const [filter, adkatsServerIds] = await Promise.all([
    messageFilter(input, player),
    listAdkatsChatServerIds(input.serverIds)
  ]);
  const position = input.position;
  let chatWindow = EMPTY_WINDOW;

  switch (position.kind) {
    case "latest":
      chatWindow = await selectLatestWindow(filter, size);
      break;
    case "before":
      chatWindow = await selectWindowBefore(filter, position.messageId, size);
      break;
    case "after": {
      const ids = await selectMessageIds(
        filter,
        { sql: "cl.ID > ?", params: [position.messageId] },
        "ASC",
        size + 1
      );
      chatWindow = {
        ids: ids.slice(0, size).reverse(),
        hasOlder: position.messageId > 0,
        hasNewer: ids.length > size
      };
      break;
    }
    case "around":
      chatWindow = await selectWindowAround(filter, position.messageId, size);
      break;
    case "at": {
      // The chat as it was at the instant: the messages logged before the
      // first one sent since.
      const sinceId = await firstMessageIdSince(
        filter,
        position.instant,
        input.serverIds,
        adkatsServerIds
      );
      chatWindow =
        sinceId === null
          ? await selectLatestWindow(filter, size)
          : await selectWindowBefore(filter, sinceId, size);
      break;
    }
  }

  return {
    player,
    messages: await loadMessages(chatWindow.ids, input.gameId, adkatsServerIds),
    hasOlder: chatWindow.hasOlder,
    hasNewer: chatWindow.hasNewer,
    latestLoggedId
  };
}
