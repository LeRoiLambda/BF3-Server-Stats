import { notFound } from "next/navigation";
import { RouteAutoRefresh } from "@/components/stats/route-auto-refresh";
import { StatsShell } from "@/components/layout/stats-shell";
import { sortableHeadingClass, ui } from "@/components/layout/stats-ui";
import { MapRotationCarousel } from "@/components/stats/map-rotation-carousel";
import { PlayerDisciplineBadge } from "@/components/stats/player-discipline-badge";
import {
  PlayerIdentity,
  PlayerTableCellLink,
  playerTableRowClass
} from "@/components/stats/player-link";
import { WeeklyLeaderboardSection } from "@/components/stats/weekly-leaderboard-section";
import { listServerMapRotation } from "@/src/server/repositories/map-rotation-repository";
import { getLegacyServerContext } from "@/src/server/repositories/server-repository";
import {
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
  sort: CurrentPlayerSort,
  order: CurrentPlayerOrder
): string {
  const params = new URLSearchParams();
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

  const [teamScores, weeklyTopPlayers, currentPlayers, mapRotation] =
    await Promise.all([
      listTeamScores(server.serverId),
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
      }),
      listServerMapRotation({ serverId: server.serverId })
    ]);

  const liveTeams = groupPlayersByTeam(currentPlayers);

  const teamScoresById = new Map(
    teamScores.map((team) => [team.teamId, team])
  );
  const fullLeadersHref = `/servers/${server.serverId}/leaders?view=weekly`;

  return (
    <StatsShell
      title={server.serverName}
      subtitle="Current round and live player list."
      servers={context.servers}
      currentServerId={server.serverId}
      activeSection="home"
    >
      <RouteAutoRefresh intervalMs={30000} />
      <MapRotationCarousel
        rotation={mapRotation}
        currentMapCode={server.mapName}
        currentGamemode={server.gameMode}
        usedSlots={server.usedSlots}
        maxSlots={server.maxSlots}
      />

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
                                className={playerTableRowClass(ui.tableRow)}
                              >
                                <td className={ui.td}>
                                  <PlayerTableCellLink
                                    playerId={player.playerId}
                                    serverId={server.serverId}
                                  >
                                    {index + 1}
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
                                    <PlayerDisciplineBadge
                                      status={player.banStatus}
                                      density="compact"
                                    />
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
                                    {player.deaths}
                                  </PlayerTableCellLink>
                                </td>
                                <td className={ui.td}>
                                  <PlayerTableCellLink
                                    playerId={player.playerId}
                                    serverId={server.serverId}
                                  >
                                    {player.squadId}
                                  </PlayerTableCellLink>
                                </td>
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

        <WeeklyLeaderboardSection
          result={weeklyTopPlayers}
          fullLeadersHref={fullLeadersHref}
          serverId={server.serverId}
          as="article"
        />
      </section>
    </StatsShell>
  );
}
