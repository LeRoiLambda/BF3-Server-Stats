import { StatsShell } from "@/components/layout/stats-shell";
import { ui } from "@/components/layout/stats-ui";
import { DailyPlayerTrendChart } from "@/components/stats/daily-player-trend-chart";
import { DateTime } from "@/components/stats/date-time";
import { formatGamemodeName, formatMapName } from "@/src/server/domain/bf3-reference";
import {
  getServerDetailStats,
  listRecentServerRounds,
  listServerDailyPlayerTrend
} from "@/src/server/repositories/server-details-repository";
import {
  scopeName,
  scopeServerId,
  scopeServers,
  type PageScope
} from "@/src/server/routing/server-pages";
import { siteTimeZone } from "@/src/server/utils/site-time";

type ServerInfoSectionProps = {
  scope: PageScope;
};

export async function ServerInfoSection({ scope }: ServerInfoSectionProps) {
  const servers = scopeServers(scope);
  const showServer = scope.kind === "all";
  const [stats, recentRounds, dailyTrend] = await Promise.all([
    getServerDetailStats(servers),
    listRecentServerRounds(servers, 15),
    listServerDailyPlayerTrend(servers, 14, siteTimeZone())
  ]);

  return (
    <StatsShell
      title={`${scopeName(scope)} - Server Info`}
      subtitle={
        scope.kind === "all"
          ? "Overall performance and recent rounds across all servers."
          : "Overall server performance and recent rounds."
      }
      servers={scope.context.servers}
      currentServerId={scopeServerId(scope)}
      activeSection="server"
    >
      {!stats ? (
        <section className={ui.panel}>
          <p className="text-sm text-slate-300">
            {scope.kind === "all"
              ? "No server stats found."
              : "No server stats found for this server."}
          </p>
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
              <p>
                <span className="text-slate-400">Kills:</span>{" "}
                {stats.averageKills.toFixed(2)}
              </p>
              <p>
                <span className="text-slate-400">Headshots:</span>{" "}
                {stats.averageHeadshots.toFixed(2)}
              </p>
              <p>
                <span className="text-slate-400">Deaths:</span>{" "}
                {stats.averageDeaths.toFixed(2)}
              </p>
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

      <DailyPlayerTrendChart data={dailyTrend} />

      <section className={`mt-6 ${ui.panel}`}>
        <h2 className={`mb-3 ${ui.sectionTitle}`}>Recent Rounds</h2>
        <div className={ui.tableShell}>
          <table className={ui.table}>
            <thead className={ui.tableHead}>
              <tr>
                <th className={ui.th}>Started</th>
                {showServer ? <th className={ui.th}>Server</th> : null}
                <th className={ui.th}>Map</th>
                <th className={ui.th}>Gamemode</th>
                <th className={ui.th}>Min / Avg / Max</th>
                <th className={ui.th}>Joins / Leaves</th>
              </tr>
            </thead>
            <tbody>
              {recentRounds.length === 0 ? (
                <tr className={ui.tableRow}>
                  <td className={ui.emptyCell} colSpan={showServer ? 6 : 5}>
                    No round data found.
                  </td>
                </tr>
              ) : (
                recentRounds.map((round, index) => (
                  <tr
                    key={`${round.serverId}-${round.startedAt?.getTime() ?? "unknown"}-${index}`}
                    className={ui.tableRow}
                  >
                    <td className={`${ui.td} whitespace-nowrap`}>
                      <DateTime value={round.startedAt} />
                    </td>
                    {showServer ? (
                      <td className={`${ui.td} whitespace-nowrap text-slate-300`}>
                        {round.serverName ?? `Server #${round.serverId}`}
                      </td>
                    ) : null}
                    <td className={ui.td}>{formatMapName(round.mapCode)}</td>
                    <td className={ui.td}>{formatGamemodeName(round.gamemode)}</td>
                    <td className={ui.td}>
                      {round.minPlayers} / {round.averagePlayers.toFixed(2)} / {round.maxPlayers}
                    </td>
                    <td className={ui.td}>
                      {round.joinedPlayers} / {round.leftPlayers}
                    </td>
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
