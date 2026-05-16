import { notFound } from "next/navigation";
import { StatsShell } from "@/components/layout/stats-shell";
import { sortableHeadingClass, ui } from "@/components/layout/stats-ui";
import { ChatAutoRefresh } from "@/components/chat/chat-auto-refresh";
import { ChatSearchForm } from "@/components/chat/chat-search-form";
import { PlayerDisciplineBadge } from "@/components/stats/player-discipline-badge";
import { StatsPager } from "@/components/stats/pager";
import { PlayerLink } from "@/components/stats/player-link";
import { SubsetBadge } from "@/components/stats/subset-badge";
import { getLegacyServerContext } from "@/src/server/repositories/server-repository";
import {
  getServerChatLog,
  parseChatPage,
  parseChatOrder,
  parseChatSort,
  type ChatOrder,
  type ChatSort
} from "@/src/server/repositories/chat-repository";
import { firstValue, parsePositiveInt } from "@/src/server/routing/params";

export const revalidate = 30;

type ChatPageProps = {
  params: Promise<{ sid: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const SORT_LABELS: Record<ChatSort, string> = {
  date: "Date",
  soldierName: "Player",
  message: "Message"
};

function nextOrder(currentSort: ChatSort, sort: ChatSort, order: ChatOrder): ChatOrder {
  if (currentSort !== sort) {
    return sort === "date" ? "desc" : "asc";
  }

  return order === "asc" ? "desc" : "asc";
}

function buildChatHref(
  serverId: number,
  sort: ChatSort,
  order: ChatOrder,
  query: string | null,
  page: number = 1
): string {
  const params = new URLSearchParams();
  params.set("sort", sort);
  params.set("order", order);
  if (query) {
    params.set("q", query);
  }
  if (page > 1) {
    params.set("page", String(page));
  }

  return `/servers/${serverId}/chat?${params.toString()}`;
}

export default async function ChatPage({ params, searchParams }: ChatPageProps) {
  const { sid } = await params;
  const serverId = parsePositiveInt(sid);
  if (!serverId) {
    notFound();
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const sort = parseChatSort(firstValue(resolvedSearchParams.sort));
  const order = parseChatOrder(firstValue(resolvedSearchParams.order));
  const page = parseChatPage(firstValue(resolvedSearchParams.page));
  const query = firstValue(resolvedSearchParams.q)?.trim() || null;

  const context = await getLegacyServerContext();
  const server = context.servers.find((entry) => entry.serverId === serverId);
  if (!server) {
    notFound();
  }

  const result = await getServerChatLog({
    serverId: server.serverId,
    gameId: server.gameId,
    sort,
    order,
    page,
    pageSize: 20,
    query
  });

  return (
    <StatsShell
      title={`${server.serverName} - Chat`}
      subtitle="Browse recent chat messages and search by player or keyword."
      servers={context.servers}
      currentServerId={server.serverId}
      activeSection="chat"
    >
      <section className={ui.panel}>
        <ChatAutoRefresh intervalMs={60000} />
        <ChatSearchForm
          basePath={`/servers/${server.serverId}/chat`}
          clearHref={`/servers/${server.serverId}/chat`}
          defaultValue={query ?? ""}
          sort={sort}
          order={order}
          serverId={server.serverId}
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
                  {(["date", "soldierName"] as ChatSort[]).map((sortKey) => {
                    const href = buildChatHref(
                      server.serverId,
                      sortKey,
                      nextOrder(sort, sortKey, order),
                      query
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
                  <th className={ui.th}>Subset</th>
                  <th className={ui.th}>
                    <a
                      href={buildChatHref(
                        server.serverId,
                        "message",
                        nextOrder(sort, "message", order),
                        query
                      )}
                      className={sortableHeadingClass(sort === "message")}
                    >
                      {SORT_LABELS.message}
                      {sort === "message" ? (order === "asc" ? "↑" : "↓") : null}
                    </a>
                  </th>
                </tr>
              </thead>
              <tbody>
              {result.entries.length === 0 ? (
                <tr className={ui.tableRow}>
                  <td className={ui.emptyCell} colSpan={5}>
                    No chat entries found.
                  </td>
                </tr>
              ) : (
                result.entries.map((entry, index) => (
                  <tr
                    key={entry.id}
                    className={ui.tableRow}
                  >
                    <td className={ui.td}>
                      {(result.page - 1) * result.pageSize + index + 1}
                    </td>
                    <td className={`${ui.td} whitespace-nowrap`}>{entry.logDate}</td>
                    <td className={`${ui.td} whitespace-nowrap`}>
                      <PlayerLink
                        playerId={entry.playerId}
                        soldierName={entry.soldierName}
                        countryCode={entry.countryCode}
                        serverId={server.serverId}
                      />
                      <PlayerDisciplineBadge status={entry.banStatus} density="compact" />
                    </td>
                    <td className={`${ui.td} whitespace-nowrap text-slate-300`}>
                      <SubsetBadge subset={entry.subset} />
                    </td>
                    <td className={`${ui.td} text-slate-300`}>
                      {entry.message}
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
            buildChatHref(server.serverId, sort, order, query, targetPage)
          }
        />
      </section>
    </StatsShell>
  );
}
