import Link from "next/link";
import { StatsShell } from "@/components/layout/stats-shell";
import { sortableHeadingClass, ui } from "@/components/layout/stats-ui";
import { ModerationPolicySection } from "@/components/stats/moderation-policy-section";
import { StatsPager } from "@/components/stats/pager";
import {
  PlayerIdentity,
  PlayerTableCellLink,
  playerTableRowClass
} from "@/components/stats/player-link";
import {
  getBannedPlayers,
  parseBanOrder,
  parseBanPage,
  parseBanSort,
  type BanSort
} from "@/src/server/repositories/bans-repository";
import { getModerationPolicy } from "@/src/server/repositories/moderation-repository";
import { firstValue } from "@/src/server/routing/params";
import {
  nextOrder,
  scopeHref,
  scopeName,
  scopeServerId,
  scopeServers,
  type PageScope,
  type SearchParams
} from "@/src/server/routing/server-pages";

type BansSectionProps = {
  scope: PageScope;
  searchParams: SearchParams;
};

const SORT_LABELS: Record<BanSort, string> = {
  date: "Date",
  soldierName: "Player",
  kdr: "KDR",
  hsr: "HSR"
};

export async function BansSection({ scope, searchParams }: BansSectionProps) {
  const sort = parseBanSort(firstValue(searchParams.sort));
  const order = parseBanOrder(firstValue(searchParams.order));
  const page = parseBanPage(firstValue(searchParams.page));
  const serverId = scopeServerId(scope);
  const [result, policy] = await Promise.all([
    getBannedPlayers({
      ...scopeServers(scope),
      gameId: scope.gameId,
      sort,
      order,
      page,
      pageSize: 20
    }),
    getModerationPolicy({
      serverId,
      activeServerIds: scope.context.servers.map((server) => server.serverId)
    })
  ]);

  return (
    <StatsShell
      title={`${scopeName(scope)} - Bans`}
      subtitle={
        scope.kind === "all"
          ? "Active ban list across all servers."
          : "Active ban list for this server."
      }
      servers={scope.context.servers}
      currentServerId={serverId}
      activeSection="bans"
    >
      <ModerationPolicySection policy={policy} className="mb-6" />
      <section className={ui.panel}>
        {!result.available ? (
          <p className="text-sm text-slate-300">
            {scope.kind === "all"
              ? "Ban data is not enabled right now."
              : "Ban data is not enabled for this server right now."}
          </p>
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
                          href={scopeHref(scope, "bans", {
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
                      <td className={ui.emptyCell} colSpan={6}>
                        No active bans found.
                      </td>
                    </tr>
                  ) : (
                    result.players.map((player, index) => (
                      <tr key={player.playerId} className={playerTableRowClass(ui.tableRow)}>
                        <td className={ui.td}>
                          <PlayerTableCellLink playerId={player.playerId} serverId={serverId}>
                            {(result.page - 1) * result.pageSize + index + 1}
                          </PlayerTableCellLink>
                        </td>
                        <td className={ui.td}>
                          <PlayerTableCellLink playerId={player.playerId} serverId={serverId}>
                            {player.bannedAt ?? "Unknown"}
                          </PlayerTableCellLink>
                        </td>
                        <td className={ui.td}>
                          <PlayerTableCellLink
                            playerId={player.playerId}
                            serverId={serverId}
                            primary
                          >
                            <PlayerIdentity
                              soldierName={player.soldierName}
                              countryCode={player.countryCode}
                            />
                          </PlayerTableCellLink>
                        </td>
                        <td className={ui.td}>
                          <PlayerTableCellLink playerId={player.playerId} serverId={serverId}>
                            {player.kdr.toFixed(2)}
                          </PlayerTableCellLink>
                        </td>
                        <td className={ui.td}>
                          <PlayerTableCellLink playerId={player.playerId} serverId={serverId}>
                            {player.hsr.toFixed(2)}%
                          </PlayerTableCellLink>
                        </td>
                        <td className={`${ui.td} text-slate-300`}>
                          <PlayerTableCellLink playerId={player.playerId} serverId={serverId}>
                            {player.reason ?? "No reason recorded"}
                          </PlayerTableCellLink>
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
                scopeHref(scope, "bans", {
                  sort,
                  order,
                  page: targetPage > 1 ? targetPage : null
                })
              }
            />
          </>
        )}
      </section>
    </StatsShell>
  );
}
