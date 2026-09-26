import { ChatFilters } from "@/components/chat/chat-filters";
import { chatQuery } from "@/components/chat/chat-href";
import { toChatMessageView } from "@/components/chat/chat-message-view";
import { ChatTranscript, type ChatTranscriptAnchor } from "@/components/chat/chat-transcript";
import { StatsShell } from "@/components/layout/stats-shell";
import { ui } from "@/components/layout/stats-ui";
import { getChatLog } from "@/src/server/repositories/chat-repository";
import {
  CHAT_PAGE_SIZE,
  chatFilterQuery,
  readChatParams,
  type ChatParams,
  type ChatPosition
} from "@/src/server/routing/chat-params";
import { firstValue } from "@/src/server/routing/params";
import {
  scopeHref,
  scopeName,
  scopeServerId,
  type PageScope,
  type SearchParams
} from "@/src/server/routing/server-pages";
import { siteTimeZone } from "@/src/server/utils/site-time";
import { formatInZone } from "@/src/server/utils/time-zones";

type ChatSectionProps = {
  scope: PageScope;
  searchParams: SearchParams;
};

// Opening the page at another position shows a new transcript.
function positionKey(position: ChatPosition): string {
  switch (position.kind) {
    case "latest":
      return position.kind;
    case "at":
      return `at:${position.instant.toISOString()}`;
    default:
      return `${position.kind}:${position.messageId}`;
  }
}

function emptyLabel(params: ChatParams, filtered: boolean): string {
  const matching = filtered ? "matching " : "";

  switch (params.position.kind) {
    case "before":
      return `No earlier ${matching}messages.`;
    case "after":
      return `No newer ${matching}messages yet.`;
    default:
      return filtered ? "No messages match these filters." : "No chat messages yet.";
  }
}

function transcriptAnchor(
  params: ChatParams,
  anchorId: number | null,
  timeZone: string
): ChatTranscriptAnchor | null {
  switch (params.position.kind) {
    case "around":
      return { kind: "message", messageId: params.position.messageId };
    case "at":
      return {
        kind: "time",
        messageId: anchorId,
        label: formatInZone(params.position.instant, timeZone)
      };
    default:
      return null;
  }
}

export async function ChatSection({ scope, searchParams }: ChatSectionProps) {
  const timeZone = siteTimeZone();
  const params = readChatParams((name) => firstValue(searchParams[name]), timeZone);
  const serverId = scopeServerId(scope);
  const log = await getChatLog({
    serverIds: scope.kind === "all" ? scope.serverIds : [scope.server.serverId],
    gameId: scope.gameId,
    terms: params.terms,
    playerId: params.playerId,
    channel: params.channel,
    position: params.position,
    size: CHAT_PAGE_SIZE
  });
  const viewScope = { showServer: scope.kind === "all", serverId };
  const filtered = params.terms.length > 0 || params.playerId !== null || params.channel !== null;
  const filterValues = chatFilterQuery(params);
  const filterQuery = chatQuery(filterValues);
  const pagePath = scopeHref(scope, "chat");

  return (
    <StatsShell
      title={`${scopeName(scope)} - Chat`}
      subtitle={
        scope.kind === "all"
          ? "The chat of every server as it happens. Search it, follow one player or channel, or jump to any moment."
          : "The server's chat as it happens. Search it, follow one player or channel, or jump to any moment."
      }
      servers={scope.context.servers}
      currentServerId={serverId}
      activeSection="chat"
    >
      <section className={ui.panel}>
        <ChatFilters
          params={params}
          player={log.player}
          pagePath={pagePath}
          filterValues={filterValues}
          filterQuery={filterQuery}
        />
        <ChatTranscript
          key={`${filterQuery}|${positionKey(params.position)}`}
          initial={{
            messages: log.messages.map((message) =>
              toChatMessageView(message, viewScope, timeZone)
            ),
            hasOlder: log.hasOlder,
            hasNewer: log.hasNewer,
            latestLoggedId: log.latestLoggedId
          }}
          anchor={transcriptAnchor(params, log.anchorId, timeZone)}
          positioned={params.position.kind !== "latest"}
          terms={params.terms}
          pagePath={pagePath}
          filterQuery={filterQuery}
          apiQuery={chatQuery({
            ...filterValues,
            sid: serverId === null ? null : String(serverId)
          })}
          timeZone={timeZone}
          filtered={filtered}
          emptyLabel={emptyLabel(params, filtered)}
        />
      </section>
    </StatsShell>
  );
}
