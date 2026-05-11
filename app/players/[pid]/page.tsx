import Image from "next/image";
import { notFound } from "next/navigation";
import { StatsShell } from "@/components/layout/stats-shell";
import { ui } from "@/components/layout/stats-ui";
import {
  PlayerProfileSections,
  type DogtagView,
  type PlayerWeaponStat
} from "@/components/stats/player-profile-sections";
import { PlayerModerationSection } from "@/components/stats/player-moderation-section";
import {
  countryFlagImagePath,
  formatCountryName,
  formatWeaponCategory,
  formatWeaponName,
  normalizeWeaponCategory,
  rankImagePath,
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

  const [profile, rankPositions, weaponStats, dogtagLosses, dogtagCollections, moderation] =
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
        recentLimit: 8
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

  return (
    <StatsShell
      title={`Player: ${profile.soldierName}`}
      subtitle={
        serverScope
          ? `Stats for this player on ${serverScope.serverName}.`
          : "Overall player profile across tracked servers."
      }
      servers={context.servers}
      currentServerId={serverScope?.serverId ?? null}
      activeSection="home"
      scopeOptions={playerScopeOptions}
      scopeValue={playerScopeHref}
      titleAction={
        <a
          href={battlelogHref}
          target="_blank"
          rel="noreferrer"
          className={`${ui.buttonGhost} inline-flex h-9 items-center justify-center text-nowrap`}
        >
          Battlelog
        </a>
      }
    >
      <section className={`${ui.panel} grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center`}>
        <div className="flex items-center gap-4">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-sm border border-slate-600/45 bg-slate-950/70">
            <Image
              src={rankImagePath(profile.globalRank)}
              alt={
                profile.globalRank === null
                  ? "Unknown BF3 rank"
                  : `BF3 rank ${profile.globalRank}`
              }
              width={88}
              height={88}
              className="h-20 w-20 object-contain"
              priority
            />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.15em] text-slate-400">
              BF3 Rank
            </p>
            <p className="mt-1 text-xl font-semibold text-slate-100">
              {profile.globalRank ?? "Unknown"}
            </p>
          </div>
        </div>

        <div className="grid overflow-hidden rounded-sm border border-slate-700/60 bg-slate-950/45 text-sm sm:grid-cols-3">
          <div className="border-b border-slate-700/60 p-3 sm:border-b-0 sm:border-r">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Score Rank</p>
            <p className="mt-2 font-semibold text-slate-100">
              {formatRankPosition(rankPositions.scoreRank, rankPositions.totalPlayers)}
            </p>
          </div>
          <div className="border-b border-slate-700/60 p-3 sm:border-b-0 sm:border-r">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Kills Rank</p>
            <p className="mt-2 font-semibold text-slate-100">
              {formatRankPosition(rankPositions.killsRank, rankPositions.totalPlayers)}
            </p>
          </div>
          <div className="p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-400">KDR Rank</p>
            <p className="mt-2 font-semibold text-slate-100">
              {formatRankPosition(rankPositions.kdrRank, rankPositions.totalPlayers)}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className={ui.card}>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Score</p>
          <p className="mt-2 text-lg font-semibold text-slate-100">{profile.score}</p>
        </article>
        <article className={ui.card}>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Kills / Deaths</p>
          <p className="mt-2 text-lg font-semibold text-slate-100">
            {profile.kills} / {profile.deaths}
          </p>
          <p className="mt-1 text-xs text-slate-400">KDR {profile.kdr.toFixed(2)}</p>
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
          Profile Overview
        </h2>
        <div className="mt-3 grid gap-3 text-sm text-slate-300 sm:grid-cols-2 lg:grid-cols-3">
          <p>
            <span className="text-slate-400">Country:</span>{" "}
            <span className="inline-flex items-center gap-2">
              <Image
                src={countryFlagImagePath(profile.countryCode)}
                alt={formatCountryName(profile.countryCode)}
                title={formatCountryName(profile.countryCode)}
                width={18}
                height={12}
                className="h-3 w-[18px] rounded-[2px] border border-slate-700/80 object-cover"
              />
              {formatCountryName(profile.countryCode)}
            </span>
          </p>
          <p>
            <span className="text-slate-400">Global Rank:</span>{" "}
            {profile.globalRank ?? "Unknown"}
          </p>
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
