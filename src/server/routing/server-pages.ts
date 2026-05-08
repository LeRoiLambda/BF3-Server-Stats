import { notFound, redirect } from "next/navigation";
import {
  getLegacyServerContext,
  type LegacyServerContext
} from "@/src/server/repositories/server-repository";
import type { ServerSection } from "@/src/server/routing/sections";

export type AllServersPageScope = {
  context: LegacyServerContext;
  gameId: number;
  serverIds: number[];
};

export function allServersHref(
  section: ServerSection,
  query: Record<string, string | number | null | undefined> = {}
): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }

  const queryString = params.toString();
  const path = `/servers/${section}`;
  return queryString ? `${path}?${queryString}` : path;
}

export function serverSectionHref(serverId: number, section: ServerSection): string {
  if (section === "home") {
    return `/servers/${serverId}`;
  }

  return `/servers/${serverId}/${section}`;
}

export function nextOrder<TSort extends string>(
  currentSort: TSort,
  sort: TSort,
  order: "asc" | "desc",
  defaultOrder: "asc" | "desc"
): "asc" | "desc" {
  if (currentSort !== sort) {
    return defaultOrder;
  }

  return order === "asc" ? "desc" : "asc";
}

export async function getAllServersPageScope(
  section: ServerSection
): Promise<AllServersPageScope> {
  const context = await getLegacyServerContext();

  if (context.servers.length === 1) {
    redirect(serverSectionHref(context.servers[0].serverId, section));
  }

  if (!context.gameId || context.servers.length === 0) {
    notFound();
  }

  return {
    context,
    gameId: context.gameId,
    serverIds: context.servers.map((server) => server.serverId)
  };
}
