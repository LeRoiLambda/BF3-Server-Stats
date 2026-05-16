import { clsx } from "clsx";
import { ui } from "@/components/layout/stats-ui";
import type {
  ModerationAction,
  ModerationSeverity,
  PlayerModerationSummary
} from "@/src/server/repositories/moderation-repository";

type PlayerModerationSectionProps = {
  summary: PlayerModerationSummary;
};

function compactDate(value: string | null): string {
  return value ?? "Unknown date";
}

function formatPointSource(source: "global" | "server"): string {
  return source === "global" ? "Global" : "Server";
}

function actionDotClass(severity: ModerationSeverity): string {
  return clsx(
    "mt-1 h-2 w-2 shrink-0 rounded-full",
    severity === "critical"
      ? "bg-rose-300"
      : severity === "high"
        ? "bg-orange-300"
        : severity === "medium"
          ? "bg-amber-300"
          : severity === "low"
            ? "bg-sky-300"
            : "bg-slate-400"
  );
}

function ModerationTimeline({ actions }: { actions: ModerationAction[] }) {
  if (actions.length === 0) {
    return (
      <p className="rounded-sm border border-slate-700/45 bg-slate-950/35 px-3 py-2 text-sm text-slate-400">
        No recent actions.
      </p>
    );
  }

  return (
    <ol className="divide-y divide-slate-800/80 rounded-sm border border-slate-700/45 bg-slate-950/35">
      {actions.map((action) => (
        <li key={action.recordId} className="grid gap-2 px-3 py-2 sm:grid-cols-[7.5rem_1fr]">
          <time className="text-xs text-slate-400">{compactDate(action.occurredAt)}</time>
          <div className="flex min-w-0 gap-2">
            <span className={actionDotClass(action.severity)} aria-hidden="true" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-sm font-semibold text-slate-100">{action.label}</p>
                {action.actor ? (
                  <span className="text-xs text-slate-500">by {action.actor}</span>
                ) : null}
              </div>
              {action.message ? (
                <p className="mt-1 break-words text-sm leading-5 text-slate-300">
                  {action.message}
                </p>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function PlayerModerationSection({ summary }: PlayerModerationSectionProps) {
  const primaryLadder =
    summary.ladders.find((ladder) => ladder.key === "punishment") ?? null;
  const nextActionLabel =
    summary.nextStep?.label ?? (primaryLadder ? "Ladder complete" : "Unavailable");

  return (
    <section className="stats-panel mt-6 min-w-0 rounded-sm p-4">
      <div className="mb-3">
        <h2 className={ui.sectionTitle}>Moderation Details</h2>
      </div>

      {!summary.available ? (
        <p className="text-sm text-slate-300">Unavailable.</p>
      ) : (
        <>
          <div className="grid overflow-hidden rounded-sm border border-slate-700/60 bg-slate-950/45 text-sm md:grid-cols-3">
            <div className="border-b border-slate-700/60 p-3 md:border-b-0 md:border-r">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Chat Mute</p>
              <p className="mt-2 font-semibold text-slate-100">
                {summary.muteStatus.active ? summary.muteStatus.label : "None"}
              </p>
              {summary.muteStatus.active ? (
                <p className="mt-1 text-xs text-slate-400">
                  {summary.muteStatus.durationLabel ?? "Active"}
                  {summary.muteStatus.endsAt ? ` - until ${summary.muteStatus.endsAt}` : ""}
                </p>
              ) : null}
            </div>
            <div className="border-b border-slate-700/60 p-3 md:border-b-0 md:border-r">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">
                Infraction Points
              </p>
              {summary.points ? (
                <>
                  <p className="mt-2 font-semibold text-slate-100">
                    {summary.points.totalPoints} total
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {summary.points.punishPoints} punish / {summary.points.forgivePoints}{" "}
                    forgive - {formatPointSource(summary.points.source)}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-slate-400">Unavailable</p>
              )}
            </div>
            <div className="p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">
                Next Ladder Action
              </p>
              <p className="mt-2 font-semibold text-slate-100">{nextActionLabel}</p>
              {summary.nextStep ? (
                <p className="mt-1 text-xs text-slate-400">
                  Step {summary.nextStep.index + 1} of {primaryLadder?.steps.length ?? 0}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
              Recent Actions
            </h3>
            <ModerationTimeline actions={summary.recentActions} />
          </div>
        </>
      )}
    </section>
  );
}
