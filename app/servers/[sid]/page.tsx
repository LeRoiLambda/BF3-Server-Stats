import Image from "next/image";
import { notFound } from "next/navigation";
import { SegmentedNav } from "@/components/layout/segmented-nav";
import { RouteAutoRefresh } from "@/components/stats/route-auto-refresh";
import { StatsShell } from "@/components/layout/stats-shell";
import { sortableHeadingClass, ui } from "@/components/layout/stats-ui";
import { PlayerDisciplineBadge } from "@/components/stats/player-discipline-badge";
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
import { listTeamScores } from "@/src/server/repositories/server-overview-repository";

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

  const [teamScores, topPlayers, weeklyTopPlayers, currentPlayers] =
    await Promise.all([
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
  const activeLiveTeams = liveTeams.filter(({ teamId }) => teamId !== 0);
  const occupancyPercent =
    server.maxSlots > 0
      ? Math.min(100, Math.round((server.usedSlots / server.maxSlots) * 100))
      : 0;
  const ticketLeader = activeLiveTeams
    .map(({ teamId }) => teamScoresById.get(teamId))
    .filter((score) => score !== undefined)
    .sort((left, right) => right.score - left.score)[0];
  const selectedTopPlayers = leadersView === "weekly" ? weeklyTopPlayers.players : topPlayers.players;
  const fullLeadersHref =
    leadersView === "weekly"
      ? `/servers/${server.serverId}/leaders?view=weekly&scope=server`
      : `/servers/${server.serverId}/leaders?scope=server`;
  const currentMapImagePath = mapImagePath(server.mapName);

  return (
    <StatsShell
      title={server.serverName}
      subtitle="Current round and live player list."
      servers={context.servers}
      currentServerId={server.serverId}
      activeSection="home"
    >
      <RouteAutoRefresh intervalMs={30000} />
      <section className="stats-panel min-w-0 overflow-hidden rounded-sm p-0">
        <div className="relative aspect-[992/164] min-h-[86px] bg-slate-900">
          {currentMapImagePath ? (
            <Image
              src={currentMapImagePath}
              alt={formatMapName(server.mapName)}
              fill
              sizes="(min-width: 1120px) 1120px, 100vw"
              className="object-cover opacity-90"
              priority
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/45 via-slate-950/10 to-slate-950/35" />
        </div>
        <div className="min-w-0 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <p className={ui.sectionTitle}>Current Round</p>
            <span className="rounded-sm border border-slate-600/50 bg-slate-950/75 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
              Refresh 30s
            </span>
          </div>
          <div className="mt-3 min-w-0">
            <div className="min-w-0">
              <h2 className="break-words text-2xl font-semibold text-slate-50">
                {formatMapName(server.mapName)}
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                {formatGamemodeName(server.gameMode)}
              </p>
            </div>
          </div>

          <dl className="mt-5 grid overflow-hidden rounded-sm border border-slate-700/60 sm:grid-cols-2">
            <div className="min-w-0 p-3 sm:p-4">
              <dt className="text-xs uppercase tracking-[0.12em] text-slate-400">
                Players
              </dt>
              <dd className="mt-2 text-lg font-semibold text-slate-100">
                {server.usedSlots} / {server.maxSlots}
              </dd>
              <div className="mt-2 h-1.5 rounded-sm bg-slate-800">
                <div
                  className="h-full rounded-sm bg-teal-400/80"
                  style={{ width: `${occupancyPercent}%` }}
                />
              </div>
            </div>
            <div className="min-w-0 border-t border-slate-700/60 p-3 sm:border-l sm:border-t-0 sm:p-4">
              <dt className="text-xs uppercase tracking-[0.12em] text-slate-400">
                Ticket Lead
              </dt>
              <dd className="mt-2 text-lg font-semibold text-slate-100">
                {ticketLeader
                  ? `${liveTeamName(ticketLeader.teamId, server.gameMode)} · ${ticketLeader.score} tickets`
                  : "N/A"}
              </dd>
            </div>
          </dl>
        </div>
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
                                  <PlayerDisciplineBadge
                                    status={player.banStatus}
                                    density="compact"
                                  />
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
                        <PlayerDisciplineBadge status={player.banStatus} />
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
