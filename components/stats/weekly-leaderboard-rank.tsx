import { clsx } from "clsx";

type WeeklyLeaderboardRankProps = Readonly<{
  rank: number;
  showLabel?: boolean;
}>;

export type WeeklyLeaderboardPodiumRank = 1 | 2 | 3;

const PODIUM_RANKS: Record<
  WeeklyLeaderboardPodiumRank,
  {
    label: string;
    badgeClassName: string;
    medalClassName: string;
    medalInnerClassName: string;
    medalTextClassName: string;
    ribbonLeftClassName: string;
    ribbonRightClassName: string;
  }
> = {
  1: {
    label: "Gold",
    badgeClassName:
      "border-amber-300/70 bg-amber-400/10 text-amber-100 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.16)]",
    medalClassName: "fill-amber-300 stroke-amber-100/80",
    medalInnerClassName: "fill-amber-500/65 stroke-amber-100/35",
    medalTextClassName: "fill-amber-950",
    ribbonLeftClassName: "fill-amber-900/85",
    ribbonRightClassName: "fill-yellow-700/85"
  },
  2: {
    label: "Silver",
    badgeClassName:
      "border-slate-300/70 bg-slate-300/10 text-slate-100 shadow-[inset_0_0_0_1px_rgba(203,213,225,0.14)]",
    medalClassName: "fill-slate-200 stroke-white/80",
    medalInnerClassName: "fill-slate-400/70 stroke-white/40",
    medalTextClassName: "fill-slate-950",
    ribbonLeftClassName: "fill-slate-700/90",
    ribbonRightClassName: "fill-slate-500/90"
  },
  3: {
    label: "Bronze",
    badgeClassName:
      "border-orange-300/65 bg-orange-400/10 text-orange-100 shadow-[inset_0_0_0_1px_rgba(251,146,60,0.14)]",
    medalClassName: "fill-orange-300 stroke-orange-100/80",
    medalInnerClassName: "fill-orange-600/65 stroke-orange-100/35",
    medalTextClassName: "fill-orange-950",
    ribbonLeftClassName: "fill-orange-950/90",
    ribbonRightClassName: "fill-orange-700/90"
  }
};

export function toWeeklyLeaderboardPodiumRank(
  rank: number
): WeeklyLeaderboardPodiumRank | null {
  return rank === 1 || rank === 2 || rank === 3 ? rank : null;
}

export function weeklyLeaderboardPodiumLabel(
  rank: WeeklyLeaderboardPodiumRank
): string {
  return PODIUM_RANKS[rank].label;
}

export function WeeklyLeaderboardMedal({
  rank,
  className
}: Readonly<{
  rank: WeeklyLeaderboardPodiumRank;
  className?: string;
}>) {
  const podium = PODIUM_RANKS[rank];

  return (
    <svg
      viewBox="0 0 32 42"
      className={clsx("h-7 w-6", className)}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M8 2h7.5l3.25 13.5h-8L8 2Z"
        className={podium.ribbonLeftClassName}
      />
      <path
        d="M16.5 2H24l-2.75 13.5h-8L16.5 2Z"
        className={podium.ribbonRightClassName}
      />
      <circle
        cx="16"
        cy="27"
        r="12"
        className={podium.medalClassName}
        strokeWidth="1.5"
      />
      <circle
        cx="16"
        cy="27"
        r="7.5"
        className={podium.medalInnerClassName}
        strokeWidth="1"
      />
      <text
        x="16"
        y="31.5"
        textAnchor="middle"
        className={clsx("text-[12px] font-bold", podium.medalTextClassName)}
      >
        {rank}
      </text>
    </svg>
  );
}

export function WeeklyLeaderboardRank({
  rank,
  showLabel = true
}: WeeklyLeaderboardRankProps) {
  const podiumRank = toWeeklyLeaderboardPodiumRank(rank);

  if (podiumRank === null) {
    return (
      <span
        className="inline-flex h-7 min-w-9 items-center justify-center text-slate-300"
        aria-label={`Weekly rank ${rank}`}
      >
        {rank}
      </span>
    );
  }

  const podium = PODIUM_RANKS[podiumRank];

  return (
    <span
      className={clsx(
        showLabel
          ? "inline-flex h-7 min-w-11 items-center justify-center gap-1 rounded-sm border px-1.5 text-xs font-bold"
          : "inline-flex h-7 w-7 items-center justify-center",
        showLabel ? podium.badgeClassName : undefined
      )}
      aria-label={`${podium.label} weekly rank ${rank}`}
      title={`${podium.label} weekly rank`}
    >
      <WeeklyLeaderboardMedal rank={podiumRank} className={showLabel ? "h-5 w-4" : "h-7 w-6"} />
      {showLabel ? <span>#{rank}</span> : null}
    </span>
  );
}
