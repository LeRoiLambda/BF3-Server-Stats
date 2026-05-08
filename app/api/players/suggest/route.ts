import { NextRequest, NextResponse } from "next/server";
import { searchPlayersByName } from "@/src/server/repositories/player-profile-repository";
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
    return 10;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 10;
  }

  return Math.min(20, parsed);
}

export async function GET(request: NextRequest) {
  const term = request.nextUrl.searchParams.get("term")?.trim() ?? "";
  if (term.length < 2) {
    return NextResponse.json({ suggestions: [], players: [] });
  }

  const context = await getLegacyServerContext();
  if (!context.gameId) {
    return NextResponse.json({ suggestions: [], players: [] });
  }

  const requestedServerId = parseServerId(request.nextUrl.searchParams.get("sid"));
  const serverId =
    requestedServerId !== null &&
    context.servers.some((server) => server.serverId === requestedServerId)
      ? requestedServerId
      : null;
  const limit = parseLimit(request.nextUrl.searchParams.get("limit"));

  const players = await searchPlayersByName({
    query: term,
    gameId: context.gameId,
    serverId,
    limit
  });

  const suggestions = Array.from(new Set(players.map((player) => player.soldierName)));
  return NextResponse.json({
    suggestions,
    players: players.map((player) => ({
      playerId: player.playerId,
      soldierName: player.soldierName,
      countryCode: player.countryCode,
      score: player.score,
      kills: player.kills,
      kdr: player.kdr,
      banStatus: player.banStatus
    }))
  });
}
