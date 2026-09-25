import Link from "next/link";
import { ChatAutoRefresh } from "@/components/chat/chat-auto-refresh";
import { ChatSearchForm } from "@/components/chat/chat-search-form";
import { StatsShell } from "@/components/layout/stats-shell";
import { sortableHeadingClass, ui } from "@/components/layout/stats-ui";
import { DateTime } from "@/components/stats/date-time";
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
  parseChatOrder,
  parseChatPage,
  parseChatSort,
  type ChatSort
} from "@/src/server/repositories/chat-repository";
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

type ChatSectionProps = {
  scope: PageScope;
  searchParams: SearchParams;
};

const SORT_LABELS: Record<ChatSort, string> = {
  date: "Date",
  soldierName: "Player",
  message: "Message"
};

export async function ChatSection({ scope, searchParams }: ChatSectionProps) {
  const sort = parseChatSort(firstValue(searchParams.sort));
  const order = parseChatOrder(firstValue(searchParams.order));
  const page = parseChatPage(firstValue(searchParams.page));
  const query = firstValue(searchParams.q)?.trim() || null;
  const serverId = scopeServerId(scope);
  const showServer = scope.kind === "all";
  const result = await getServerChatLog({
    ...scopeServers(scope),
    gameId: scope.gameId,
    sort,
    order,
    page,
    pageSize: 20,
    query
  });

  function sortHeading(sortKey: ChatSort) {
    return (
      <Link
        href={scopeHref(scope, "chat", {
          sort: sortKey,
          order: nextOrder(sort, sortKey, order, sortKey === "date" ? "desc" : "asc"),
          q: query
        })}
        className={sortableHeadingClass(sort === sortKey)}
      >
        {SORT_LABELS[sortKey]}
        {sort === sortKey ? (order === "asc" ? "↑" : "↓") : null}
      </Link>
    );
  }

  return (
    <StatsShell
      title={`${scopeName(scope)} - Chat`}
      subtitle={
        scope.kind === "all"
          ? "Browse recent chat messages and search by player or keyword across all servers."
          : "Browse recent chat messages and search by player or keyword."
      }
      servers={scope.context.servers}
      currentServerId={serverId}
      activeSection="chat"
    >
      <section className={ui.panel}>
        <ChatAutoRefresh intervalMs={60000} />
        <ChatSearchForm
          basePath={scopeHref(scope, "chat")}
          clearHref={scopeHref(scope, "chat")}
          defaultValue={query ?? ""}
          sort={sort}
          order={order}
          serverId={serverId}
        />

        {result.dateRange ? (
          <p className="mb-3 text-xs text-slate-300">
            Date range: <DateTime value={result.dateRange.low} /> -{" "}
            <DateTime value={result.dateRange.high} />
          </p>
        ) : null}

        <div className={ui.tableShell}>
          <table className={ui.table}>
            <thead className={ui.tableHead}>
              <tr>
                <th className={ui.th}>#</th>
                <th className={ui.th}>{sortHeading("date")}</th>
                <th className={ui.th}>{sortHeading("soldierName")}</th>
                {showServer ? <th className={ui.th}>Server</th> : null}
                <th className={ui.th}>Subset</th>
                <th className={ui.th}>{sortHeading("message")}</th>
              </tr>
            </thead>
            <tbody>
              {result.entries.length === 0 ? (
                <tr className={ui.tableRow}>
                  <td className={ui.emptyCell} colSpan={showServer ? 6 : 5}>
                    No chat entries found.
                  </td>
                </tr>
              ) : (
                result.entries.map((entry, index) => (
                  <tr
                    key={entry.id}
                    className={playerTableRowClass(ui.tableRow, entry.playerId !== null)}
                  >
                    <td className={ui.td}>
                      <PlayerTableCellLink playerId={entry.playerId} serverId={serverId}>
                        {(result.page - 1) * result.pageSize + index + 1}
                      </PlayerTableCellLink>
                    </td>
                    <td className={`${ui.td} whitespace-nowrap`}>
                      <PlayerTableCellLink playerId={entry.playerId} serverId={serverId}>
                        <DateTime value={entry.logDate} />
                      </PlayerTableCellLink>
                    </td>
                    <td className={`${ui.td} whitespace-nowrap`}>
                      <PlayerTableCellLink
                        playerId={entry.playerId}
                        serverId={serverId}
                        primary
                      >
                        <PlayerIdentity
                          soldierName={entry.soldierName}
                          countryCode={entry.countryCode}
                        />
                        <PlayerDisciplineBadge status={entry.banStatus} density="compact" />
                      </PlayerTableCellLink>
                    </td>
                    {showServer ? (
                      <td className={`${ui.td} whitespace-nowrap text-slate-300`}>
                        <PlayerTableCellLink playerId={entry.playerId} serverId={serverId}>
                          {entry.serverName ?? `Server #${entry.serverId}`}
                        </PlayerTableCellLink>
                      </td>
                    ) : null}
                    <td className={`${ui.td} whitespace-nowrap text-slate-300`}>
                      <PlayerTableCellLink playerId={entry.playerId} serverId={serverId}>
                        <SubsetBadge subset={entry.subset} />
                      </PlayerTableCellLink>
                    </td>
                    <td className={`${ui.td} text-slate-300`}>
                      <PlayerTableCellLink playerId={entry.playerId} serverId={serverId}>
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
            scopeHref(scope, "chat", {
              sort,
              order,
              q: query,
              page: targetPage > 1 ? targetPage : null
            })
          }
        />
      </section>
    </StatsShell>
  );
}
