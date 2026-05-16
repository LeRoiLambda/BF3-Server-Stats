import Image from "next/image";
import { clsx } from "clsx";
import { ui } from "@/components/layout/stats-ui";
import {
  playerDisciplineBadgeClass,
  playerDisciplineLabel,
  type PlayerDisciplineKind
} from "@/components/stats/player-discipline-badge";
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

export function PlayerProfileHeader({
  profile,
  moderation,
  battlelogHref
}: PlayerProfileHeaderProps) {
  const status = resolveHeaderStatus(profile, moderation);
  const showBanDetails =
    (status.kind === "activeBan" || status.kind === "expiredBan") &&
    (status.detail || status.startedAt || status.endsAt);

  return (
    <section className={panelClass(status.kind)}>
      <div className={headerTintClass(status.kind)}>
        <div className="grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-center">
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
              Player
            </p>
            <h2 className="mt-1 break-words text-2xl font-semibold text-slate-50 sm:text-3xl">
              {profile.soldierName}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-sm border border-slate-600/45 bg-slate-950/55 px-2.5 py-1 text-xs text-slate-200">
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
              <span className="rounded-sm border border-slate-600/45 bg-slate-950/55 px-2.5 py-1 text-xs text-slate-200">
                BF3 rank {profile.globalRank ?? "Unknown"}
              </span>
              <span
                className={playerDisciplineBadgeClass(
                  status.kind,
                  "full"
                )}
              >
                {badgeLabel(status)}
              </span>
              {moderation.available && moderation.muteStatus.active ? (
                <span className="inline-flex w-fit items-center rounded-sm border border-sky-300/40 bg-sky-950/45 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-sky-100">
                  Chat muted
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex items-start md:justify-end">
            <a
              href={battlelogHref}
              target="_blank"
              rel="noreferrer"
              className={`${ui.buttonGhost} inline-flex h-9 items-center justify-center text-nowrap`}
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
