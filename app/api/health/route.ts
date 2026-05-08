import { NextResponse } from "next/server";
import { pingDatabase } from "@/src/server/db/health";
import { getLegacyServerContext } from "@/src/server/repositories/server-repository";

export async function GET() {
  try {
    const dbUp = await pingDatabase();
    const context = await getLegacyServerContext();

    return NextResponse.json({
      status: "ok",
      database: dbUp ? "up" : "unknown",
      gameId: context.gameId,
      activeServers: context.servers.length,
      validIds: context.validIdsCsv,
      checkedAt: new Date().toISOString()
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown health-check error";

    return NextResponse.json(
      {
        status: "error",
        error: message,
        checkedAt: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
