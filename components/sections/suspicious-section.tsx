import { StatsShell } from "@/components/layout/stats-shell";
import { SortHeading } from "@/components/layout/sort-heading";
import { ui } from "@/components/layout/stats-ui";
import { PlayerDisciplineBadge } from "@/components/stats/player-discipline-badge";
import { StatsPager } from "@/components/stats/pager";
import {
  PlayerIdentity,
  PlayerTableCellLink,
  playerTableRowClass
} from "@/components/stats/player-link";
import {
  getSuspiciousPlayers,
  parseSuspiciousOrder,
  parseSuspiciousPage,
  parseSuspiciousSort,
  type SuspiciousSort
} from "@/src/server/repositories/suspicious-repository";
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

type SuspiciousSectionProps = {
  scope: PageScope;
  searchParams: SearchParams;
};

const SORT_LABELS: Record<SuspiciousSort, string> = {
  soldierName: "Player",
  kdr: "KDR",
  hsr: "HSR",
  rounds: "Rounds"
};

export async function SuspiciousSection({ scope, searchParams }: SuspiciousSectionProps) {
  const sort = parseSuspiciousSort(firstValue(searchParams.sort));
  const order = parseSuspiciousOrder(firstValue(searchParams.order));
  const page = parseSuspiciousPage(firstValue(searchParams.page));
  const serverId = scopeServerId(scope);
  const result = await getSuspiciousPlayers({
    ...scopeServers(scope),
    gameId: scope.gameId,
    sort,
    order,
    page,
    pageSize: 20
  });

  return (
    <StatsShell
      title={`${scopeName(scope)} - Suspicious Players`}
      subtitle="Statistical outliers, not final proof."
      servers={scope.context.servers}
      currentServerId={serverId}
      activeSection="suspicious"
    >
      <section className={ui.panel}>
        <div className={ui.tableShell}>
          <table className={ui.table}>
            <thead className={ui.tableHead}>
              <tr>
                <th className={ui.th}>#</th>
                {(Object.keys(SORT_LABELS) as SuspiciousSort[]).map((sortKey) => (
                  <th key={sortKey} className={ui.th}>
                    <SortHeading
                      href={scopeHref(scope, "suspicious", {
                        sort: sortKey,
                        order: nextOrder(
                          sort,
                          sortKey,
                          order,
                          sortKey === "soldierName" ? "asc" : "desc"
                        )
                      })}
                      label={SORT_LABELS[sortKey]}
                      activeOrder={sort === sortKey ? order : null}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.players.length === 0 ? (
                <tr className={ui.tableRow}>
                  <td className={ui.emptyCell} colSpan={5}>
                    No suspicious players found.
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
                      <PlayerTableCellLink
                        playerId={player.playerId}
                        serverId={serverId}
                        primary
                      >
                        <PlayerIdentity
                          soldierName={player.soldierName}
                          countryCode={player.countryCode}
                        />
                        <PlayerDisciplineBadge status={player.banStatus} />
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
                    <td className={ui.td}>
                      <PlayerTableCellLink playerId={player.playerId} serverId={serverId}>
                        {player.rounds}
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
          totalLabel={`${result.totalRows} players`}
          hasNextPage={result.hasNextPage}
          getPageHref={(targetPage) =>
            scopeHref(scope, "suspicious", {
              sort,
              order,
              page: targetPage > 1 ? targetPage : null
            })
          }
        />
      </section>
    </StatsShell>
  );
}
