import { describe, expect, it } from "vitest";
import type { ActiveServer } from "@/src/server/repositories/server-repository";
import {
  allServersHref,
  scopeHref,
  scopeName,
  scopeServerId,
  scopeServers,
  serverSectionHref,
  type PageScope
} from "@/src/server/routing/server-pages";

const server: ActiveServer = {
  gameId: 1,
  serverId: 2,
  serverName: "Sample Conquest Server",
  mapName: "XP1_004",
  gameMode: "ConquestLarge0",
  maxSlots: 64,
  usedSlots: 21,
  connectionState: "on"
};
const context = { gameId: 1, servers: [server] };
const allServers: PageScope = { kind: "all", context, gameId: 1, serverIds: [2, 3] };
const oneServer: PageScope = { kind: "server", context, gameId: 1, server };

describe("section URLs", () => {
  it("builds all-servers and per-server paths", () => {
    expect(allServersHref("leaders")).toBe("/servers/leaders");
    expect(serverSectionHref(2, "leaders")).toBe("/servers/2/leaders");
    expect(serverSectionHref(2, "home")).toBe("/servers/2");
  });

  it("keeps query values in order and leaves out empty ones", () => {
    expect(
      scopeHref(oneServer, "chat", { sort: "date", order: "desc", q: null, page: "" })
    ).toBe("/servers/2/chat?sort=date&order=desc");
    expect(scopeHref(allServers, "chat", { q: "ak 47" })).toBe("/servers/chat?q=ak+47");
  });
});

describe("page scopes", () => {
  it("describes all servers", () => {
    expect(scopeName(allServers)).toBe("All Servers");
    expect(scopeServerId(allServers)).toBeNull();
    expect(scopeServers(allServers)).toEqual({ serverIds: [2, 3] });
  });

  it("describes one server", () => {
    expect(scopeName(oneServer)).toBe("Sample Conquest Server");
    expect(scopeServerId(oneServer)).toBe(2);
    expect(scopeServers(oneServer)).toEqual({ serverId: 2 });
  });
});
