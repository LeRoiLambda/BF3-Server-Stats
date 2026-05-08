import { StatsShell } from "@/components/layout/stats-shell";
import { ui } from "@/components/layout/stats-ui";
import { formatGamemodeName, formatMapName } from "@/src/server/domain/bf3-reference";
import {
  getServerDetailStats,
  listRecentServerRounds,
  listServerDailyPlayerTrend
} from "@/src/server/repositories/server-details-repository";
import { getAllServersPageScope } from "@/src/server/routing/server-pages";

export const revalidate = 30;

export default async function AllServersServerInfoPage() {
  const scope = await getAllServersPageScope("server");
  const [stats, recentRounds, dailyTrend] = await Promise.all([
    getServerDetailStats({ serverIds: scope.serverIds }),
    listRecentServerRounds({ serverIds: scope.serverIds }, 15),
    listServerDailyPlayerTrend({ serverIds: scope.serverIds }, 7)
  ]);

  return (
    <StatsShell
      title="All Servers - Server Info"
      subtitle="Overall performance and recent rounds across all servers."
      servers={scope.context.servers}
      activeSection="server"
    >
      {!stats ? (
        <section className={ui.panel}>
          <p className="text-sm text-slate-300">No server stats found.</p>
        </section>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <article className={ui.card}>
              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Total Players</p>
              <p className="mt-2 text-lg font-semibold text-slate-100">{stats.countPlayers}</p>
            </article>
            <article className={ui.card}>
              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Total Kills</p>
              <p className="mt-2 text-lg font-semibold text-slate-100">{stats.totalKills}</p>
            </article>
            <article className={ui.card}>
              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Total Deaths</p>
              <p className="mt-2 text-lg font-semibold text-slate-100">{stats.totalDeaths}</p>
            </article>
            <article className={ui.card}>
              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Total Rounds</p>
              <p className="mt-2 text-lg font-semibold text-slate-100">{stats.totalRounds}</p>
            </article>
            <article className={ui.card}>
              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Average Score</p>
              <p className="mt-2 text-lg font-semibold text-slate-100">
                {stats.averageScore.toFixed(2)}
              </p>
            </article>
            <article className={ui.card}>
              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Average KDR / HSR</p>
              <p className="mt-2 text-lg font-semibold text-slate-100">
                {stats.averageKdr.toFixed(2)} / {stats.averageHsr.toFixed(2)}%
              </p>
            </article>
          </section>
          <section className={`mt-6 ${ui.panel}`}>
            <h2 className={`mb-3 ${ui.sectionTitle}`}>Averages Per Player</h2>
            <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
              <p><span className="text-slate-400">Kills:</span> {stats.averageKills.toFixed(2)}</p>
              <p>
                <span className="text-slate-400">Headshots:</span>{" "}
                {stats.averageHeadshots.toFixed(2)}
              </p>
              <p><span className="text-slate-400">Deaths:</span> {stats.averageDeaths.toFixed(2)}</p>
              <p>
                <span className="text-slate-400">Team Kills:</span>{" "}
                {stats.averageTeamKills.toFixed(2)}
              </p>
              <p>
                <span className="text-slate-400">Suicides:</span>{" "}
                {stats.averageSuicides.toFixed(2)}
              </p>
            </div>
          </section>
        </>
      )}

      <section className={`mt-6 ${ui.panel}`}>
        <h2 className={ui.sectionTitle}>Daily Player Trend</h2>
        <p className="mt-2 text-sm text-slate-400">
          Average peak players over the last 7 days with round activity.
        </p>
        <div className={`mt-3 ${ui.tableShell}`}>
          <table className={ui.table}>
            <thead className={ui.tableHead}>
              <tr>
                <th className={ui.th}>Date</th>
                <th className={ui.th}>Avg Peak Players</th>
              </tr>
            </thead>
            <tbody>
              {dailyTrend.length === 0 ? (
                <tr className={ui.tableRow}>
                  <td className={ui.emptyCell} colSpan={2}>
                    No daily trend data found.
                  </td>
                </tr>
              ) : (
                dailyTrend.map((entry) => (
                  <tr key={entry.date} className={ui.tableRow}>
                    <td className={ui.td}>{entry.date}</td>
                    <td className={ui.td}>{entry.averagePlayers.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={`mt-6 ${ui.panel}`}>
        <h2 className={`mb-3 ${ui.sectionTitle}`}>Recent Rounds</h2>
        <div className={ui.tableShell}>
          <table className={ui.table}>
            <thead className={ui.tableHead}>
              <tr>
                <th className={ui.th}>Started</th>
                <th className={ui.th}>Server</th>
                <th className={ui.th}>Map</th>
                <th className={ui.th}>Gamemode</th>
                <th className={ui.th}>Min / Avg / Max</th>
                <th className={ui.th}>Joins / Leaves</th>
              </tr>
            </thead>
            <tbody>
              {recentRounds.length === 0 ? (
                <tr className={ui.tableRow}>
                  <td className={ui.emptyCell} colSpan={6}>No round data found.</td>
                </tr>
              ) : (
                recentRounds.map((round, index) => (
                  <tr
                    key={`${round.serverId}-${round.startedAt ?? "unknown"}-${index}`}
                    className={ui.tableRow}
                  >
                    <td className={`${ui.td} whitespace-nowrap`}>
                      {round.startedAt ?? "Unknown"}
                    </td>
                    <td className={`${ui.td} whitespace-nowrap text-slate-300`}>
                      {round.serverName ?? `Server #${round.serverId}`}
                    </td>
                    <td className={ui.td}>{formatMapName(round.mapCode)}</td>
                    <td className={ui.td}>{formatGamemodeName(round.gamemode)}</td>
                    <td className={ui.td}>
                      {round.minPlayers} / {round.averagePlayers.toFixed(2)} / {round.maxPlayers}
                    </td>
                    <td className={ui.td}>{round.joinedPlayers} / {round.leftPlayers}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </StatsShell>
  );
}
