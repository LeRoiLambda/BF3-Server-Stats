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

export type ChatMessageView = {
  id: number;
  serverName: string | null;
  channel: string | null;
  channelTone: ChatChannelTone;
  speaker: string;
  fromServer: boolean;
  playerId: number | null;
  playerHref: string | null;
  flag: { src: string; label: string } | null;
  banStatus: "active" | "expired" | null;
  text: string;
  sentAt: {
    iso: string;
    day: string;
    dayLabel: string;
    clock: string;
    label: string;
  } | null;
  contextHref: string;
};

export type ChatMessageViewScope = {
  showServer: boolean;
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

export function formatChatDay(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return dayLabel(new Date(Date.UTC(year, month - 1, day)), "UTC");
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
