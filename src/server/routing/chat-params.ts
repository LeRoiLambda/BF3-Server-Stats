import {
  dayStartInZone,
  parseSqlDateTime,
  wallClockToInstant
} from "@/src/server/utils/time-zones";

export type ChatChannel = "global" | "team" | "squad";

export const CHAT_CHANNELS: readonly ChatChannel[] = ["global", "team", "squad"];

// Messages per load, on the page and from /api/chat.
export const CHAT_PAGE_SIZE = 50;

// Which messages of the chat log are shown: the latest ones, those before or
// after a message, those around a message, or those of a day, or of an hour
// of it, read back from its end: the messages sent before `end`.
export type ChatPosition =
  | { kind: "latest" }
  | { kind: "before"; messageId: number }
  | { kind: "after"; messageId: number }
  | { kind: "around"; messageId: number }
  | { kind: "until"; end: Date };

// The "jump to" fields: a "YYYY-MM-DD" date and an hour of it, or "".
export type ChatJump = {
  date: string;
  hour: string;
};

export type ChatFilters = {
  // The search field as typed, and the words and quoted phrases it asks for.
  text: string;
  terms: string[];
  playerId: number | null;
  channel: ChatChannel | null;
};

export type ChatParams = ChatFilters & {
  position: ChatPosition;
  jump: ChatJump;
};

const MAX_TERMS = 8;
const MAX_TERM_LENGTH = 100;
const ID_PATTERN = /^\d{1,15}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const HOUR_PATTERN = /^\d{1,2}$/;
const TERM_PATTERN = /"([^"]*)"|(\S+)/g;

// Every term must appear in a message, in any order: `ak 47` finds messages
// with both words, `"ak 47"` the phrase.
export function parseChatTerms(text: string): string[] {
  const terms: string[] = [];
  const seen = new Set<string>();

  for (const match of text.matchAll(TERM_PATTERN)) {
    const term = (match[1] ?? match[2].replaceAll('"', ""))
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, MAX_TERM_LENGTH);
    const key = term.toLowerCase();
    if (term && !seen.has(key) && terms.length < MAX_TERMS) {
      seen.add(key);
      terms.push(term);
    }
  }

  return terms;
}

export function parseChatChannel(value: string | null): ChatChannel | null {
  const channel = value?.trim().toLowerCase();
  return CHAT_CHANNELS.find((entry) => entry === channel) ?? null;
}

// Message and player ids; 0 stands before the first message.
function parseId(value: string | null): number | null {
  const trimmed = value?.trim() ?? "";
  return ID_PATTERN.test(trimmed) ? Number(trimmed) : null;
}

function parsePositiveId(value: string | null): number | null {
  const id = parseId(value);
  return id !== null && id > 0 ? id : null;
}

// A day, "2026-09-25", and optionally an hour of it, 0 to 23, read in
// `timeZone`: the chat from the end of that day or hour back. An hour it
// cannot read stands for the whole day. Years before 1970 or after 9998 are
// refused: the logger's clock must stay within the database's DATETIME range.
export function parseChatDayEnd(date: string, hour: string, timeZone: string): Date | null {
  const wallClock = DATE_PATTERN.test(date) ? parseSqlDateTime(`${date} 00:00:00`) : null;
  if (!wallClock || wallClock.year < 1970 || wallClock.year > 9998) {
    return null;
  }

  const hourNumber = HOUR_PATTERN.test(hour) ? Number(hour) : null;
  const dayHour = hourNumber !== null && hourNumber <= 22 ? hourNumber : null;

  return dayHour === null
    ? dayStartInZone(date, timeZone, 1)
    : wallClockToInstant({ ...wallClock, hour: dayHour + 1 }, timeZone);
}

function readPosition(
  get: (name: string) => string | null,
  jump: ChatJump,
  timeZone: string
): ChatPosition {
  const around = parsePositiveId(get("msg"));
  if (around !== null) {
    return { kind: "around", messageId: around };
  }

  const end = jump.date ? parseChatDayEnd(jump.date, jump.hour, timeZone) : null;
  if (end) {
    return { kind: "until", end };
  }

  const before = parsePositiveId(get("before"));
  if (before !== null) {
    return { kind: "before", messageId: before };
  }

  const after = parseId(get("after"));
  if (after !== null) {
    return { kind: "after", messageId: after };
  }

  return { kind: "latest" };
}

// Reads the chat page's query: q, player and channel filter the messages;
// msg, date (with hour), before and after place them, in that order of
// precedence. Days are read in `timeZone`.
export function readChatParams(
  get: (name: string) => string | null,
  timeZone: string
): ChatParams {
  const text = get("q")?.trim() ?? "";
  const jump = { date: get("date")?.trim() ?? "", hour: get("hour")?.trim() ?? "" };

  return {
    text,
    terms: parseChatTerms(text),
    playerId: parsePositiveId(get("player")),
    channel: parseChatChannel(get("channel")),
    position: readPosition(get, jump, timeZone),
    jump
  };
}

// The query that keeps the filters, for links that move through the log.
export function chatFilterQuery(filters: ChatFilters): Record<string, string | null> {
  return {
    q: filters.text || null,
    player: filters.playerId === null ? null : String(filters.playerId),
    channel: filters.channel
  };
}
