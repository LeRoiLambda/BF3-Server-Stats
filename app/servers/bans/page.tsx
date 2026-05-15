import Link from "next/link";
import { StatsShell } from "@/components/layout/stats-shell";
import { sortableHeadingClass, ui } from "@/components/layout/stats-ui";
import { ModerationPolicySection } from "@/components/stats/moderation-policy-section";
import { StatsPager } from "@/components/stats/pager";
import { PlayerLink } from "@/components/stats/player-link";
import { getModerationPolicy } from "@/src/server/repositories/moderation-repository";
import {
  getBannedPlayers,
  parseBanPage,
  parseBanOrder,
  parseBanSort,
  type BanSort
} from "@/src/server/repositories/bans-repository";
import { firstValue } from "@/src/server/routing/params";
import {
  allServersHref,
  getAllServersPageScope,
  nextOrder
} from "@/src/server/routing/server-pages";

export const revalidate = 30;

type AllServersBansPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const SORT_LABELS: Record<BanSort, string> = {
  soldierName: "Player",
  kdr: "KDR",
  hsr: "HSR"
};

export default async function AllServersBansPage({
  searchParams
}: AllServersBansPageProps) {
  const scope = await getAllServersPageScope("bans");
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const sort = parseBanSort(firstValue(resolvedSearchParams.sort));
  const order = parseBanOrder(firstValue(resolvedSearchParams.order));
  const page = parseBanPage(firstValue(resolvedSearchParams.page));
  const [result, policy] = await Promise.all([
    getBannedPlayers({
      serverIds: scope.serverIds,
      gameId: scope.gameId,
      sort,
      order,
      page,
      pageSize: 20
    }),
    getModerationPolicy({
      serverId: null
    })
  ]);

  return (
    <StatsShell
      title="All Servers - Bans"
      subtitle="Active ban list across all servers."
      servers={scope.context.servers}
      activeSection="bans"
    >
      <ModerationPolicySection policy={policy} className="mb-6" />
      <section className={ui.panel}>
        {!result.available ? (
          <p className="text-sm text-slate-300">Ban data is not enabled right now.</p>
        ) : (
          <>
            <div className={ui.tableShell}>
              <table className={ui.table}>
                <thead className={ui.tableHead}>
                  <tr>
                    <th className={ui.th}>#</th>
                    {(Object.keys(SORT_LABELS) as BanSort[]).map((sortKey) => (
                      <th key={sortKey} className={ui.th}>
                        <Link
                          href={allServersHref("bans", {
                            sort: sortKey,
                            order: nextOrder(
                              sort,
                              sortKey,
                              order,
                              sortKey === "soldierName" ? "asc" : "desc"
                            )
                          })}
                          className={sortableHeadingClass(sort === sortKey)}
                        >
                          {SORT_LABELS[sortKey]}
                          {sort === sortKey ? (order === "asc" ? "↑" : "↓") : null}
                        </Link>
                      </th>
                    ))}
                    <th className={ui.th}>Ban Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {result.players.length === 0 ? (
                    <tr className={ui.tableRow}>
                      <td className={ui.emptyCell} colSpan={5}>
                        No active bans found.
                      </td>
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
                        </td>
                        <td className={ui.td}>{player.kdr.toFixed(2)}</td>
                        <td className={ui.td}>{player.hsr.toFixed(2)}%</td>
                        <td className={`${ui.td} text-slate-300`}>
                          {player.reason ?? "No reason recorded"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <StatsPager
              page={result.page}
              totalPages={result.totalPages}
              totalLabel={`${result.totalRows} bans`}
              hasNextPage={result.hasNextPage}
              getPageHref={(targetPage) =>
                allServersHref("bans", {
                  sort,
                  order,
                  page: targetPage
                })
              }
            />
          </>
        )}
      </section>
    </StatsShell>
  );
}
