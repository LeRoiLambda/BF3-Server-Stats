import Image from "next/image";
import { notFound } from "next/navigation";
import { SegmentedNav } from "@/components/layout/segmented-nav";
import { RouteAutoRefresh } from "@/components/stats/route-auto-refresh";
import { StatsShell } from "@/components/layout/stats-shell";
import { banTagClass, sortableHeadingClass, ui } from "@/components/layout/stats-ui";
import { PlayerLink } from "@/components/stats/player-link";
import {
  formatGamemodeName,
  formatMapName,
  mapImagePath
} from "@/src/server/domain/bf3-reference";
import { getLegacyServerContext } from "@/src/server/repositories/server-repository";
import {
  getServerLeaderboard,
  getWeeklyServerLeaderboard,
  listCurrentPlayersByServer,
  parseCurrentPlayerOrder,
  parseCurrentPlayerSort,
  type CurrentPlayer,
  type CurrentPlayerOrder,
  type CurrentPlayerSort
} from "@/src/server/repositories/player-stats-repository";
import { getServerOverviewStats, listTeamScores } from "@/src/server/repositories/server-overview-repository";

export const revalidate = 30;

type ServerHomePageProps = {
  params: Promise<{ sid: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const SCOREBOARD_SORT_LABELS: Record<CurrentPlayerSort, string> = {
  soldierName: "Player",
  score: "Score",
  kills: "Kills",
  deaths: "Deaths",
  squad: "Squad"
};

const SQUAD_DEATHMATCH_TEAM_NAMES: Record<number, string> = {
  1: "Alpha",
  2: "Bravo",
  3: "Charlie",
  4: "Delta"
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

function nextCurrentPlayerOrder(
  currentSort: CurrentPlayerSort,
  sort: CurrentPlayerSort,
  order: CurrentPlayerOrder
): CurrentPlayerOrder {
  if (currentSort !== sort) {
    return sort === "soldierName" || sort === "squad" ? "asc" : "desc";
  }

  return order === "asc" ? "desc" : "asc";
}

function buildScoreboardHref(
  serverId: number,
  leadersView: "overall" | "weekly",
  sort: CurrentPlayerSort,
  order: CurrentPlayerOrder
): string {
  const params = new URLSearchParams();
  if (leadersView === "weekly") {
    params.set("leaders", "weekly");
  }
  params.set("scoreboardSort", sort);
  params.set("scoreboardOrder", order);

  return `/servers/${serverId}?${params.toString()}`;
}

function liveTeamName(teamId: number, gameMode: string | null): string {
  if (teamId === 0) {
    return "Joining ...";
  }

  if (gameMode === "SquadDeathMatch0") {
    return SQUAD_DEATHMATCH_TEAM_NAMES[teamId] ?? `Team ${teamId}`;
  }

  return `Team ${teamId}`;
}

function groupPlayersByTeam(players: CurrentPlayer[]): Array<{
  teamId: number;
  players: CurrentPlayer[];
}> {
  const grouped = players.reduce<Record<number, CurrentPlayer[]>>((acc, player) => {
    if (!acc[player.teamId]) {
      acc[player.teamId] = [];
    }

    acc[player.teamId].push(player);
    return acc;
  }, {});

  return Object.entries(grouped)
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([teamId, teamPlayers]) => ({
      teamId: Number(teamId),
      players: teamPlayers
    }));
}

export default async function ServerHomePage({
  params,
  searchParams
}: ServerHomePageProps) {
  const { sid } = await params;
  const serverId = parseServerId(sid);
  if (!serverId) {
    notFound();
  }
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const leadersView = firstValue(resolvedSearchParams.leaders) === "weekly" ? "weekly" : "overall";
  const scoreboardSort = parseCurrentPlayerSort(
    firstValue(resolvedSearchParams.scoreboardSort)
  );
  const scoreboardOrder = parseCurrentPlayerOrder(
    firstValue(resolvedSearchParams.scoreboardOrder)
  );

  const context = await getLegacyServerContext();
  const server = context.servers.find((entry) => entry.serverId === serverId);
  if (!server) {
    notFound();
  }

  const [overviewStats, teamScores, topPlayers, weeklyTopPlayers, currentPlayers] =
    await Promise.all([
      getServerOverviewStats(server.serverId),
      listTeamScores(server.serverId),
      getServerLeaderboard({
        serverId: server.serverId,
        gameId: server.gameId,
        sort: "score",
        order: "desc",
        page: 1,
        pageSize: 20,
        search: null
      }),
      getWeeklyServerLeaderboard({
        serverId: server.serverId,
        gameId: server.gameId,
        limit: 20
      }),
      listCurrentPlayersByServer({
        serverId: server.serverId,
        gameId: server.gameId,
        sort: scoreboardSort,
        order: scoreboardOrder
      })
    ]);

  const liveTeams = groupPlayersByTeam(currentPlayers);

  const teamScoresById = new Map(
    teamScores.map((team) => [team.teamId, team])
  );
  const selectedTopPlayers = leadersView === "weekly" ? weeklyTopPlayers.players : topPlayers.players;
  const fullLeadersHref =
    leadersView === "weekly"
      ? `/servers/${server.serverId}/leaders?view=weekly&scope=server`
      : `/servers/${server.serverId}/leaders?scope=server`;

  return (
    <StatsShell
      title={server.serverName}
      subtitle="Live server snapshot with current players, team tickets, and top performers."
      servers={context.servers}
      currentServerId={server.serverId}
      activeSection="home"
    >
      <RouteAutoRefresh intervalMs={30000} />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="stats-panel min-w-0 overflow-hidden rounded-sm">
          <div className="relative aspect-[16/9] min-h-24 bg-slate-900">
            <Image
              src={mapImagePath(server.mapName)}
              alt={formatMapName(server.mapName)}
              width={320}
              height={180}
              className="h-full w-full object-cover"
              priority
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/95 to-transparent px-4 pb-3 pt-10">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Map</p>
              <p className="mt-1 text-base font-semibold text-slate-100">
                {formatMapName(server.mapName)}
              </p>
            </div>
          </div>
          <p className="px-4 py-3 text-xs text-slate-400">{formatGamemodeName(server.gameMode)}</p>
        </article>

        <article className={ui.panel}>
          <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Slots</p>
          <p className="mt-2 text-base font-semibold text-slate-100">
            {server.usedSlots} / {server.maxSlots}
          </p>
          <p className="mt-1 text-xs text-slate-400">Live occupancy, 30s refresh</p>
        </article>

        <article className={ui.panel}>
          <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Total Players</p>
          <p className="mt-2 text-base font-semibold text-slate-100">
            {overviewStats ? overviewStats.countPlayers : "N/A"}
          </p>
          <p className="mt-1 text-xs text-slate-400">Historical entries for this server</p>
        </article>

        <article className={ui.panel}>
          <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Avg KDR / HSR</p>
          <p className="mt-2 text-base font-semibold text-slate-100">
            {overviewStats ? overviewStats.avgKdr.toFixed(2) : "N/A"} /{" "}
            {overviewStats ? `${overviewStats.avgHsr.toFixed(2)}%` : "N/A"}
          </p>
          <p className="mt-1 text-xs text-slate-400">Based on tracked rounds</p>
        </article>
      </section>

      <section className="mt-6 grid gap-6">
        <article className={ui.panel}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className={ui.sectionTitle}>
                Live Scoreboard
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                {currentPlayers.length} players across {liveTeams.length} active teams
              </p>
            </div>
            <span className="rounded-sm border border-slate-600/50 bg-slate-950/80 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
              Auto refresh 30s
            </span>
          </div>
          {currentPlayers.length === 0 ? (
            <p className="text-sm text-slate-300">No players currently online.</p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {liveTeams.map(({ teamId, players }) => {
                const teamScore = teamScoresById.get(teamId);
                const tickets =
                  teamId === 0
                    ? "Joining"
                    : teamScore
                      ? teamScore.winningScore > 0
                        ? `Tickets ${teamScore.score} / ${teamScore.winningScore}`
                        : `Tickets remaining ${teamScore.score}`
                      : "Tickets N/A";

                return (
                  <section
                    key={teamId}
                    className={`min-w-0 ${teamId === 0 ? "lg:col-span-2" : ""}`}
                  >
                    <h3 className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                      <span>{liveTeamName(teamId, server.gameMode)}</span>
                      <span className="shrink-0 text-slate-200">
                        {tickets}
                      </span>
                    </h3>
                    <div className={ui.tableShell}>
                      <table className={ui.table}>
                        <thead className={ui.tableHead}>
                          <tr>
                            <th className={ui.th}>#</th>
                            {(Object.keys(SCOREBOARD_SORT_LABELS) as CurrentPlayerSort[]).map(
                              (sortKey) => {
                                const href = buildScoreboardHref(
                                  server.serverId,
                                  leadersView,
                                  sortKey,
                                  nextCurrentPlayerOrder(
                                    scoreboardSort,
                                    sortKey,
                                    scoreboardOrder
                                  )
                                );
                                const isActive = scoreboardSort === sortKey;

                                return (
                                  <th key={sortKey} className={ui.th}>
                                    <a
                                      href={href}
                                      className={sortableHeadingClass(isActive)}
                                    >
                                      {SCOREBOARD_SORT_LABELS[sortKey]}
                                      {isActive
                                        ? scoreboardOrder === "asc"
                                          ? "↑"
                                          : "↓"
                                        : null}
                                    </a>
                                  </th>
                                );
                              }
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {players.length === 0 ? (
                            <tr className={ui.tableRow}>
                              <td className={ui.emptyCell} colSpan={6}>
                                No players in this team.
                              </td>
                            </tr>
                          ) : (
                            players.map((player, index) => (
                              <tr
                                key={`${teamId}-${player.soldierName}`}
                                className={ui.tableRow}
                              >
                                <td className={ui.td}>{index + 1}</td>
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
                                <td className={ui.td}>{player.score}</td>
                                <td className={ui.td}>{player.kills}</td>
                                <td className={ui.td}>{player.deaths}</td>
                                <td className={ui.td}>{player.squadId}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </article>

        <article className={ui.panel}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <SegmentedNav
              label="Leaderboard view"
              items={[
                {
                  href: `/servers/${server.serverId}`,
                  label: "Top Players",
                  selected: leadersView === "overall"
                },
                {
                  href: `/servers/${server.serverId}?leaders=weekly`,
                  label: "Top 20 This Week",
                  selected: leadersView === "weekly"
                }
              ]}
            />
            <a
              href={fullLeadersHref}
              className={ui.buttonLink}
            >
              Full Leaders Page
            </a>
          </div>
          <div className={ui.tableShell}>
            <table className={ui.table}>
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
              <tbody>
                {leadersView === "weekly" && !weeklyTopPlayers.available ? (
                  <tr className={ui.tableRow}>
                    <td className={ui.emptyCell} colSpan={6}>
                      Weekly ranking is unavailable because session history is not present.
                    </td>
                  </tr>
                ) : selectedTopPlayers.length === 0 ? (
                  <tr className={ui.tableRow}>
                    <td className={ui.emptyCell} colSpan={6}>
                      {leadersView === "weekly"
                        ? "No session stats found this week."
                        : "No player stats found."}
                    </td>
                  </tr>
                ) : (
                  selectedTopPlayers.map((player, index) => (
                    <tr
                      key={player.playerId}
                      className={ui.tableRow}
                    >
                      <td className={ui.td}>{index + 1}</td>
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
                      <td className={ui.td}>{player.score}</td>
                      <td className={ui.td}>{player.kills}</td>
                      <td className={ui.td}>{player.kdr.toFixed(2)}</td>
                      <td className={ui.td}>{player.hsr.toFixed(2)}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </StatsShell>
  );
}
