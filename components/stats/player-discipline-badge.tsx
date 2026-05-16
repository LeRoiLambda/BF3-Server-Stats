import { clsx } from "clsx";

export type PlayerBanStatus = "active" | "expired" | null | undefined;
export type PlayerDisciplineKind =
  | "none"
  | "activeBan"
  | "expiredBan"
  | "unavailable";
export type PlayerDisciplineDensity = "full" | "badge" | "compact";

type PlayerDisciplineStatus = {
  kind: PlayerDisciplineKind;
  label: string;
  compactLabel: string;
  title: string;
};

type PlayerDisciplineBadgeProps = {
  status: PlayerBanStatus;
  density?: PlayerDisciplineDensity;
  className?: string;
};

const STATUS_BY_KIND: Record<PlayerDisciplineKind, PlayerDisciplineStatus> = {
  none: {
    kind: "none",
    label: "No active ban",
    compactLabel: "No ban",
    title: "No active ban"
  },
  activeBan: {
    kind: "activeBan",
    label: "Active ban",
    compactLabel: "Ban",
    title: "Active ban"
  },
  expiredBan: {
    kind: "expiredBan",
    label: "Expired ban",
    compactLabel: "Expired",
    title: "Expired ban"
  },
  unavailable: {
    kind: "unavailable",
    label: "Moderation unavailable",
    compactLabel: "Unavailable",
    title: "Moderation unavailable"
  }
};

export function disciplineKindFromBanStatus(
  status: PlayerBanStatus
): PlayerDisciplineKind {
  if (status === "active") {
    return "activeBan";
  }

  if (status === "expired") {
    return "expiredBan";
  }

  return "none";
}

export function getPlayerDisciplineStatus(
  kind: PlayerDisciplineKind
): PlayerDisciplineStatus {
  return STATUS_BY_KIND[kind];
}

export function playerDisciplineLabel(
  kind: PlayerDisciplineKind,
  density: PlayerDisciplineDensity = "badge"
): string {
  const status = getPlayerDisciplineStatus(kind);
  return density === "compact" ? status.compactLabel : status.label;
}

export function playerDisciplineBadgeClass(
  kind: PlayerDisciplineKind,
  density: PlayerDisciplineDensity = "badge",
  className?: string
): string {
  return clsx(
    "inline-flex w-fit items-center rounded-sm border font-semibold uppercase tracking-wide",
    density === "full"
      ? "px-2.5 py-1 text-[11px]"
      : density === "compact"
        ? "ml-1.5 px-1.5 py-0.5 text-[10px]"
        : "ml-2 px-1.5 py-0.5 text-[10px]",
    kind === "activeBan"
      ? "border-rose-300/30 bg-rose-950/50 text-rose-200"
      : kind === "expiredBan"
        ? "border-amber-300/30 bg-amber-950/50 text-amber-200"
        : kind === "none"
          ? "border-emerald-300/25 bg-emerald-950/30 text-emerald-100"
          : "border-slate-500/45 bg-slate-900/70 text-slate-300",
    className
  );
}

export function PlayerDisciplineBadge({
  status,
  density = "badge",
  className
}: PlayerDisciplineBadgeProps) {
  const kind = disciplineKindFromBanStatus(status);
  if (kind === "none") {
    return null;
  }

  const resolved = getPlayerDisciplineStatus(kind);

  return (
    <span
      className={playerDisciplineBadgeClass(kind, density, className)}
      title={resolved.title}
    >
      {playerDisciplineLabel(kind, density)}
    </span>
  );
}
