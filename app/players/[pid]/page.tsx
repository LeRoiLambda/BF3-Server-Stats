import { notFound } from "next/navigation";
import { StatsShell } from "@/components/layout/stats-shell";
import { ui } from "@/components/layout/stats-ui";
import {
  PlayerProfileSections,
  type DogtagView,
  type PlayerWeaponStat
} from "@/components/stats/player-profile-sections";
import { PlayerModerationSection } from "@/components/stats/player-moderation-section";
import { PlayerProfileHeader } from "@/components/stats/player-profile-header";
import {
  toWeeklyLeaderboardPodiumRank,
  type WeeklyLeaderboardPodiumRank
} from "@/components/stats/weekly-leaderboard-rank";
import {
  formatWeaponCategory,
  formatWeaponName,
  normalizeWeaponCategory,
  weaponImagePath
} from "@/src/server/domain/bf3-reference";
import {
  listPlayerDogtagCollections,
  getPlayerProfileById,
  getPlayerRankPositions,
  listPlayerWeapons,
  listPlayerDogtagLosses,
  type PlayerWeapon
} from "@/src/server/repositories/player-profile-repository";
import {
  getAllServersWeeklyLeaderboard,
  getWeeklyServerLeaderboard,
  type LeaderboardPlayer
} from "@/src/server/repositories/player-stats-repository";
import { getPlayerModerationSummary } from "@/src/server/repositories/moderation-repository";
import { getLegacyServerContext } from "@/src/server/repositories/server-repository";
import { firstValue, parsePositiveInt } from "@/src/server/routing/params";

type PlayerPageProps = {
  params: Promise<{ pid: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function parsePlayerId(rawPid: string): number | null {
  const parsed = Number.parseInt(rawPid, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function parseDogtagView(value: string | null): DogtagView {
  return value === "surrendered" ? "surrendered" : "collected";
}

function formatRankPosition(rank: number | null, totalPlayers: number): string {
  if (rank === null || totalPlayers <= 0) {
    return "N/A";
  }

  return `#${rank} of ${totalPlayers}`;
}

function battlelogPlayerHref(soldierName: string): string {
  return `https://battlelog.battlefield.com/bf3/user/${encodeURIComponent(soldierName)}/`;
}

type WeeklyPodiumProfile = {
  rank: WeeklyLeaderboardPodiumRank;
  player: LeaderboardPlayer;
};

function findWeeklyPodiumProfile(
  players: LeaderboardPlayer[],
  playerId: number
): WeeklyPodiumProfile | null {
  const index = players.findIndex((player) => player.playerId === playerId);
  if (index === -1) {
    return null;
  }

  const rank = toWeeklyLeaderboardPodiumRank(index + 1);
  if (rank === null) {
    return null;
  }

  return {
    rank,
    player: players[index]
  };
}

type WeaponCategoryGroup = {
  categoryKey: string;
  categoryName: string;
  kills: number;
};

function groupWeaponsByCategory(weapons: PlayerWeapon[]): WeaponCategoryGroup[] {
  const groups = new Map<string, WeaponCategoryGroup>();

  for (const weapon of weapons) {
    const categoryKey = normalizeWeaponCategory(weapon.damageType);
    const existing = groups.get(categoryKey);
    const group =
      existing ??
      {
        categoryKey,
        categoryName: formatWeaponCategory(weapon.damageType),
        kills: 0
      };

    group.kills += weapon.kills;
    groups.set(categoryKey, group);
  }

  return Array.from(groups.values()).sort(
    (a, b) => b.kills - a.kills || a.categoryName.localeCompare(b.categoryName)
  );
}

export default async function PlayerPage({ params, searchParams }: PlayerPageProps) {
  const { pid } = await params;
  const playerId = parsePlayerId(pid);
  if (!playerId) {
    notFound();
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const requestedServerId = firstValue(resolvedSearchParams.sid);
  const serverId = requestedServerId ? parsePositiveInt(requestedServerId) : null;
  const requestedWeaponCategory = firstValue(resolvedSearchParams.weaponCategory);
  const tagView = parseDogtagView(firstValue(resolvedSearchParams.tagView));

  const context = await getLegacyServerContext();
  const gameId = context.gameId;
  if (!gameId) {
    notFound();
  }

  const serverScope =
    serverId !== null
      ? context.servers.find((server) => server.serverId === serverId) ?? null
      : null;

  const [
    profile,
    rankPositions,
    weaponStats,
    dogtagLosses,
    dogtagCollections,
    moderation,
    weeklyTopPlayers
  ] =
    await Promise.all([
      getPlayerProfileById({
        playerId,
        gameId,
        serverId: serverScope?.serverId ?? null
      }),
      getPlayerRankPositions({
        playerId,
        gameId,
        serverId: serverScope?.serverId ?? null
      }),
      listPlayerWeapons({
        playerId,
        gameId,
        serverId: serverScope?.serverId ?? null
      }),
      listPlayerDogtagLosses({
        playerId,
        gameId,
        serverId: serverScope?.serverId ?? null,
        limit: 20
      }),
      listPlayerDogtagCollections({
        playerId,
        gameId,
        serverId: serverScope?.serverId ?? null,
        limit: 20
      }),
      getPlayerModerationSummary({
        playerId,
        serverId: serverScope?.serverId ?? null,
        recentLimit: 5
      }),
      serverScope === null
        ? getAllServersWeeklyLeaderboard({
            serverIds: context.servers.map((server) => server.serverId),
            gameId,
            limit: 3
          })
        : getWeeklyServerLeaderboard({
            serverId: serverScope.serverId,
            gameId,
            limit: 3
          })
    ]);

  if (!profile) {
    notFound();
  }

  const weaponGroups = groupWeaponsByCategory(weaponStats);
  const requestedCategoryKey =
    requestedWeaponCategory === null ? null : normalizeWeaponCategory(requestedWeaponCategory);
  const selectedWeaponCategory = weaponGroups.some(
    (group) => group.categoryKey === requestedCategoryKey
  )
    ? requestedCategoryKey
    : weaponGroups[0]?.categoryKey ?? null;
  const weaponRows: PlayerWeaponStat[] = weaponStats.map((weapon) => {
    const categoryKey = normalizeWeaponCategory(weapon.damageType);
    const weaponName = formatWeaponName(weapon.weaponCode, weapon.weaponFullName);

    return {
      weaponCode: weapon.weaponCode,
      weaponName,
      weaponImageSrc: weaponImagePath(weapon.weaponCode),
      categoryKey,
      categoryName: formatWeaponCategory(weapon.damageType),
      kills: weapon.kills,
      deaths: weapon.deaths,
      headshots: weapon.headshots,
      hsr: weapon.hsr
    };
  });
  const playerScopeHref =
    serverScope === null ? `/players/${playerId}` : `/players/${playerId}?sid=${serverScope.serverId}`;
  const playerScopeOptions =
    context.servers.length > 1
      ? [
          ...context.servers.map((server) => ({
            label: server.serverName,
            href: `/players/${playerId}?sid=${server.serverId}`
          })),
          {
            label: "All Servers",
            href: `/players/${playerId}`
          }
        ]
      : undefined;
  const battlelogHref = battlelogPlayerHref(profile.soldierName);
  const weeklyPodium = weeklyTopPlayers.available
    ? findWeeklyPodiumProfile(weeklyTopPlayers.players, playerId)
    : null;

  return (
    <StatsShell
      title="Player Profile"
      servers={context.servers}
      currentServerId={serverScope?.serverId ?? null}
      activeSection="home"
      scopeOptions={playerScopeOptions}
      scopeValue={playerScopeHref}
    >
      <PlayerProfileHeader
        profile={profile}
        moderation={moderation}
        battlelogHref={battlelogHref}
        weeklyPodium={weeklyPodium}
      />

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className={ui.card}>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Score</p>
          <p className="mt-2 text-lg font-semibold text-slate-100">{profile.score}</p>
          <p className="mt-1 text-xs text-slate-400">
            Rank {formatRankPosition(rankPositions.scoreRank, rankPositions.totalPlayers)}
          </p>
        </article>
        <article className={ui.card}>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Kills / Deaths</p>
          <p className="mt-2 text-lg font-semibold text-slate-100">
            {profile.kills} / {profile.deaths}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            KDR {profile.kdr.toFixed(2)} - rank{" "}
            {formatRankPosition(rankPositions.kdrRank, rankPositions.totalPlayers)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Kills rank {formatRankPosition(rankPositions.killsRank, rankPositions.totalPlayers)}
          </p>
        </article>
        <article className={ui.card}>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">HSR / Headshots</p>
          <p className="mt-2 text-lg font-semibold text-slate-100">
            {profile.hsr.toFixed(2)}%
          </p>
          <p className="mt-1 text-xs text-slate-400">{profile.headshots} headshots</p>
        </article>
        <article className={ui.card}>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Wins / Losses</p>
          <p className="mt-2 text-lg font-semibold text-slate-100">
            {profile.wins} / {profile.losses}
          </p>
          <p className="mt-1 text-xs text-slate-400">WLR {profile.wlr.toFixed(2)}</p>
        </article>
      </section>

      <section className={`mt-6 ${ui.panel}`}>
        <h2 className={ui.sectionTitle}>
          Activity Overview
        </h2>
        <div className="mt-3 grid gap-3 text-sm text-slate-300 sm:grid-cols-2 lg:grid-cols-3">
          <p>
            <span className="text-slate-400">Rounds:</span> {profile.rounds}
          </p>
          <p>
            <span className="text-slate-400">Best Killstreak:</span>{" "}
            {profile.killstreak}
          </p>
          <p>
            <span className="text-slate-400">Worst Deathstreak:</span>{" "}
            {profile.deathstreak}
          </p>
          <p>
            <span className="text-slate-400">High Score:</span> {profile.highScore}
          </p>
          <p>
            <span className="text-slate-400">Team Kills:</span> {profile.teamKills}
          </p>
          <p>
            <span className="text-slate-400">Suicides:</span> {profile.suicides}
          </p>
          <p>
            <span className="text-slate-400">First Seen:</span>{" "}
            {profile.firstSeenOnServer ?? "Unknown"}
          </p>
          <p>
            <span className="text-slate-400">Last Seen:</span>{" "}
            {profile.lastSeenOnServer ?? "Unknown"}
          </p>
        </div>
      </section>

      <PlayerModerationSection summary={moderation} />

      <PlayerProfileSections
        weaponCategories={weaponGroups}
        weapons={weaponRows}
        initialWeaponCategory={selectedWeaponCategory}
        initialDogtagView={tagView}
        dogtagLosses={dogtagLosses}
        dogtagCollections={dogtagCollections}
        serverId={serverScope?.serverId ?? null}
      />
    </StatsShell>
  );
}
