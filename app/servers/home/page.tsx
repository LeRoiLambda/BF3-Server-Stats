import Image from "next/image";
import Link from "next/link";
import { StatsShell } from "@/components/layout/stats-shell";
import { RouteAutoRefresh } from "@/components/stats/route-auto-refresh";
import { ui } from "@/components/layout/stats-ui";
import { PlayerDisciplineBadge } from "@/components/stats/player-discipline-badge";
import { PlayerLink } from "@/components/stats/player-link";
import {
  formatGamemodeName,
  formatMapName,
  mapImagePath
} from "@/src/server/domain/bf3-reference";
import {
  getAllServersLeaderboard
} from "@/src/server/repositories/player-stats-repository";
import { getAllServersPageScope } from "@/src/server/routing/server-pages";

export const revalidate = 30;

function occupancyPercent(usedSlots: number, maxSlots: number): number {
  if (maxSlots <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((usedSlots / maxSlots) * 100));
}

export default async function AllServersHomePage() {
  const scope = await getAllServersPageScope("home");
  const topPlayers = await getAllServersLeaderboard({
    serverIds: scope.serverIds,
    gameId: scope.gameId,
    sort: "score",
    order: "desc",
    page: 1,
    pageSize: 20,
    search: null
  });
  const onlineServers = scope.context.servers.filter(
    (server) => server.connectionState === "on"
  ).length;
  const playersOnline = scope.context.servers.reduce(
    (sum, server) => sum + server.usedSlots,
    0
  );
  const totalSlots = scope.context.servers.reduce(
    (sum, server) => sum + server.maxSlots,
    0
  );

  return (
    <StatsShell
      title="All Servers - Home"
      subtitle="Live overview across tracked BF3 servers."
      servers={scope.context.servers}
      activeSection="home"
    >
      <RouteAutoRefresh intervalMs={30000} />
      <section className={ui.panel}>
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-700/55 pb-4">
          <div>
            <h2 className={ui.sectionTitle}>Live Servers</h2>
            <p className="mt-1 text-xs text-slate-400">
              {onlineServers} online · {playersOnline} / {totalSlots} players
            </p>
          </div>
          <span className="rounded-sm border border-slate-600/50 bg-slate-950/75 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
            Refresh 30s
          </span>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {scope.context.servers.map((server) => {
            const isOnline = server.connectionState === "on";
            const loadPercent = occupancyPercent(server.usedSlots, server.maxSlots);
            const serverMapImagePath = mapImagePath(server.mapName);

            return (
              <Link
                key={server.serverId}
                href={`/servers/${server.serverId}`}
                className="group block min-w-0 overflow-hidden rounded-sm border border-slate-600/35 bg-slate-950/65 transition-colors hover:border-slate-400/60"
              >
                <div className="relative aspect-[992/164] min-h-[62px] bg-slate-900">
                  {serverMapImagePath ? (
                    <Image
                      src={serverMapImagePath}
                      alt={formatMapName(server.mapName)}
                      fill
                      sizes="(min-width: 1024px) 520px, 100vw"
                      className="object-cover opacity-80 transition duration-200 group-hover:scale-[1.02] group-hover:opacity-100"
                      priority={server.serverId === scope.context.servers[0]?.serverId}
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-950/35 via-slate-950/5 to-slate-950/25" />
                </div>
                <div className="min-w-0 p-4">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-slate-100">
                        {server.serverName}
                      </h3>
                      <p className="mt-1 truncate text-xs text-slate-400">
                        {formatMapName(server.mapName)} · {formatGamemodeName(server.gameMode)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-sm border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                        isOnline
                          ? "border-emerald-400/45 bg-emerald-950/35 text-emerald-200"
                          : "border-slate-600 bg-slate-900 text-slate-300"
                      }`}
                    >
                      {isOnline ? "Online" : "Offline"}
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="uppercase tracking-[0.12em] text-slate-400">
                        Players
                      </span>
                      <span className="font-semibold text-slate-100">
                        {server.usedSlots} / {server.maxSlots}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-sm bg-slate-800">
                      <div
                        className="h-full rounded-sm bg-teal-400/80"
                        style={{ width: `${loadPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className={`mt-6 ${ui.panel}`}>
        <h2 className={`mb-3 ${ui.sectionTitle}`}>Top Players Across Servers</h2>
        <div className={ui.tableShell}>
          <table className={ui.table}>
            <thead className={ui.tableHead}>
              <tr>
                <th className={ui.th}>#</th>
                <th className={ui.th}>Player</th>
                <th className={ui.th}>Score</th>
                <th className={ui.th}>Kills</th>
                <th className={ui.th}>KDR</th>
                <th className={ui.th}>HSR</th>
              </tr>
            </thead>
            <tbody>
              {topPlayers.players.map((player, index) => (
                <tr key={player.playerId} className={ui.tableRow}>
                  <td className={ui.td}>{index + 1}</td>
                  <td className={ui.td}>
                    <PlayerLink
                      playerId={player.playerId}
                      soldierName={player.soldierName}
                      countryCode={player.countryCode}
                    />
                    <PlayerDisciplineBadge status={player.banStatus} />
                  </td>
                  <td className={ui.td}>{player.score}</td>
                  <td className={ui.td}>{player.kills}</td>
                  <td className={ui.td}>{player.kdr.toFixed(2)}</td>
                  <td className={ui.td}>{player.hsr.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </StatsShell>
  );
}
