import Link from "next/link";
import { notFound } from "next/navigation";
import { SegmentedNav } from "@/components/layout/segmented-nav";
import { StatsShell } from "@/components/layout/stats-shell";
import { sortableHeadingClass, ui } from "@/components/layout/stats-ui";
import { PlayerAutocompleteInput } from "@/components/search/player-autocomplete-input";
import { PlayerDisciplineBadge } from "@/components/stats/player-discipline-badge";
import { StatsPager } from "@/components/stats/pager";
import {
  PlayerIdentity,
  PlayerTableCellLink,
  playerTableRowClass
} from "@/components/stats/player-link";
import { WeeklyLeaderboardRank } from "@/components/stats/weekly-leaderboard-rank";
import { getLegacyServerContext } from "@/src/server/repositories/server-repository";
import {
  getWeeklyServerLeaderboard,
  getServerLeaderboard,
  parseLeaderboardPage,
  parseLeaderSort,
  parseSortOrder,
  type LeaderSort,
  type SortOrder
} from "@/src/server/repositories/player-stats-repository";

export const revalidate = 30;

type LeadersPageProps = {
  params: Promise<{ sid: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const SORT_LABELS: Record<LeaderSort, string> = {
  soldierName: "Player",
  score: "Score",
  kills: "Kills",
  kdr: "KDR",
  hsr: "HSR"
};

function parseServerId(rawSid: string): number | null {
  const parsed = Number.parseInt(rawSid, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function firstValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function nextOrder(currentSort: LeaderSort, sort: LeaderSort, order: SortOrder): SortOrder {
  if (currentSort !== sort) {
    return sort === "soldierName" ? "asc" : "desc";
  }

  return order === "asc" ? "desc" : "asc";
}

function buildLeadersHref(
  serverId: number,
  sort: LeaderSort,
  order: SortOrder,
  search: string | null,
  view: "overall" | "weekly",
  page: number = 1
): string {
  const params = new URLSearchParams();
  params.set("view", view);
  params.set("sort", sort);
  params.set("order", order);
  if (search) {
    params.set("q", search);
  }
  if (page > 1) {
    params.set("page", String(page));
  }

  return `/servers/${serverId}/leaders?${params.toString()}`;
}

export default async function LeadersPage({
  params,
  searchParams
}: LeadersPageProps) {
  const { sid } = await params;
  const serverId = parseServerId(sid);
  if (!serverId) {
    notFound();
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const view = firstValue(resolvedSearchParams.view) === "weekly" ? "weekly" : "overall";
  const sort = parseLeaderSort(firstValue(resolvedSearchParams.sort));
  const order = parseSortOrder(firstValue(resolvedSearchParams.order));
  const page = parseLeaderboardPage(firstValue(resolvedSearchParams.page));
  const search = firstValue(resolvedSearchParams.q)?.trim() || null;

  const context = await getLegacyServerContext();
  const server = context.servers.find((entry) => entry.serverId === serverId);
  if (!server) {
    notFound();
  }

  const [result, weeklyResult] = await Promise.all([
    view === "overall"
      ? getServerLeaderboard({
          serverId: server.serverId,
          gameId: server.gameId,
          sort,
          order,
          page,
          pageSize: 20,
          search
        })
      : Promise.resolve(null),
    view === "weekly"
      ? getWeeklyServerLeaderboard({
          serverId: server.serverId,
          gameId: server.gameId,
          limit: 20
        })
      : Promise.resolve(null)
  ]);

  return (
    <StatsShell
      title={`${server.serverName} - Leaderboard`}
      subtitle="Top players on this server. Sort by score, kills, KDR, or HSR."
      servers={context.servers}
      currentServerId={server.serverId}
      activeSection="leaders"
    >
      <section className={ui.panel}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <SegmentedNav
            label="Leaderboard view"
            items={[
              {
                href: `/servers/${server.serverId}/leaders`,
                label: "Top Players",
                selected: view === "overall"
              },
              {
                href: `/servers/${server.serverId}/leaders?view=weekly`,
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
                serverId={server.serverId}
                className={ui.input}
                wrapperClassName="flex-1 max-w-sm"
              />
              <input type="hidden" name="sort" value={sort} />
              <input type="hidden" name="order" value={order} />
              <button
                type="submit"
                className={ui.buttonPrimary}
              >
                Search
              </button>
              {search ? (
                <Link
                  href={`/servers/${server.serverId}/leaders`}
                  className={ui.buttonGhost}
                >
                  Clear
                </Link>
              ) : null}
            </form>
          ) : null}
        </div>

        <div className={ui.tableShell}>
          <table className={ui.table}>
            {view === "overall" && result ? (
              <thead className={ui.tableHead}>
                <tr>
                  <th className={ui.th}>#</th>
                  {(Object.keys(SORT_LABELS) as LeaderSort[]).map((sortKey) => {
                    const href = buildLeadersHref(
                      server.serverId,
                      sortKey,
                      nextOrder(sort, sortKey, order),
                      search,
                      "overall"
                    );
                    const isActive = sort === sortKey;

                    return (
                      <th key={sortKey} className={ui.th}>
                        <a
                          href={href}
                          className={sortableHeadingClass(isActive)}
                        >
                          {SORT_LABELS[sortKey]}
                          {isActive ? (order === "asc" ? "↑" : "↓") : null}
                        </a>
                      </th>
                    );
                  })}
                </tr>
              </thead>
            ) : (
              <thead className={ui.tableHead}>
                <tr>
                  <th className={ui.th}>#</th>
                  <th className={ui.th}>Player</th>
                  <th className={ui.th}>Score</th>
                  <th className={ui.th}>Kills</th>
                  <th className={ui.th}>KDR</th>
                  <th className={ui.th}>HSR</th>
                </tr>
              </thead>
            )}
            <tbody>
              {(view === "overall" && result && result.players.length === 0) ||
              (view === "weekly" && weeklyResult?.available && weeklyResult.players.length === 0) ? (
                <tr className={ui.tableRow}>
                  <td className={ui.emptyCell} colSpan={6}>
                    {view === "weekly" ? "No session stats found this week." : "No player stats found."}
                  </td>
                </tr>
              ) : view === "weekly" && weeklyResult && !weeklyResult.available ? (
                <tr className={ui.tableRow}>
                  <td className={ui.emptyCell} colSpan={6}>
                    Weekly leaderboard is unavailable because `tbl_sessions` is missing.
                  </td>
                </tr>
              ) : (
                (view === "weekly" ? weeklyResult?.players ?? [] : result?.players ?? []).map(
                  (player, index) => (
                    <tr
                      key={player.playerId}
                      className={playerTableRowClass(ui.tableRow)}
                    >
                      <td className={ui.td}>
                        <PlayerTableCellLink
                          playerId={player.playerId}
                          serverId={server.serverId}
                        >
                          {view === "weekly" ? (
                            <WeeklyLeaderboardRank rank={index + 1} />
                          ) : result ? (
                            (result.page - 1) * result.pageSize + index + 1
                          ) : (
                            index + 1
                          )}
                        </PlayerTableCellLink>
                      </td>
                      <td className={ui.td}>
                        <PlayerTableCellLink
                          playerId={player.playerId}
                          serverId={server.serverId}
                        >
                          <PlayerIdentity
                            soldierName={player.soldierName}
                            countryCode={player.countryCode}
                          />
                          <PlayerDisciplineBadge status={player.banStatus} />
                        </PlayerTableCellLink>
                      </td>
                      <td className={ui.td}>
                        <PlayerTableCellLink
                          playerId={player.playerId}
                          serverId={server.serverId}
                        >
                          {player.score}
                        </PlayerTableCellLink>
                      </td>
                      <td className={ui.td}>
                        <PlayerTableCellLink
                          playerId={player.playerId}
                          serverId={server.serverId}
                        >
                          {player.kills}
                        </PlayerTableCellLink>
                      </td>
                      <td className={ui.td}>
                        <PlayerTableCellLink
                          playerId={player.playerId}
                          serverId={server.serverId}
                        >
                          {player.kdr.toFixed(2)}
                        </PlayerTableCellLink>
                      </td>
                      <td className={ui.td}>
                        <PlayerTableCellLink
                          playerId={player.playerId}
                          serverId={server.serverId}
                        >
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
              buildLeadersHref(
                server.serverId,
                sort,
                order,
                search,
                "overall",
                targetPage
              )
            }
          />
        ) : null}
      </section>
    </StatsShell>
  );
}
