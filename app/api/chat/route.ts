import { NextRequest, NextResponse } from "next/server";
import { toChatMessageView } from "@/components/chat/chat-message-view";
import { getChatLog } from "@/src/server/repositories/chat-repository";
import { getServerContext } from "@/src/server/repositories/server-repository";
import { CHAT_PAGE_SIZE, readChatParams } from "@/src/server/routing/chat-params";
import { parsePositiveInt } from "@/src/server/routing/params";

export const revalidate = 0;

// The chat page's messages, for loading older or newer ones in place and for
// following new ones: the same filters as the page (q, player, channel), sid
// for one server, and before or after a message id.
export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const context = await getServerContext();
  const requestedServerId = parsePositiveInt(search.get("sid") ?? "");
  const server = context.servers.find((entry) => entry.serverId === requestedServerId);
  const gameId = server?.gameId ?? context.gameId;
  if (!gameId || context.servers.length === 0) {
    return NextResponse.json({ messages: [], hasOlder: false, hasNewer: false, latestLoggedId: 0 });
  }

  const params = readChatParams((name) => search.get(name));
  const position =
    params.position.kind === "before" || params.position.kind === "after"
      ? params.position
      : { kind: "latest" as const };
  const log = await getChatLog({
    serverIds: server ? [server.serverId] : context.servers.map((entry) => entry.serverId),
    gameId,
    terms: params.terms,
    playerId: params.playerId,
    channel: params.channel,
    position,
    size: CHAT_PAGE_SIZE
  });
  const scope = { showServer: !server, serverId: server?.serverId ?? null };

  return NextResponse.json({
    messages: log.messages.map((message) => toChatMessageView(message, scope)),
    hasOlder: log.hasOlder,
    hasNewer: log.hasNewer,
    latestLoggedId: log.latestLoggedId
  });
}
