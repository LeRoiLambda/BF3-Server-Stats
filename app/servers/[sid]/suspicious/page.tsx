import { notFound } from "next/navigation";
import { StatsShell } from "@/components/layout/stats-shell";
import { banTagClass, sortableHeadingClass, ui } from "@/components/layout/stats-ui";
import { StatsPager } from "@/components/stats/pager";
import { PlayerLink } from "@/components/stats/player-link";
import { getLegacyServerContext } from "@/src/server/repositories/server-repository";
import {
  getSuspiciousPlayers,
  parseSuspiciousOrder,
  parseSuspiciousPage,
  parseSuspiciousSort,
  type SuspiciousOrder,
  type SuspiciousSort
} from "@/src/server/repositories/suspicious-repository";
import { firstValue, parsePositiveInt } from "@/src/server/routing/params";

export const revalidate = 30;

type SuspiciousPageProps = {
  params: Promise<{ sid: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const SORT_LABELS: Record<SuspiciousSort, string> = {
  soldierName: "Player",
  kdr: "KDR",
  hsr: "HSR",
  rounds: "Rounds"
};

function nextOrder(
  currentSort: SuspiciousSort,
  sort: SuspiciousSort,
  order: SuspiciousOrder
): SuspiciousOrder {
  if (currentSort !== sort) {
    return sort === "soldierName" ? "asc" : "desc";
  }

  return order === "asc" ? "desc" : "asc";
}

function buildSuspiciousHref(
  serverId: number,
  sort: SuspiciousSort,
  order: SuspiciousOrder,
  page: number
): string {
  const params = new URLSearchParams();
  params.set("sort", sort);
  params.set("order", order);
  params.set("page", String(page));
  return `/servers/${serverId}/suspicious?${params.toString()}`;
}

export default async function SuspiciousPage({
  params,
  searchParams
}: SuspiciousPageProps) {
  const { sid } = await params;
  const serverId = parsePositiveInt(sid);
  if (!serverId) {
    notFound();
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const sort = parseSuspiciousSort(firstValue(resolvedSearchParams.sort));
  const order = parseSuspiciousOrder(firstValue(resolvedSearchParams.order));
  const page = parseSuspiciousPage(firstValue(resolvedSearchParams.page));

  const context = await getLegacyServerContext();
  const server = context.servers.find((entry) => entry.serverId === serverId);
  if (!server) {
    notFound();
  }

  const result = await getSuspiciousPlayers({
    serverId: server.serverId,
    gameId: server.gameId,
    sort,
    order,
    page,
    pageSize: 20
  });

  return (
    <StatsShell
      title={`${server.serverName} - Suspicious Players`}
      subtitle="Players with unusual stats. Use this as a warning signal, not final proof."
      servers={context.servers}
      currentServerId={server.serverId}
      activeSection="suspicious"
    >
      <section className={ui.panel}>
        <p className="mb-4 text-sm text-slate-300">
          This list flags outliers from historical stats and is not definitive proof.
        </p>

        <div className={ui.tableShell}>
          <table className={ui.table}>
            <thead className={ui.tableHead}>
              <tr>
                <th className={ui.th}>#</th>
                {(Object.keys(SORT_LABELS) as SuspiciousSort[]).map((sortKey) => {
                  const href = buildSuspiciousHref(
                    server.serverId,
                    sortKey,
                    nextOrder(sort, sortKey, order),
                    1
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
            <tbody>
              {result.players.length === 0 ? (
                <tr className={ui.tableRow}>
                  <td className={ui.emptyCell} colSpan={5}>
                    No suspicious players found.
                  </td>
                </tr>
              ) : (
                result.players.map((player, index) => (
                  <tr
                    key={player.playerId}
                    className={ui.tableRow}
                  >
                    <td className={ui.td}>
                      {(result.page - 1) * result.pageSize + index + 1}
                    </td>
                    <td className={ui.td}>
                      <PlayerLink
                        playerId={player.playerId}
                        soldierName={player.soldierName}
                        countryCode={player.countryCode}
                        serverId={server.serverId}
                      />
                      {player.banStatus ? (
                        <span className={banTagClass(player.banStatus)}>
                          {player.banStatus}
                        </span>
                      ) : null}
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
          getPageHref={(targetPage) =>
            buildSuspiciousHref(server.serverId, sort, order, targetPage)
          }
        />
      </section>
    </StatsShell>
  );
}
