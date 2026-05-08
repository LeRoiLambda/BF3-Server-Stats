import { NextRequest, NextResponse } from "next/server";
import { searchChatSuggestions } from "@/src/server/repositories/chat-repository";
import { getLegacyServerContext } from "@/src/server/repositories/server-repository";

export const revalidate = 0;

function parseServerId(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function parseLimit(value: string | null): number {
  if (!value) {
    return 8;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 8;
  }

  return Math.min(12, parsed);
}

export async function GET(request: NextRequest) {
  const term = request.nextUrl.searchParams.get("term")?.trim() ?? "";
  if (term.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const context = await getLegacyServerContext();
  if (!context.gameId || context.servers.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  const requestedServerId = parseServerId(request.nextUrl.searchParams.get("sid"));
  const serverId =
    requestedServerId !== null &&
    context.servers.some((server) => server.serverId === requestedServerId)
      ? requestedServerId
      : null;
  const limit = parseLimit(request.nextUrl.searchParams.get("limit"));

  const suggestions = await searchChatSuggestions({
    query: term,
    gameId: context.gameId,
    ...(serverId === null
      ? { serverIds: context.servers.map((server) => server.serverId) }
      : { serverId }),
    limit
  });

  return NextResponse.json({ suggestions });
}
