import { ChatFilters } from "@/components/chat/chat-filters";
import { chatQuery } from "@/components/chat/chat-href";
import { formatChatMoment, toChatMessageView } from "@/components/chat/chat-message-view";
import { ChatTranscript } from "@/components/chat/chat-transcript";
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

function emptyLabel(params: ChatParams, filtered: boolean, timeZone: string): string {
  const matching = filtered ? "matching " : "";

  switch (params.position.kind) {
    case "before":
      return `No earlier ${matching}messages.`;
    case "after":
      return `No newer ${matching}messages yet.`;
    case "at":
      return `No ${matching}messages before ${formatChatMoment(params.position.instant, timeZone)}.`;
    default:
      return filtered ? "No messages match these filters." : "No chat messages yet.";
  }
}

// What the page shows instead of the latest messages; null for those.
function positionLabel(params: ChatParams, timeZone: string): string | null {
  switch (params.position.kind) {
    case "latest":
      return null;
    case "at":
      return `Messages before ${formatChatMoment(params.position.instant, timeZone)}`;
    case "around":
      return "A message in its conversation";
    default:
      return "Earlier messages";
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
          anchorId={params.position.kind === "around" ? params.position.messageId : null}
          positionLabel={positionLabel(params, timeZone)}
          terms={params.terms}
          pagePath={pagePath}
          filterQuery={filterQuery}
          apiQuery={chatQuery({
            ...filterValues,
            sid: serverId === null ? null : String(serverId)
          })}
          timeZone={timeZone}
          filtered={filtered}
          emptyLabel={emptyLabel(params, filtered, timeZone)}
        />
      </section>
    </StatsShell>
  );
}
