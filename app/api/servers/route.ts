import { NextResponse } from "next/server";
import { listActiveServers } from "@/src/server/repositories/server-repository";

export async function GET() {
  try {
    const servers = await listActiveServers();

    return NextResponse.json({
      count: servers.length,
      servers
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown server-query error";

    return NextResponse.json(
      {
        error: message
      },
      { status: 500 }
    );
  }
}
