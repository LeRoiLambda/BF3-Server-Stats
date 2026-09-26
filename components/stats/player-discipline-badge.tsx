import { clsx } from "clsx";
import { Hint } from "@/components/layout/hint";

export type PlayerBanStatus = "active" | "expired" | null | undefined;
export type PlayerDisciplineKind =
  | "none"
  | "activeBan"
  | "expiredBan"
  | "unavailable";
export type PlayerDisciplineDensity = "full" | "badge" | "compact";

type PlayerDisciplineBadgeProps = {
  status: PlayerBanStatus;
  density?: PlayerDisciplineDensity;
  className?: string;
};

const LABELS: Record<PlayerDisciplineKind, { label: string; compactLabel: string }> = {
  none: { label: "No active ban", compactLabel: "No ban" },
  activeBan: { label: "Active ban", compactLabel: "Ban" },
  expiredBan: { label: "Expired ban", compactLabel: "Expired" },
  unavailable: { label: "Moderation unavailable", compactLabel: "Unavailable" }
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

export function playerDisciplineLabel(
  kind: PlayerDisciplineKind,
  density: PlayerDisciplineDensity = "badge"
): string {
  return density === "compact" ? LABELS[kind].compactLabel : LABELS[kind].label;
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

  const badgeClassName = playerDisciplineBadgeClass(kind, density, className);
  if (density !== "compact") {
    return <span className={badgeClassName}>{playerDisciplineLabel(kind, density)}</span>;
  }

  return (
    <Hint label={playerDisciplineLabel(kind)} className={badgeClassName}>
      {playerDisciplineLabel(kind, density)}
    </Hint>
  );
}
