import Link from "next/link";
import { SegmentedNav } from "@/components/layout/segmented-nav";
import { StatsShell } from "@/components/layout/stats-shell";
import { SortHeading } from "@/components/layout/sort-heading";
import { ui } from "@/components/layout/stats-ui";
import { PlayerAutocompleteInput } from "@/components/search/player-autocomplete-input";
import { PlayerDisciplineBadge } from "@/components/stats/player-discipline-badge";
import { StatsPager } from "@/components/stats/pager";
import { RouteAutoRefresh } from "@/components/stats/route-auto-refresh";
import {
  PlayerIdentity,
  PlayerTableCellLink,
  playerTableRowClass
} from "@/components/stats/player-link";
import { WeeklyLeaderboardRank } from "@/components/stats/weekly-leaderboard-rank";
import { WeeklyUnrankedServersNote } from "@/components/stats/weekly-leaderboard-section";
import {
  getLeaderboard,
  getWeeklyLeaderboard,
  parseLeaderboardPage,
  parseLeaderSort,
  parseSortOrder,
  type LeaderSort
} from "@/src/server/repositories/player-stats-repository";
import { firstValue } from "@/src/server/routing/params";
import {
  nextOrder,
  scopeHref,
  scopeName,
  scopeServerId,
  type PageScope,
  type SearchParams
} from "@/src/server/routing/server-pages";

type LeadersSectionProps = {
  scope: PageScope;
  searchParams: SearchParams;
};

const SORT_LABELS: Record<LeaderSort, string> = {
  soldierName: "Player",
  score: "Score",
  kills: "Kills",
  kdr: "KDR",
  hsr: "HSR"
};

function scopeServerIds(scope: PageScope): number[] {
  return scope.kind === "all" ? scope.serverIds : [scope.server.serverId];
}

export async function LeadersSection({ scope, searchParams }: LeadersSectionProps) {
  const view = firstValue(searchParams.view) === "weekly" ? "weekly" : "overall";
  const sort = parseLeaderSort(firstValue(searchParams.sort));
  const order = parseSortOrder(firstValue(searchParams.order));
  const page = parseLeaderboardPage(firstValue(searchParams.page));
  const search = firstValue(searchParams.q)?.trim() || null;
  const serverId = scopeServerId(scope);

  const serverIds = scopeServerIds(scope);
  const [result, weeklyResult] = await Promise.all([
    view === "overall"
      ? getLeaderboard({ serverIds, gameId: scope.gameId, sort, order, page, pageSize: 20, search })
      : Promise.resolve(null),
    view === "weekly"
      ? getWeeklyLeaderboard({ serverIds, gameId: scope.gameId, limit: 20 })
      : Promise.resolve(null)
  ]);

  return (
    <StatsShell
      title={`${scopeName(scope)} - Leaderboard`}
      subtitle={
        scope.kind === "all"
          ? "Top players across all servers. Sort by score, kills, KDR, or HSR."
          : "Top players on this server. Sort by score, kills, KDR, or HSR."
      }
      servers={scope.context.servers}
      currentServerId={serverId}
      activeSection="leaders"
    >
      {view === "weekly" ? <RouteAutoRefresh intervalMs={30000} /> : null}
      <section className={ui.panel}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <SegmentedNav
            label="Leaderboard view"
            items={[
              {
                href: scopeHref(scope, "leaders"),
                label: "Top Players",
                selected: view === "overall"
              },
              {
                href: scopeHref(scope, "leaders", { view: "weekly" }),
                label: "Top 20 This Week",
                selected: view === "weekly"
              }
            ]}
          />
          {view === "overall" ? (
            <form method="get" className="flex flex-nowrap items-center gap-2">
              <input type="hidden" name="view" value="overall" />
              <PlayerAutocompleteInput
                name="q"
                placeholder="Search player..."
                label="Search player"
                submitOnPick
                defaultValue={search ?? ""}
                serverId={serverId}
                className={ui.input}
                wrapperClassName="flex-1 max-w-sm"
              />
              <input type="hidden" name="sort" value={sort} />
              <input type="hidden" name="order" value={order} />
              <button type="submit" className={ui.buttonPrimary}>
                Search
              </button>
              {search ? (
                <Link href={scopeHref(scope, "leaders")} className={ui.buttonGhost}>
                  Clear
                </Link>
              ) : null}
            </form>
          ) : null}
        </div>

        <div className={ui.tableShell}>
          <table className={ui.table}>
            <thead className={ui.tableHead}>
              <tr>
                <th className={ui.th}>#</th>
                {(Object.keys(SORT_LABELS) as LeaderSort[]).map((sortKey) => (
                  <th key={sortKey} className={ui.th}>
                    {view === "overall" ? (
                      <SortHeading
                        href={scopeHref(scope, "leaders", {
                          view: "overall",
                          sort: sortKey,
                          order: nextOrder(
                            sort,
                            sortKey,
                            order,
                            sortKey === "soldierName" ? "asc" : "desc"
                          ),
                          q: search
                        })}
                        label={SORT_LABELS[sortKey]}
                        activeOrder={sort === sortKey ? order : null}
                      />
                    ) : (
                      SORT_LABELS[sortKey]
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {view === "overall" && result && result.players.length === 0 ? (
                <tr className={ui.tableRow}>
                  <td className={ui.emptyCell} colSpan={6}>
                    No player stats found.
                  </td>
                </tr>
              ) : view === "weekly" && weeklyResult && !weeklyResult.available ? (
                <tr className={ui.tableRow}>
                  <td className={ui.emptyCell} colSpan={6}>
                    Weekly leaderboard is unavailable because session history is missing.
                  </td>
                </tr>
              ) : view === "weekly" && weeklyResult?.available && weeklyResult.players.length === 0 ? (
                <tr className={ui.tableRow}>
                  <td className={ui.emptyCell} colSpan={6}>
                    No weekly stats found yet.
                  </td>
                </tr>
              ) : (
                (view === "weekly" ? weeklyResult?.players ?? [] : result?.players ?? []).map(
                  (player, index) => (
                    <tr key={player.playerId} className={playerTableRowClass(ui.tableRow)}>
                      <td className={ui.td}>
                        <PlayerTableCellLink playerId={player.playerId} serverId={serverId}>
                          {view === "weekly" || !result ? (
                            <WeeklyLeaderboardRank rank={index + 1} />
                          ) : (
                            (result.page - 1) * result.pageSize + index + 1
                          )}
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
                          {player.score}
                        </PlayerTableCellLink>
                      </td>
                      <td className={ui.td}>
                        <PlayerTableCellLink playerId={player.playerId} serverId={serverId}>
                          {player.kills}
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
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>

        {view === "overall" && result ? (
          <StatsPager
            page={result.page}
            totalPages={result.totalPages}
            totalLabel={`${result.totalRows} players`}
            hasNextPage={result.hasNextPage}
            getPageHref={(targetPage) =>
              scopeHref(scope, "leaders", {
                view,
                sort,
                order,
                q: search,
                page: targetPage > 1 ? targetPage : null
              })
            }
          />
        ) : null}
        {weeklyResult ? (
          <WeeklyUnrankedServersNote result={weeklyResult} servers={scope.context.servers} />
        ) : null}
      </section>
    </StatsShell>
  );
}
