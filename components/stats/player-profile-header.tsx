import Image from "next/image";
import { clsx } from "clsx";
import { ui } from "@/components/layout/stats-ui";
import {
  playerDisciplineBadgeClass,
  playerDisciplineLabel,
  type PlayerDisciplineKind
} from "@/components/stats/player-discipline-badge";
import {
  WeeklyLeaderboardMedal,
  weeklyLeaderboardPodiumLabel,
  type WeeklyLeaderboardPodiumRank
} from "@/components/stats/weekly-leaderboard-rank";
import {
  countryFlagImagePath,
  formatCountryName,
  rankImagePath
} from "@/src/server/domain/bf3-reference";
import type { PlayerProfile } from "@/src/server/repositories/player-profile-repository";
import type {
  ModerationStatus,
  PlayerModerationSummary
} from "@/src/server/repositories/moderation-repository";

type PlayerProfileHeaderProps = {
  profile: PlayerProfile;
  moderation: PlayerModerationSummary;
  battlelogHref: string;
  weeklyPodium?: PlayerProfileWeeklyPodium | null;
};

type PlayerProfileWeeklyPodium = {
  rank: WeeklyLeaderboardPodiumRank;
  player: {
    score: number;
    kills: number;
    kdr: number;
    hsr: number;
  };
};

type HeaderStatusKind = PlayerDisciplineKind;

type HeaderStatus = Omit<ModerationStatus, "kind"> & {
  kind: HeaderStatusKind;
};

const UNAVAILABLE_STATUS: HeaderStatus = {
  kind: "unavailable",
  label: "Moderation unavailable",
  detail: null,
  startedAt: null,
  endsAt: null,
  banDuration: null
};

function fallbackStatusFromProfile(profile: PlayerProfile): HeaderStatus {
  if (profile.banStatus === "active") {
    return {
      kind: "activeBan",
      label: playerDisciplineLabel("activeBan"),
      detail: profile.banReason,
      startedAt: null,
      endsAt: null,
      banDuration: null
    };
  }

  if (profile.banStatus === "expired") {
    return {
      kind: "expiredBan",
      label: playerDisciplineLabel("expiredBan"),
      detail: profile.banReason,
      startedAt: null,
      endsAt: null,
      banDuration: null
    };
  }

  return UNAVAILABLE_STATUS;
}

function resolveHeaderStatus(
  profile: PlayerProfile,
  moderation: PlayerModerationSummary
): HeaderStatus {
  if (moderation.available) {
    return moderation.currentStatus;
  }

  return fallbackStatusFromProfile(profile);
}

function panelClass(kind: HeaderStatusKind): string {
  return clsx(
    "stats-panel min-w-0 overflow-hidden rounded-sm",
    kind === "activeBan"
      ? "border-rose-300/45"
      : kind === "expiredBan"
        ? "border-amber-300/35"
        : undefined
  );
}

function headerTintClass(kind: HeaderStatusKind): string {
  return clsx(
    "border-b px-4 py-4 sm:px-5",
    kind === "activeBan"
      ? "border-rose-400/25 bg-rose-950/30"
      : kind === "expiredBan"
        ? "border-amber-400/20 bg-amber-950/20"
        : "border-slate-700/55 bg-slate-950/40"
  );
}

function detailsLabel(status: HeaderStatus): string {
  if (status.kind === "expiredBan") {
    return "Ban Ended";
  }

  return status.banDuration === "permanent" ? "Ban Duration" : "Ban Ends";
}

function detailsValue(status: HeaderStatus): string {
  if (status.kind === "activeBan" && status.banDuration === "permanent") {
    return "Permanent";
  }

  return status.endsAt ?? "Unknown";
}

function badgeLabel(status: HeaderStatus): string {
  if (status.kind === "activeBan" || status.kind === "expiredBan") {
    return status.label;
  }

  return playerDisciplineLabel(status.kind, "full");
}

const profileChipClass =
  "inline-flex min-h-7 items-center rounded-sm border border-slate-600/45 bg-slate-950/55 px-2.5 py-1 text-xs text-slate-200";

function podiumHeroClass(rank: WeeklyLeaderboardPodiumRank): string {
  return clsx(
    "relative overflow-hidden px-4 py-6 sm:px-6 sm:py-7",
    rank === 1
      ? "bg-[radial-gradient(circle_at_74%_22%,rgba(251,191,36,0.24),transparent_30%),linear-gradient(135deg,rgba(120,78,0,0.58),rgba(15,23,42,0.92)_50%,rgba(2,6,23,0.96))]"
      : rank === 2
        ? "bg-[radial-gradient(circle_at_74%_22%,rgba(226,232,240,0.20),transparent_30%),linear-gradient(135deg,rgba(71,85,105,0.58),rgba(15,23,42,0.92)_50%,rgba(2,6,23,0.96))]"
        : "bg-[radial-gradient(circle_at_74%_22%,rgba(251,146,60,0.20),transparent_30%),linear-gradient(135deg,rgba(124,45,18,0.54),rgba(15,23,42,0.92)_50%,rgba(2,6,23,0.96))]"
  );
}

function podiumPanelClass(rank: WeeklyLeaderboardPodiumRank): string {
  return clsx(
    "stats-panel min-w-0 overflow-hidden rounded-sm",
    rank === 1
      ? "border-amber-300/50"
      : rank === 2
        ? "border-slate-200/40"
        : "border-orange-300/40"
  );
}

function podiumAccentTextClass(rank: WeeklyLeaderboardPodiumRank): string {
  if (rank === 1) {
    return "text-amber-100";
  }

  if (rank === 2) {
    return "text-slate-100";
  }

  return "text-orange-100";
}

function podiumMetricClass(rank: WeeklyLeaderboardPodiumRank): string {
  if (rank === 1) {
    return "text-amber-50";
  }

  if (rank === 2) {
    return "text-slate-50";
  }

  return "text-orange-50";
}

function podiumBorderClass(rank: WeeklyLeaderboardPodiumRank): string {
  if (rank === 1) {
    return "border-amber-300/25 bg-amber-950/15";
  }

  if (rank === 2) {
    return "border-slate-300/25 bg-slate-900/20";
  }

  return "border-orange-300/25 bg-orange-950/15";
}

export function PlayerProfileHeader({
  profile,
  moderation,
  battlelogHref,
  weeklyPodium = null
}: PlayerProfileHeaderProps) {
  const status = resolveHeaderStatus(profile, moderation);
  const showBanDetails =
    (status.kind === "activeBan" || status.kind === "expiredBan") &&
    (status.detail || status.startedAt || status.endsAt);

  if (weeklyPodium !== null) {
    const podiumLabel = weeklyLeaderboardPodiumLabel(weeklyPodium.rank);

    return (
      <section className={podiumPanelClass(weeklyPodium.rank)}>
        <div className={podiumHeroClass(weeklyPodium.rank)}>
          <div
            className={clsx(
              "pointer-events-none absolute -right-4 bottom-0 text-[9rem] font-black leading-none sm:text-[13rem]",
              weeklyPodium.rank === 1
                ? "text-amber-200/10"
                : weeklyPodium.rank === 2
                  ? "text-slate-100/10"
                  : "text-orange-200/10"
            )}
            aria-hidden="true"
          >
            #{weeklyPodium.rank}
          </div>
          <WeeklyLeaderboardMedal
            rank={weeklyPodium.rank}
            className="pointer-events-none absolute right-5 top-5 h-28 w-24 opacity-20 sm:h-40 sm:w-32"
          />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div
                className={clsx(
                  "inline-flex items-center gap-3 rounded-sm border px-3 py-2",
                  podiumBorderClass(weeklyPodium.rank)
                )}
              >
                <WeeklyLeaderboardMedal rank={weeklyPodium.rank} className="h-11 w-10" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Weekly #{weeklyPodium.rank}
                  </p>
                  <p
                    className={clsx(
                      "mt-0.5 text-sm font-bold uppercase tracking-[0.16em]",
                      podiumAccentTextClass(weeklyPodium.rank)
                    )}
                  >
                    {podiumLabel} podium
                  </p>
                </div>
              </div>

              <h2 className="mt-5 break-words text-4xl font-semibold leading-tight text-slate-50 sm:text-6xl">
                {profile.soldierName}
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Current weekly top 3 player for the selected scope.
              </p>
            </div>

            <a
              href={battlelogHref}
              target="_blank"
              rel="noreferrer"
              className={`${ui.buttonGhost} relative text-nowrap`}
            >
              Battlelog
            </a>
          </div>

          <div className="relative mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className={clsx("rounded-sm border p-3", podiumBorderClass(weeklyPodium.rank))}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Weekly Score
              </p>
              <p className={clsx("mt-2 text-2xl font-bold", podiumMetricClass(weeklyPodium.rank))}>
                {weeklyPodium.player.score}
              </p>
            </div>
            <div className={clsx("rounded-sm border p-3", podiumBorderClass(weeklyPodium.rank))}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Weekly Kills
              </p>
              <p className={clsx("mt-2 text-2xl font-bold", podiumMetricClass(weeklyPodium.rank))}>
                {weeklyPodium.player.kills}
              </p>
            </div>
            <div className={clsx("rounded-sm border p-3", podiumBorderClass(weeklyPodium.rank))}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Weekly KDR
              </p>
              <p className={clsx("mt-2 text-2xl font-bold", podiumMetricClass(weeklyPodium.rank))}>
                {weeklyPodium.player.kdr.toFixed(2)}
              </p>
            </div>
            <div className={clsx("rounded-sm border p-3", podiumBorderClass(weeklyPodium.rank))}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Weekly HSR
              </p>
              <p className={clsx("mt-2 text-2xl font-bold", podiumMetricClass(weeklyPodium.rank))}>
                {weeklyPodium.player.hsr.toFixed(2)}%
              </p>
            </div>
          </div>

          <div className="relative mt-5 flex flex-wrap items-center gap-2 border-t border-slate-700/50 pt-4">
            <span className={`${profileChipClass} gap-2`}>
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
            <span className={profileChipClass}>
              BF3 rank {profile.globalRank ?? "Unknown"}
            </span>
            <span
              className={playerDisciplineBadgeClass(
                status.kind,
                "full",
                "min-h-7"
              )}
            >
              {badgeLabel(status)}
            </span>
            {moderation.available && moderation.muteStatus.active ? (
              <span className="inline-flex min-h-7 w-fit items-center rounded-sm border border-sky-300/40 bg-sky-950/45 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-sky-100">
                Chat muted
              </span>
            ) : null}
          </div>
        </div>

        {showBanDetails ? (
          <div className="grid gap-3 border-t border-slate-700/50 bg-slate-950/45 p-3 text-sm text-slate-300 md:grid-cols-3">
            <div className="min-w-0 md:col-span-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Ban Reason
              </p>
              <p className="mt-1 break-words text-slate-200">
                {status.detail ?? "No reason recorded"}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Ban Started
              </p>
              <p className="mt-1 text-slate-200">{status.startedAt ?? "Unknown"}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                {detailsLabel(status)}
              </p>
              <p className="mt-1 text-slate-200">{detailsValue(status)}</p>
            </div>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className={panelClass(status.kind)}>
      <div className={headerTintClass(status.kind)}>
        <div className="grid grid-cols-[auto_1fr] gap-4 md:grid-cols-[auto_1fr_auto] md:items-start">
          <div className="col-start-1 row-start-1 flex h-24 w-24 shrink-0 items-center justify-center rounded-sm border border-slate-600/45 bg-slate-950/70">
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

          <div className="col-span-2 min-w-0 md:col-span-1 md:col-start-2 md:row-start-1">
            <p className="text-xs uppercase tracking-[0.15em] text-slate-400">
              Player
            </p>
            <h2 className="mt-1 break-words text-2xl font-semibold text-slate-50 sm:text-3xl">
              {profile.soldierName}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`${profileChipClass} gap-2`}>
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
              <span className={profileChipClass}>
                BF3 rank {profile.globalRank ?? "Unknown"}
              </span>
              <span
                className={playerDisciplineBadgeClass(
                  status.kind,
                  "full",
                  "min-h-7"
                )}
              >
                {badgeLabel(status)}
              </span>
              {moderation.available && moderation.muteStatus.active ? (
                <span className="inline-flex min-h-7 w-fit items-center rounded-sm border border-sky-300/40 bg-sky-950/45 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-sky-100">
                  Chat muted
                </span>
              ) : null}
            </div>
          </div>

          <div className="col-start-2 row-start-1 flex items-start justify-end md:col-start-3">
            <a
              href={battlelogHref}
              target="_blank"
              rel="noreferrer"
              className={`${ui.buttonGhost} text-nowrap`}
            >
              Battlelog
            </a>
          </div>
        </div>

        {showBanDetails ? (
          <div className="mt-4 grid gap-3 rounded-sm border border-slate-700/50 bg-slate-950/45 p-3 text-sm text-slate-300 md:grid-cols-3">
            <div className="min-w-0 md:col-span-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Ban Reason
              </p>
              <p className="mt-1 break-words text-slate-200">
                {status.detail ?? "No reason recorded"}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Ban Started
              </p>
              <p className="mt-1 text-slate-200">{status.startedAt ?? "Unknown"}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                {detailsLabel(status)}
              </p>
              <p className="mt-1 text-slate-200">{detailsValue(status)}</p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
