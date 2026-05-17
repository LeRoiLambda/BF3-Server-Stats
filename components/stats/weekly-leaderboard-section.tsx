import Link from "next/link";
import { clsx } from "clsx";
import { ui } from "@/components/layout/stats-ui";
import { PlayerDisciplineBadge } from "@/components/stats/player-discipline-badge";
import {
  PlayerIdentity,
  PlayerTableCellLink,
  playerHref,
  playerTableRowClass
} from "@/components/stats/player-link";
import {
  toWeeklyLeaderboardPodiumRank,
  WeeklyLeaderboardMedal,
  weeklyLeaderboardPodiumLabel,
  WeeklyLeaderboardRank,
  type WeeklyLeaderboardPodiumRank
} from "@/components/stats/weekly-leaderboard-rank";
import type {
  LeaderboardPlayer,
  WeeklyLeaderboardResult
} from "@/src/server/repositories/player-stats-repository";

type WeeklyLeaderboardSectionProps = Readonly<{
  result: WeeklyLeaderboardResult;
  fullLeadersHref: string;
  serverId?: number | null;
  as?: "article" | "section";
  className?: string;
}>;

type WeeklyPodiumProps = Readonly<{
  players: LeaderboardPlayer[];
  serverId?: number | null;
}>;

type WeeklyLeaderboardTableProps = Readonly<{
  players: LeaderboardPlayer[];
  startRank: number;
  serverId?: number | null;
}>;

const PODIUM_META: Record<
  WeeklyLeaderboardPodiumRank,
  {
    className: string;
    interactiveClassName: string;
    labelClassName: string;
    medalClassName: string;
    metricClassName: string;
    watermarkClassName: string;
  }
> = {
  1: {
    className:
      "border-amber-300/75 bg-[linear-gradient(135deg,rgba(120,78,0,0.42),rgba(15,23,42,0.76)_56%,rgba(251,191,36,0.16))] shadow-[0_18px_36px_rgba(0,0,0,0.30),0_0_0_1px_rgba(251,191,36,0.14),inset_0_1px_0_rgba(251,191,36,0.24)]",
    interactiveClassName:
      "hover:border-amber-100 hover:brightness-[1.08] focus-visible:border-amber-100 focus-visible:ring-2 focus-visible:ring-amber-200/55",
    labelClassName: "text-amber-100",
    medalClassName: "h-14 w-12 sm:h-16 sm:w-14",
    metricClassName: "text-amber-50",
    watermarkClassName: "text-amber-200/10"
  },
  2: {
    className:
      "border-slate-200/60 bg-[linear-gradient(135deg,rgba(148,163,184,0.22),rgba(15,23,42,0.78)_58%,rgba(226,232,240,0.10))] shadow-[0_14px_28px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(226,232,240,0.20)]",
    interactiveClassName:
      "hover:border-slate-100 hover:brightness-[1.08] focus-visible:border-slate-100 focus-visible:ring-2 focus-visible:ring-slate-200/50",
    labelClassName: "text-slate-100",
    medalClassName: "h-12 w-10 sm:h-14 sm:w-12",
    metricClassName: "text-slate-50",
    watermarkClassName: "text-slate-100/10"
  },
  3: {
    className:
      "border-orange-300/60 bg-[linear-gradient(135deg,rgba(124,45,18,0.32),rgba(15,23,42,0.78)_58%,rgba(251,146,60,0.12))] shadow-[0_14px_28px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(251,146,60,0.18)]",
    interactiveClassName:
      "hover:border-orange-200 hover:brightness-[1.08] focus-visible:border-orange-200 focus-visible:ring-2 focus-visible:ring-orange-200/50",
    labelClassName: "text-orange-100",
    medalClassName: "h-12 w-10 sm:h-14 sm:w-12",
    metricClassName: "text-orange-50",
    watermarkClassName: "text-orange-200/10"
  }
};

function podiumGridClass(playerCount: number): string {
  if (playerCount === 1) {
    return "sm:grid-cols-1";
  }

  if (playerCount === 2) {
    return "sm:grid-cols-2";
  }

  return "sm:grid-cols-3";
}

function podiumPlacementClass(rank: number, playerCount: number): string {
  if (playerCount < 3) {
    return rank === 1 ? "sm:min-h-[126px]" : "sm:min-h-[112px]";
  }

  if (rank === 1) {
    return "sm:order-2 sm:min-h-[178px] sm:-translate-y-3";
  }

  if (rank === 2) {
    return "sm:order-1 sm:min-h-[154px]";
  }

  return "sm:order-3 sm:min-h-[154px]";
}

function WeeklyPodium({ players, serverId = null }: WeeklyPodiumProps) {
  return (
    <div className={clsx("grid gap-3 pt-2 sm:items-end", podiumGridClass(players.length))}>
      {players.map((player, index) => {
        const rank = index + 1;
        const podiumRank = toWeeklyLeaderboardPodiumRank(rank);
        const meta = podiumRank === null ? null : PODIUM_META[podiumRank];
        if (podiumRank === null || meta === null) {
          return null;
        }

        return (
          <Link
            key={player.playerId}
            href={playerHref(player.playerId, serverId)}
            className={clsx(
              "relative min-w-0 overflow-hidden rounded-sm border p-4 transition-[border-color,box-shadow,filter] duration-150 ease-out focus:outline-none",
              meta.className,
              meta.interactiveClassName,
              podiumPlacementClass(rank, players.length)
            )}
          >
            <div
              className={clsx(
                "pointer-events-none absolute -bottom-3 right-3 text-7xl font-black leading-none sm:text-8xl",
                meta.watermarkClassName
              )}
              aria-hidden="true"
            >
              #{rank}
            </div>

            <div className="relative flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <WeeklyLeaderboardMedal rank={podiumRank} className={meta.medalClassName} />
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Weekly #{rank}
                  </div>
                  <div
                    className={clsx(
                      "mt-0.5 text-sm font-bold uppercase tracking-wide",
                      meta.labelClassName
                    )}
                  >
                    {weeklyLeaderboardPodiumLabel(podiumRank)}
                  </div>
                </div>
              </div>
            </div>

            <div className="relative mt-4 min-w-0">
              <div
                className={clsx(
                  "truncate font-semibold text-slate-50",
                  rank === 1 ? "text-lg" : "text-base"
                )}
              >
                <PlayerIdentity
                  soldierName={player.soldierName}
                  countryCode={player.countryCode}
                />
              </div>
              <PlayerDisciplineBadge status={player.banStatus} density="compact" />
            </div>

            <div className="relative mt-4 grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-500">
                  Score
                </div>
                <div className={clsx("mt-1 font-bold", meta.metricClassName)}>
                  {player.score}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-500">
                  Kills
                </div>
                <div className={clsx("mt-1 font-bold", meta.metricClassName)}>
                  {player.kills}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-500">
                  KDR
                </div>
                <div className={clsx("mt-1 font-bold", meta.metricClassName)}>
                  {player.kdr.toFixed(2)}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function WeeklyLeaderboardTable({
  players,
  startRank,
  serverId = null
}: WeeklyLeaderboardTableProps) {
  return (
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
          {players.map((player, index) => (
            <tr key={player.playerId} className={playerTableRowClass(ui.tableRow)}>
              <td className={ui.td}>
                <PlayerTableCellLink playerId={player.playerId} serverId={serverId}>
                  <WeeklyLeaderboardRank rank={startRank + index} />
                </PlayerTableCellLink>
              </td>
              <td className={ui.td}>
                <PlayerTableCellLink playerId={player.playerId} serverId={serverId}>
                  <PlayerIdentity
                    soldierName={player.soldierName}
                    countryCode={player.countryCode}
                  />
                  <PlayerDisciplineBadge status={player.banStatus} />
                </PlayerTableCellLink>
              </td>
              <td className={ui.td}>
                <PlayerTableCellLink playerId={player.playerId} serverId={serverId}>
                  {player.score}
                </PlayerTableCellLink>
              </td>
              <td className={ui.td}>
                <PlayerTableCellLink playerId={player.playerId} serverId={serverId}>
                  {player.kills}
                </PlayerTableCellLink>
              </td>
              <td className={ui.td}>
                <PlayerTableCellLink playerId={player.playerId} serverId={serverId}>
                  {player.kdr.toFixed(2)}
                </PlayerTableCellLink>
              </td>
              <td className={ui.td}>
                <PlayerTableCellLink playerId={player.playerId} serverId={serverId}>
                  {player.hsr.toFixed(2)}%
                </PlayerTableCellLink>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function WeeklyLeaderboardSection({
  result,
  fullLeadersHref,
  serverId = null,
  as: Container = "section",
  className
}: WeeklyLeaderboardSectionProps) {
  const podiumPlayers = result.players.slice(0, 3);
  const remainingPlayers = result.players.slice(3);

  return (
    <Container className={clsx(ui.panel, className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={ui.sectionTitle}>Top 20 This Week</h2>
          <p className="mt-1 text-xs text-slate-400">
            Session totals over the last 7 days.
          </p>
        </div>
        <Link href={fullLeadersHref} className={ui.buttonLink}>
          Full Leaders Page
        </Link>
      </div>

      {!result.available ? (
        <div className={ui.tableShell}>
          <div className={ui.emptyCell}>
            Weekly ranking is unavailable because session history is not present.
          </div>
        </div>
      ) : result.players.length === 0 ? (
        <div className={ui.tableShell}>
          <div className={ui.emptyCell}>No session stats found this week.</div>
        </div>
      ) : (
        <>
          <WeeklyPodium players={podiumPlayers} serverId={serverId} />
          {remainingPlayers.length > 0 ? (
            <div className="mt-4">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Ranks 4-20
              </div>
              <WeeklyLeaderboardTable
                players={remainingPlayers}
                startRank={4}
                serverId={serverId}
              />
            </div>
          ) : null}
        </>
      )}
    </Container>
  );
}
