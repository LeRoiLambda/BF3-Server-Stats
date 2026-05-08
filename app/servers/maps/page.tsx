import Link from "next/link";
import { StatsShell } from "@/components/layout/stats-shell";
import { switchButtonClass, ui } from "@/components/layout/stats-ui";
import { MapLabel } from "@/components/stats/map-label";
import { formatGamemodeName } from "@/src/server/domain/bf3-reference";
import { getServerMapsSnapshot } from "@/src/server/repositories/maps-repository";
import { firstValue } from "@/src/server/routing/params";
import {
  allServersHref,
  getAllServersPageScope
} from "@/src/server/routing/server-pages";

export const revalidate = 30;

type AllServersMapsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AllServersMapsPage({
  searchParams
}: AllServersMapsPageProps) {
  const scope = await getAllServersPageScope("maps");
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedGamemode =
    firstValue(resolvedSearchParams.mode)?.trim() ||
    firstValue(resolvedSearchParams.c)?.trim() ||
    null;
  const snapshot = await getServerMapsSnapshot({
    serverIds: scope.serverIds,
    selectedGamemode
  });

  return (
    <StatsShell
      title="All Servers - Maps"
      subtitle="Most played maps and game modes across all servers."
      servers={scope.context.servers}
      activeSection="maps"
    >
      <section className={ui.panel}>
        {snapshot.gamemodes.length === 0 ? (
          <p className="text-sm text-slate-300">No map stats found.</p>
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
                      <tr key={entry.mapCode} className={ui.tableRow}>
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
              {snapshot.gamemodes.map((mode) => (
                <Link
                  key={mode.gamemode}
                  href={allServersHref("maps", { mode: mode.gamemode })}
                  className={switchButtonClass(snapshot.selectedGamemode === mode.gamemode)}
                >
                  {formatGamemodeName(mode.gamemode)} · {mode.totalRounds}
                </Link>
              ))}
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
                      <tr key={`${map.mapCode}-${index}`} className={ui.tableRow}>
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
