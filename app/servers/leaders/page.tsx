import Link from "next/link";
import { SegmentedNav } from "@/components/layout/segmented-nav";
import { StatsShell } from "@/components/layout/stats-shell";
import { sortableHeadingClass, ui } from "@/components/layout/stats-ui";
import { PlayerAutocompleteInput } from "@/components/search/player-autocomplete-input";
import { PlayerDisciplineBadge } from "@/components/stats/player-discipline-badge";
import { StatsPager } from "@/components/stats/pager";
import { PlayerLink } from "@/components/stats/player-link";
import { WeeklyLeaderboardRank } from "@/components/stats/weekly-leaderboard-rank";
import {
  getAllServersLeaderboard,
  getAllServersWeeklyLeaderboard,
  parseLeaderboardPage,
  parseLeaderSort,
  parseSortOrder,
  type LeaderSort
} from "@/src/server/repositories/player-stats-repository";
import { firstValue } from "@/src/server/routing/params";
import {
  allServersHref,
  getAllServersPageScope,
  nextOrder
} from "@/src/server/routing/server-pages";

export const revalidate = 30;

type AllServersLeadersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const SORT_LABELS: Record<LeaderSort, string> = {
  soldierName: "Player",
  score: "Score",
  kills: "Kills",
  kdr: "KDR",
  hsr: "HSR"
};

export default async function AllServersLeadersPage({
  searchParams
}: AllServersLeadersPageProps) {
  const scope = await getAllServersPageScope("leaders");
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const view = firstValue(resolvedSearchParams.view) === "weekly" ? "weekly" : "overall";
  const sort = parseLeaderSort(firstValue(resolvedSearchParams.sort));
  const order = parseSortOrder(firstValue(resolvedSearchParams.order));
  const page = parseLeaderboardPage(firstValue(resolvedSearchParams.page));
  const search = firstValue(resolvedSearchParams.q)?.trim() || null;

  const [result, weeklyResult] = await Promise.all([
    view === "overall"
      ? getAllServersLeaderboard({
          serverIds: scope.serverIds,
          gameId: scope.gameId,
          sort,
          order,
          page,
          pageSize: 20,
          search
        })
      : Promise.resolve(null),
    view === "weekly"
      ? getAllServersWeeklyLeaderboard({
          serverIds: scope.serverIds,
          gameId: scope.gameId,
          limit: 20
        })
      : Promise.resolve(null)
  ]);

  return (
    <StatsShell
      title="All Servers - Leaderboard"
      subtitle="Top players across all servers. Sort by score, kills, KDR, or HSR."
      servers={scope.context.servers}
      activeSection="leaders"
    >
      <section className={ui.panel}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <SegmentedNav
            label="Leaderboard view"
            items={[
              {
                href: allServersHref("leaders"),
                label: "Top Players",
                selected: view === "overall"
              },
              {
                href: allServersHref("leaders", { view: "weekly" }),
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
                defaultValue={search ?? ""}
                className={ui.input}
                wrapperClassName="flex-1 max-w-sm"
              />
              <input type="hidden" name="sort" value={sort} />
              <input type="hidden" name="order" value={order} />
              <button type="submit" className={ui.buttonPrimary}>Search</button>
              {search ? (
                <Link href={allServersHref("leaders")} className={ui.buttonGhost}>Clear</Link>
              ) : null}
            </form>
          ) : null}
        </div>

        <div className={ui.tableShell}>
          <table className={ui.table}>
            <thead className={ui.tableHead}>
              <tr>
                <th className={ui.th}>#</th>
                {(Object.keys(SORT_LABELS) as LeaderSort[]).map((sortKey) => {
                  const href = allServersHref("leaders", {
                    view: "overall",
                    sort: sortKey,
                    order: nextOrder(
                      sort,
                      sortKey,
                      order,
                      sortKey === "soldierName" ? "asc" : "desc"
                    ),
                    q: search
                  });
                  const isActive = view === "overall" && sort === sortKey;

                  return (
                    <th key={sortKey} className={ui.th}>
                      {view === "overall" ? (
                        <Link href={href} className={sortableHeadingClass(isActive)}>
                          {SORT_LABELS[sortKey]}
                          {isActive ? (order === "asc" ? "↑" : "↓") : null}
                        </Link>
                      ) : (
                        SORT_LABELS[sortKey]
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {view === "overall" && result && result.players.length === 0 ? (
                <tr className={ui.tableRow}>
                  <td className={ui.emptyCell} colSpan={6}>No player stats found.</td>
                </tr>
              ) : view === "weekly" && weeklyResult && !weeklyResult.available ? (
                <tr className={ui.tableRow}>
                  <td className={ui.emptyCell} colSpan={6}>
                    Weekly leaderboard is unavailable because `tbl_sessions` is missing.
                  </td>
                </tr>
              ) : view === "weekly" && weeklyResult?.available && weeklyResult.players.length === 0 ? (
                <tr className={ui.tableRow}>
                  <td className={ui.emptyCell} colSpan={6}>
                    No session stats found this week.
                  </td>
                </tr>
              ) : (
                (view === "weekly" ? weeklyResult?.players ?? [] : result?.players ?? []).map(
                  (player, index) => (
                    <tr key={player.playerId} className={ui.tableRow}>
                      <td className={ui.td}>
                        {view === "weekly" || !result ? (
                          <WeeklyLeaderboardRank rank={index + 1} />
                        ) : (
                          (result.page - 1) * result.pageSize + index + 1
                        )}
                      </td>
                      <td className={ui.td}>
                        <PlayerLink
                          playerId={player.playerId}
                          soldierName={player.soldierName}
                          countryCode={player.countryCode}
                        />
                        <PlayerDisciplineBadge status={player.banStatus} />
                      </td>
                      <td className={ui.td}>{player.score}</td>
                      <td className={ui.td}>{player.kills}</td>
                      <td className={ui.td}>{player.kdr.toFixed(2)}</td>
                      <td className={ui.td}>{player.hsr.toFixed(2)}%</td>
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
              allServersHref("leaders", {
                view,
                sort,
                order,
                q: search,
                page: targetPage
              })
            }
          />
        ) : null}
      </section>
    </StatsShell>
  );
}
