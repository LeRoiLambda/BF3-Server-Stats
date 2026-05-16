import Link from "next/link";
import { StatsShell } from "@/components/layout/stats-shell";
import { sortableHeadingClass, ui } from "@/components/layout/stats-ui";
import { PlayerDisciplineBadge } from "@/components/stats/player-discipline-badge";
import { StatsPager } from "@/components/stats/pager";
import { PlayerLink } from "@/components/stats/player-link";
import {
  getSuspiciousPlayers,
  parseSuspiciousPage,
  parseSuspiciousOrder,
  parseSuspiciousSort,
  type SuspiciousSort
} from "@/src/server/repositories/suspicious-repository";
import { firstValue } from "@/src/server/routing/params";
import {
  allServersHref,
  getAllServersPageScope,
  nextOrder
} from "@/src/server/routing/server-pages";

export const revalidate = 30;

type AllServersSuspiciousPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const SORT_LABELS: Record<SuspiciousSort, string> = {
  soldierName: "Player",
  kdr: "KDR",
  hsr: "HSR",
  rounds: "Rounds"
};

export default async function AllServersSuspiciousPage({
  searchParams
}: AllServersSuspiciousPageProps) {
  const scope = await getAllServersPageScope("suspicious");
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const sort = parseSuspiciousSort(firstValue(resolvedSearchParams.sort));
  const order = parseSuspiciousOrder(firstValue(resolvedSearchParams.order));
  const page = parseSuspiciousPage(firstValue(resolvedSearchParams.page));
  const result = await getSuspiciousPlayers({
    serverIds: scope.serverIds,
    gameId: scope.gameId,
    sort,
    order,
    page,
    pageSize: 20
  });

  return (
    <StatsShell
      title="All Servers - Suspicious Players"
      subtitle="Statistical outliers, not final proof."
      servers={scope.context.servers}
      activeSection="suspicious"
    >
      <section className={ui.panel}>
        <div className={ui.tableShell}>
          <table className={ui.table}>
            <thead className={ui.tableHead}>
              <tr>
                <th className={ui.th}>#</th>
                {(Object.keys(SORT_LABELS) as SuspiciousSort[]).map((sortKey) => {
                  const href = allServersHref("suspicious", {
                    sort: sortKey,
                    order: nextOrder(
                      sort,
                      sortKey,
                      order,
                      sortKey === "soldierName" ? "asc" : "desc"
                    )
                  });
                  const isActive = sort === sortKey;

                  return (
                    <th key={sortKey} className={ui.th}>
                      <Link href={href} className={sortableHeadingClass(isActive)}>
                        {SORT_LABELS[sortKey]}
                        {isActive ? (order === "asc" ? "↑" : "↓") : null}
                      </Link>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {result.players.length === 0 ? (
                <tr className={ui.tableRow}>
                  <td className={ui.emptyCell} colSpan={5}>No suspicious players found.</td>
                </tr>
              ) : (
                result.players.map((player, index) => (
                  <tr key={player.playerId} className={ui.tableRow}>
                    <td className={ui.td}>
                      {(result.page - 1) * result.pageSize + index + 1}
                    </td>
                    <td className={ui.td}>
                      <PlayerLink
                        playerId={player.playerId}
                        soldierName={player.soldierName}
                        countryCode={player.countryCode}
                      />
                      <PlayerDisciplineBadge status={player.banStatus} />
                    </td>
                    <td className={ui.td}>{player.kdr.toFixed(2)}</td>
                    <td className={ui.td}>{player.hsr.toFixed(2)}%</td>
                    <td className={ui.td}>{player.rounds}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <StatsPager
          page={result.page}
          totalPages={result.totalPages}
          totalLabel={`${result.totalRows} players`}
          hasNextPage={result.hasNextPage}
          getPageHref={(targetPage) =>
            allServersHref("suspicious", {
              sort,
              order,
              page: targetPage
            })
          }
        />
      </section>
    </StatsShell>
  );
}
