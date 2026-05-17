import Link from "next/link";
import { ChatAutoRefresh } from "@/components/chat/chat-auto-refresh";
import { ChatSearchForm } from "@/components/chat/chat-search-form";
import { StatsShell } from "@/components/layout/stats-shell";
import { sortableHeadingClass, ui } from "@/components/layout/stats-ui";
import { PlayerDisciplineBadge } from "@/components/stats/player-discipline-badge";
import { StatsPager } from "@/components/stats/pager";
import {
  PlayerIdentity,
  PlayerTableCellLink,
  playerTableRowClass
} from "@/components/stats/player-link";
import { SubsetBadge } from "@/components/stats/subset-badge";
import {
  getServerChatLog,
  parseChatPage,
  parseChatOrder,
  parseChatSort,
  type ChatSort
} from "@/src/server/repositories/chat-repository";
import { firstValue } from "@/src/server/routing/params";
import {
  allServersHref,
  getAllServersPageScope,
  nextOrder
} from "@/src/server/routing/server-pages";

export const revalidate = 30;

type AllServersChatPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const SORT_LABELS: Record<ChatSort, string> = {
  date: "Date",
  soldierName: "Player",
  message: "Message"
};

export default async function AllServersChatPage({
  searchParams
}: AllServersChatPageProps) {
  const scope = await getAllServersPageScope("chat");
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const sort = parseChatSort(firstValue(resolvedSearchParams.sort));
  const order = parseChatOrder(firstValue(resolvedSearchParams.order));
  const page = parseChatPage(firstValue(resolvedSearchParams.page));
  const query = firstValue(resolvedSearchParams.q)?.trim() || null;
  const result = await getServerChatLog({
    serverIds: scope.serverIds,
    gameId: scope.gameId,
    sort,
    order,
    page,
    pageSize: 20,
    query
  });

  return (
    <StatsShell
      title="All Servers - Chat"
      subtitle="Browse recent chat messages and search by player or keyword across all servers."
      servers={scope.context.servers}
      activeSection="chat"
    >
      <section className={ui.panel}>
        <ChatAutoRefresh intervalMs={60000} />
        <ChatSearchForm
          basePath="/servers/chat"
          clearHref={allServersHref("chat")}
          defaultValue={query ?? ""}
          sort={sort}
          order={order}
        />
        {result.dateRange ? (
          <p className="mb-3 text-xs text-slate-300">
            Date range: {result.dateRange.low} - {result.dateRange.high}
          </p>
        ) : null}
        <div className={ui.tableShell}>
          <table className={ui.table}>
            <thead className={ui.tableHead}>
              <tr>
                <th className={ui.th}>#</th>
                {(["date", "soldierName"] as ChatSort[]).map((sortKey) => (
                  <th key={sortKey} className={ui.th}>
                    <Link
                      href={allServersHref("chat", {
                        sort: sortKey,
                        order: nextOrder(
                          sort,
                          sortKey,
                          order,
                          sortKey === "date" ? "desc" : "asc"
                        ),
                        q: query
                      })}
                      className={sortableHeadingClass(sort === sortKey)}
                    >
                      {SORT_LABELS[sortKey]}
                      {sort === sortKey ? (order === "asc" ? "↑" : "↓") : null}
                    </Link>
                  </th>
                ))}
                <th className={ui.th}>Server</th>
                <th className={ui.th}>Subset</th>
                <th className={ui.th}>
                  <Link
                    href={allServersHref("chat", {
                      sort: "message",
                      order: nextOrder(sort, "message", order, "asc"),
                      q: query
                    })}
                    className={sortableHeadingClass(sort === "message")}
                  >
                    Message{sort === "message" ? (order === "asc" ? "↑" : "↓") : null}
                  </Link>
                </th>
              </tr>
            </thead>
            <tbody>
              {result.entries.length === 0 ? (
                <tr className={ui.tableRow}>
                  <td className={ui.emptyCell} colSpan={6}>No chat entries found.</td>
                </tr>
              ) : (
                result.entries.map((entry, index) => (
                  <tr key={entry.id} className={playerTableRowClass(ui.tableRow)}>
                    <td className={ui.td}>
                      <PlayerTableCellLink playerId={entry.playerId}>
                        {(result.page - 1) * result.pageSize + index + 1}
                      </PlayerTableCellLink>
                    </td>
                    <td className={`${ui.td} whitespace-nowrap`}>
                      <PlayerTableCellLink playerId={entry.playerId}>
                        {entry.logDate}
                      </PlayerTableCellLink>
                    </td>
                    <td className={`${ui.td} whitespace-nowrap`}>
                      <PlayerTableCellLink playerId={entry.playerId}>
                        <PlayerIdentity
                          soldierName={entry.soldierName}
                          countryCode={entry.countryCode}
                        />
                        <PlayerDisciplineBadge status={entry.banStatus} density="compact" />
                      </PlayerTableCellLink>
                    </td>
                    <td className={`${ui.td} whitespace-nowrap text-slate-300`}>
                      <PlayerTableCellLink playerId={entry.playerId}>
                        {entry.serverName ?? `Server #${entry.serverId}`}
                      </PlayerTableCellLink>
                    </td>
                    <td className={`${ui.td} whitespace-nowrap text-slate-300`}>
                      <PlayerTableCellLink playerId={entry.playerId}>
                        <SubsetBadge subset={entry.subset} />
                      </PlayerTableCellLink>
                    </td>
                    <td className={`${ui.td} text-slate-300`}>
                      <PlayerTableCellLink playerId={entry.playerId}>
                        {entry.message}
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
          hasNextPage={result.hasNextPage}
          getPageHref={(targetPage) =>
            allServersHref("chat", {
              sort,
              order,
              q: query,
              page: targetPage
            })
          }
        />
      </section>
    </StatsShell>
  );
}
