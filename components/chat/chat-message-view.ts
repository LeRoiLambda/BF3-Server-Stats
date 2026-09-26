import { playerHref } from "@/components/stats/player-link";
import {
  countryFlagImagePath,
  formatCountryName
} from "@/src/server/domain/bf3-reference";
import type { ChatMessage } from "@/src/server/repositories/chat-repository";
import { serverSectionHref } from "@/src/server/routing/server-pages";
import {
  formatInZone,
  formatSqlDateTime,
  wallClockInTimeZone
} from "@/src/server/utils/time-zones";

export type ChatChannelTone = "global" | "team" | "squad" | "other";

// A chat message as the transcript shows it, with its times on the site's
// clock and its links, so pages and /api/chat hand the browser the same shape.
export type ChatMessageView = {
  id: number;
  // Set on pages that list several servers.
  serverName: string | null;
  channel: string | null;
  channelTone: ChatChannelTone;
  speaker: string;
  // Said by the game server, such as admin announcements.
  fromServer: boolean;
  playerId: number | null;
  playerHref: string | null;
  flag: { src: string; label: string } | null;
  banStatus: "active" | "expired" | null;
  text: string;
  sentAt: {
    iso: string;
    // "YYYY-MM-DD" and "Thursday, September 24, 2026" on the site's clock.
    day: string;
    dayLabel: string;
    // "21:04:31", and "2026-09-24 21:04:31 PDT" for its tooltip.
    clock: string;
    label: string;
  } | null;
  // The message among the whole conversation on its server.
  contextHref: string;
};

export type ChatMessageViewScope = {
  showServer: boolean;
  // The server that player links stay on; null for all servers.
  serverId: number | null;
};

const dayFormats = new Map<string, Intl.DateTimeFormat>();

function dayLabel(instant: Date, timeZone: string): string {
  let format = dayFormats.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    dayFormats.set(timeZone, format);
  }

  return format.format(instant);
}

// "21:00 on Thursday, September 24, 2026", in `timeZone`.
export function formatChatMoment(instant: Date, timeZone: string): string {
  const clock = formatSqlDateTime(wallClockInTimeZone(instant, timeZone)).slice(11, 16);
  return `${clock} on ${dayLabel(instant, timeZone)}`;
}

function channelTone(subset: string | null): ChatChannelTone {
  switch (subset?.trim().toLowerCase()) {
    case "global":
      return "global";
    case "team":
      return "team";
    case "squad":
      return "squad";
    default:
      return "other";
  }
}

export function toChatMessageView(
  message: ChatMessage,
  scope: ChatMessageViewScope,
  timeZone: string
): ChatMessageView {
  const sentAt = message.sentAt;
  const wallTime = sentAt ? formatSqlDateTime(wallClockInTimeZone(sentAt, timeZone)) : null;
  const fromServer = message.playerId === null && message.speaker === "Server";

  return {
    id: message.id,
    serverName: scope.showServer ? (message.serverName ?? `Server #${message.serverId}`) : null,
    channel: message.subset,
    channelTone: channelTone(message.subset),
    speaker: message.speaker,
    fromServer,
    playerId: message.playerId,
    playerHref: message.playerId === null ? null : playerHref(message.playerId, scope.serverId),
    flag: fromServer
      ? null
      : {
          src: countryFlagImagePath(message.countryCode),
          label: formatCountryName(message.countryCode)
        },
    banStatus: message.banStatus,
    text: message.text,
    sentAt:
      sentAt && wallTime
        ? {
            iso: sentAt.toISOString(),
            day: wallTime.slice(0, 10),
            dayLabel: dayLabel(sentAt, timeZone),
            clock: wallTime.slice(11),
            label: formatInZone(sentAt, timeZone)
          }
        : null,
    contextHref: serverSectionHref(message.serverId, "chat", { msg: message.id })
  };
}
