import { StatsShell } from "@/components/layout/stats-shell";
import { banTagClass, ui } from "@/components/layout/stats-ui";
import { PlayerLink } from "@/components/stats/player-link";
import {
  getAllServersLeaderboard
} from "@/src/server/repositories/player-stats-repository";
import { getServerDetailStats } from "@/src/server/repositories/server-details-repository";
import { getAllServersPageScope } from "@/src/server/routing/server-pages";

export const revalidate = 30;

export default async function AllServersHomePage() {
  const scope = await getAllServersPageScope("home");
  const [stats, topPlayers] = await Promise.all([
    getServerDetailStats({ serverIds: scope.serverIds }),
    getAllServersLeaderboard({
      serverIds: scope.serverIds,
      gameId: scope.gameId,
      sort: "score",
      order: "desc",
      page: 1,
      pageSize: 20,
      search: null
    })
  ]);
  const onlineServers = scope.context.servers.filter(
    (server) => server.connectionState === "on"
  ).length;
  const playersOnline = scope.context.servers.reduce(
    (sum, server) => sum + server.usedSlots,
    0
  );

  return (
    <StatsShell
      title="All Servers - Home"
      subtitle="Aggregated stats across all active BF3 servers in this database."
      servers={scope.context.servers}
      activeSection="home"
    >
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className={ui.card}>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Servers Online</p>
          <p className="mt-2 text-lg font-semibold text-slate-100">{onlineServers}</p>
        </article>
        <article className={ui.card}>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Tracked Servers</p>
          <p className="mt-2 text-lg font-semibold text-slate-100">
            {scope.context.servers.length}
          </p>
        </article>
        <article className={ui.card}>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Players Online</p>
          <p className="mt-2 text-lg font-semibold text-slate-100">{playersOnline}</p>
        </article>
        <article className={ui.card}>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Historical Players</p>
          <p className="mt-2 text-lg font-semibold text-slate-100">
            {stats ? stats.countPlayers : "N/A"}
          </p>
        </article>
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
                    {player.banStatus ? (
                      <span className={banTagClass(player.banStatus)}>{player.banStatus}</span>
                    ) : null}
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
