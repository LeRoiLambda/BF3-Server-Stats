import { notFound, redirect } from "next/navigation";
import {
  getServerContext,
  type ActiveServer,
  type ServerContext
} from "@/src/server/repositories/server-repository";
import type { ServerScopeInput } from "@/src/server/repositories/server-scope";
import { parsePositiveInt } from "@/src/server/routing/params";
import type { ServerSection } from "@/src/server/routing/sections";

export type SearchParams = Record<string, string | string[] | undefined>;

export type AllServersPageProps = {
  searchParams?: Promise<SearchParams>;
};

export type ServerPageProps = {
  params: Promise<{ sid: string }>;
  searchParams?: Promise<SearchParams>;
};

export type AllServersPageScope = {
  kind: "all";
  context: ServerContext;
  gameId: number;
  serverIds: number[];
};

export type ServerPageScope = {
  kind: "server";
  context: ServerContext;
  gameId: number;
  server: ActiveServer;
};

// A section page shows either every server the site lists or one of them.
export type PageScope = AllServersPageScope | ServerPageScope;

type HrefQuery = Record<string, string | number | null | undefined>;

function withQuery(path: string, query: HrefQuery): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }

  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}

export function allServersHref(section: ServerSection, query: HrefQuery = {}): string {
  return withQuery(`/servers/${section}`, query);
}

export function serverSectionHref(
  serverId: number,
  section: ServerSection,
  query: HrefQuery = {}
): string {
  const path = section === "home" ? `/servers/${serverId}` : `/servers/${serverId}/${section}`;
  return withQuery(path, query);
}

export function scopeHref(
  scope: PageScope,
  section: ServerSection,
  query: HrefQuery = {}
): string {
  return scope.kind === "all"
    ? allServersHref(section, query)
    : serverSectionHref(scope.server.serverId, section, query);
}

export function scopeName(scope: PageScope): string {
  return scope.kind === "all" ? "All Servers" : scope.server.serverName;
}

// The server that player links and searches stay on; null for all servers.
export function scopeServerId(scope: PageScope): number | null {
  return scope.kind === "all" ? null : scope.server.serverId;
}

export function scopeServers(scope: PageScope): ServerScopeInput {
  return scope.kind === "all"
    ? { serverIds: scope.serverIds }
    : { serverId: scope.server.serverId };
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
  const context = await getServerContext();

  if (context.servers.length === 1) {
    redirect(serverSectionHref(context.servers[0].serverId, section));
  }

  if (!context.gameId || context.servers.length === 0) {
    notFound();
  }

  return {
    kind: "all",
    context,
    gameId: context.gameId,
    serverIds: context.servers.map((server) => server.serverId)
  };
}

export async function getServerPageScope(
  params: ServerPageProps["params"]
): Promise<ServerPageScope> {
  const serverId = parsePositiveInt((await params).sid);
  if (!serverId) {
    notFound();
  }

  const context = await getServerContext();
  const server = context.servers.find((entry) => entry.serverId === serverId);
  if (!server) {
    notFound();
  }

  return {
    kind: "server",
    context,
    gameId: server.gameId,
    server
  };
}
