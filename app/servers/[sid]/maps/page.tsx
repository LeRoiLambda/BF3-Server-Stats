import { notFound } from "next/navigation";
import { StatsShell } from "@/components/layout/stats-shell";
import { switchButtonClass, ui } from "@/components/layout/stats-ui";
import { MapLabel } from "@/components/stats/map-label";
import { formatGamemodeName } from "@/src/server/domain/bf3-reference";
import { getServerMapsSnapshot } from "@/src/server/repositories/maps-repository";
import { getLegacyServerContext } from "@/src/server/repositories/server-repository";
import { firstValue, parsePositiveInt } from "@/src/server/routing/params";

export const revalidate = 30;

type MapsPageProps = {
  params: Promise<{ sid: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function parseSelectedGamemode(
  searchParams: Record<string, string | string[] | undefined>
): string | null {
  const mode = firstValue(searchParams.mode);
  if (mode?.trim()) {
    return mode.trim();
  }

  const legacyMode = firstValue(searchParams.c);
  if (legacyMode?.trim()) {
    return legacyMode.trim();
  }

  return null;
}

function mapsHref(serverId: number, mode: string): string {
  const params = new URLSearchParams();
  params.set("mode", mode);
  return `/servers/${serverId}/maps?${params.toString()}`;
}

export default async function MapsPage({ params, searchParams }: MapsPageProps) {
  const { sid } = await params;
  const serverId = parsePositiveInt(sid);
  if (!serverId) {
    notFound();
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedGamemode = parseSelectedGamemode(resolvedSearchParams);

  const context = await getLegacyServerContext();
  const server = context.servers.find((entry) => entry.serverId === serverId);
  if (!server) {
    notFound();
  }

  const snapshot = await getServerMapsSnapshot({
    serverId: server.serverId,
    selectedGamemode
  });

  return (
    <StatsShell
      title={`${server.serverName} - Maps`}
      subtitle="Most played maps and game modes on this server."
      servers={context.servers}
      currentServerId={server.serverId}
      activeSection="maps"
    >
      <section className={ui.panel}>
        {snapshot.gamemodes.length === 0 ? (
          <p className="text-sm text-slate-300">No map stats found for this server.</p>
        ) : (
          <>
            <div className={`mb-5 ${ui.tableShell}`}>
              <table className={ui.table}>
                <thead className={ui.tableHead}>
                  <tr>
                    <th className={ui.th}>Most Played Maps</th>
                    <th className={ui.th}>Rounds</th>
                    <th className={ui.th}>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.mapCoverage.length === 0 ? (
                    <tr className={ui.tableRow}>
                      <td className={ui.emptyCell} colSpan={3}>
                        No map coverage data available.
                      </td>
                    </tr>
                  ) : (
                    snapshot.mapCoverage.map((entry) => (
                      <tr
                        key={entry.mapCode}
                        className={ui.tableRow}
                      >
                        <td className={ui.td}>
                          <MapLabel mapCode={entry.mapCode} />
                        </td>
                        <td className={ui.td}>{entry.totalRounds}</td>
                        <td className={ui.td}>
                          <div className="flex items-center gap-2">
                            <span className="min-w-14 text-slate-300">
                              {entry.roundSharePercent.toFixed(2)}%
                            </span>
                            <span className="h-2 w-full max-w-40 overflow-hidden rounded bg-slate-800/85">
                              <span
                                className="block h-full bg-teal-400/80"
                                style={{ width: `${Math.min(100, entry.roundSharePercent)}%` }}
                              />
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {snapshot.gamemodes.map((mode) => {
                const selected = snapshot.selectedGamemode === mode.gamemode;
                return (
                  <a
                    key={mode.gamemode}
                    href={mapsHref(server.serverId, mode.gamemode)}
                    className={switchButtonClass(selected)}
                  >
                    {formatGamemodeName(mode.gamemode)} · {mode.totalRounds}
                  </a>
                );
              })}
            </div>

            <div className={ui.tableShell}>
              <table className={ui.table}>
                <thead className={ui.tableHead}>
                  <tr>
                    <th className={ui.th}>#</th>
                    <th className={ui.th}>Map</th>
                    <th className={ui.th}>Code</th>
                    <th className={ui.th}>Rounds</th>
                    <th className={ui.th}>Avg Players</th>
                    <th className={ui.th}>Joins / Leaves</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.maps.length === 0 ? (
                    <tr className={ui.tableRow}>
                      <td className={ui.emptyCell} colSpan={6}>
                        No map rows found for the selected mode.
                      </td>
                    </tr>
                  ) : (
                    snapshot.maps.map((map, index) => (
                      <tr
                        key={`${map.mapCode}-${index}`}
                        className={ui.tableRow}
                      >
                        <td className={ui.td}>{index + 1}</td>
                        <td className={ui.td}>
                          <MapLabel mapCode={map.mapCode} />
                        </td>
                        <td className={ui.td}>{map.mapCode}</td>
                        <td className={ui.td}>{map.numberOfRounds}</td>
                        <td className={ui.td}>{map.averagePlayers.toFixed(2)}</td>
                        <td className={ui.td}>{map.averagePopularity.toFixed(2)}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </StatsShell>
  );
}
