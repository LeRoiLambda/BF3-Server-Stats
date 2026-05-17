import { notFound } from "next/navigation";
import { StatsShell } from "@/components/layout/stats-shell";
import { sortableHeadingClass, ui } from "@/components/layout/stats-ui";
import { ModerationPolicySection } from "@/components/stats/moderation-policy-section";
import { StatsPager } from "@/components/stats/pager";
import {
  PlayerIdentity,
  PlayerTableCellLink,
  playerTableRowClass
} from "@/components/stats/player-link";
import { getLegacyServerContext } from "@/src/server/repositories/server-repository";
import { getModerationPolicy } from "@/src/server/repositories/moderation-repository";
import {
  getBannedPlayers,
  parseBanPage,
  parseBanOrder,
  parseBanSort,
  type BanOrder,
  type BanSort
} from "@/src/server/repositories/bans-repository";
import { firstValue, parsePositiveInt } from "@/src/server/routing/params";

export const revalidate = 30;

type BansPageProps = {
  params: Promise<{ sid: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const SORT_LABELS: Record<BanSort, string> = {
  soldierName: "Player",
  kdr: "KDR",
  hsr: "HSR"
};

function nextOrder(currentSort: BanSort, sort: BanSort, order: BanOrder): BanOrder {
  if (currentSort !== sort) {
    return sort === "soldierName" ? "asc" : "desc";
  }

  return order === "asc" ? "desc" : "asc";
}

function buildBansHref(
  serverId: number,
  sort: BanSort,
  order: BanOrder,
  page: number = 1
): string {
  const params = new URLSearchParams();
  params.set("sort", sort);
  params.set("order", order);
  if (page > 1) {
    params.set("page", String(page));
  }
  return `/servers/${serverId}/bans?${params.toString()}`;
}

export default async function BansPage({ params, searchParams }: BansPageProps) {
  const { sid } = await params;
  const serverId = parsePositiveInt(sid);
  if (!serverId) {
    notFound();
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const sort = parseBanSort(firstValue(resolvedSearchParams.sort));
  const order = parseBanOrder(firstValue(resolvedSearchParams.order));
  const page = parseBanPage(firstValue(resolvedSearchParams.page));

  const context = await getLegacyServerContext();
  const server = context.servers.find((entry) => entry.serverId === serverId);
  if (!server) {
    notFound();
  }

  const [result, policy] = await Promise.all([
    getBannedPlayers({
      serverId: server.serverId,
      gameId: server.gameId,
      sort,
      order,
      page,
      pageSize: 20
    }),
    getModerationPolicy({
      serverId: server.serverId
    })
  ]);

  return (
    <StatsShell
      title={`${server.serverName} - Bans`}
      subtitle="Active ban list for this server."
      servers={context.servers}
      currentServerId={server.serverId}
      activeSection="bans"
    >
      <ModerationPolicySection policy={policy} className="mb-6" />
      <section className={ui.panel}>
        {!result.available ? (
          <p className="text-sm text-slate-300">
            Ban data is not enabled for this server right now.
          </p>
        ) : (
          <>
            <div className={ui.tableShell}>
              <table className={ui.table}>
                <thead className={ui.tableHead}>
                  <tr>
                    <th className={ui.th}>#</th>
                    {(Object.keys(SORT_LABELS) as BanSort[]).map((sortKey) => {
                      const href = buildBansHref(
                        server.serverId,
                        sortKey,
                        nextOrder(sort, sortKey, order)
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
                      <tr
                        key={player.playerId}
                        className={playerTableRowClass(ui.tableRow)}
                      >
                        <td className={ui.td}>
                          <PlayerTableCellLink
                            playerId={player.playerId}
                            serverId={server.serverId}
                          >
                            {(result.page - 1) * result.pageSize + index + 1}
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
                        <td className={`${ui.td} text-slate-300`}>
                          <PlayerTableCellLink
                            playerId={player.playerId}
                            serverId={server.serverId}
                          >
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
                buildBansHref(server.serverId, sort, order, targetPage)
              }
            />
          </>
        )}
      </section>
    </StatsShell>
  );
}
