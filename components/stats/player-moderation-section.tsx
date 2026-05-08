import { clsx } from "clsx";
import { ui } from "@/components/layout/stats-ui";
import type {
  ModerationAction,
  ModerationLadder,
  ModerationLadderStep,
  ModerationSeverity,
  ModerationStatusKind,
  PlayerModerationSummary
} from "@/src/server/repositories/moderation-repository";

type PlayerModerationSectionProps = {
  summary: PlayerModerationSummary;
};

function statusClass(kind: ModerationStatusKind): string {
  return clsx(
    "inline-flex w-fit rounded-sm border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide",
    kind === "activeBan"
      ? "border-rose-300/40 bg-rose-950/55 text-rose-100"
      : kind === "expiredBan"
        ? "border-amber-300/35 bg-amber-950/45 text-amber-100"
        : "border-emerald-300/25 bg-emerald-950/25 text-emerald-100"
  );
}

function severityClass(severity: ModerationSeverity, state?: ModerationLadderStep["state"]): string {
  const stateClass =
    state === "past"
      ? "opacity-70"
      : state === "next"
        ? "ring-1 ring-slate-200/60"
        : "opacity-95";

  return clsx(
    "border",
    stateClass,
    severity === "critical"
      ? "border-rose-300/45 bg-rose-950/45 text-rose-100"
      : severity === "high"
        ? "border-orange-300/35 bg-orange-950/35 text-orange-100"
        : severity === "medium"
          ? "border-amber-300/35 bg-amber-950/35 text-amber-100"
          : severity === "low"
            ? "border-sky-300/30 bg-sky-950/30 text-sky-100"
            : "border-slate-600/45 bg-slate-950/60 text-slate-200"
  );
}

function compactDate(value: string | null): string {
  return value ?? "Unknown date";
}

function formatPointSource(source: "global" | "server"): string {
  return source === "global" ? "Global" : "Server";
}

function mainLadder(ladders: ModerationLadder[]): ModerationLadder | null {
  return ladders.find((ladder) => ladder.key === "punishment") ?? null;
}

function renderLadderStep(step: ModerationLadderStep, showIndex: boolean) {
  return (
    <li key={`${step.token}-${step.index}`} className="flex items-center gap-2">
      {step.index > 0 ? (
        <span className="text-xs text-slate-600" aria-hidden="true">
          -&gt;
        </span>
      ) : null}
      <span
        className={clsx(
          "inline-flex min-h-9 min-w-[6.5rem] items-center justify-center rounded-sm px-2 py-1 text-center text-xs font-medium",
          severityClass(step.severity, step.state)
        )}
      >
        {showIndex ? `${step.index + 1}. ` : null}
        {step.label}
      </span>
    </li>
  );
}

function actionDotClass(severity: ModerationSeverity): string {
  return clsx(
    "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
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
      <p className="rounded-sm border border-slate-700/45 bg-slate-950/35 px-3 py-4 text-sm text-slate-400">
        No moderation actions found for this player.
      </p>
    );
  }

  return (
    <ol className="divide-y divide-slate-800/80 rounded-sm border border-slate-700/45 bg-slate-950/35">
      {actions.map((action) => (
        <li key={action.recordId} className="grid gap-2 p-3 sm:grid-cols-[8rem_1fr]">
          <time className="text-xs text-slate-400">{compactDate(action.occurredAt)}</time>
          <div className="flex min-w-0 gap-3">
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
              ) : (
                <p className="mt-1 text-sm text-slate-500">No message recorded.</p>
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function PlayerModerationSection({ summary }: PlayerModerationSectionProps) {
  const primaryLadder = mainLadder(summary.ladders);
  const nextActionLabel =
    summary.nextStep?.label ??
    (primaryLadder ? "Ladder complete" : "No ladder configured");

  return (
    <section className={`mt-6 ${ui.panel}`}>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className={ui.sectionTitle}>Moderation</h2>
          <p className="mt-1 text-sm text-slate-400">
            Current punishment state, ladder position, and recent actions.
          </p>
        </div>
        {summary.available ? (
          <span className={statusClass(summary.currentStatus.kind)}>
            {summary.currentStatus.label}
          </span>
        ) : null}
      </div>

      {!summary.available ? (
        <p className="text-sm text-slate-300">Moderation data is not enabled right now.</p>
      ) : (
        <>
          <div className="grid overflow-hidden rounded-sm border border-slate-700/60 bg-slate-950/45 text-sm md:grid-cols-4">
            <div className="border-b border-slate-700/60 p-3 md:border-b-0 md:border-r">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Status</p>
              <p className="mt-2 font-semibold text-slate-100">
                {summary.currentStatus.label}
              </p>
              {summary.currentStatus.endsAt ? (
                <p className="mt-1 text-xs text-slate-400">
                  {summary.currentStatus.kind === "expiredBan" ? "Ended" : "Ends"}{" "}
                  {summary.currentStatus.endsAt}
                </p>
              ) : null}
            </div>
            <div className="border-b border-slate-700/60 p-3 md:border-b-0 md:border-r">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Chat Mute</p>
              <p className="mt-2 font-semibold text-slate-100">
                {summary.muteStatus.label}
              </p>
              {summary.muteStatus.active ? (
                <p className="mt-1 text-xs text-slate-400">
                  {summary.muteStatus.durationLabel} - until {summary.muteStatus.endsAt}
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-500">
                  No active timed mute in records.
                </p>
              )}
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
                <p className="mt-2 text-slate-400">No points table available.</p>
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

          {summary.currentStatus.detail || summary.muteStatus.detail ? (
            <div className="mt-3 grid gap-2">
              {summary.currentStatus.detail ? (
                <p className="rounded-sm border border-slate-700/45 bg-slate-950/35 px-3 py-2 text-sm leading-5 text-slate-300">
                  {summary.currentStatus.detail}
                </p>
              ) : null}
              {summary.muteStatus.detail ? (
                <p className="rounded-sm border border-slate-700/45 bg-slate-950/35 px-3 py-2 text-sm leading-5 text-slate-300">
                  Mute reason: {summary.muteStatus.detail}
                </p>
              ) : null}
            </div>
          ) : null}

          {primaryLadder ? (
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
                  {primaryLadder.label}
                </h3>
                <span className="text-xs text-slate-500">
                  {primaryLadder.steps.length} steps
                </span>
              </div>
              <ol className="flex gap-2 overflow-x-auto pb-2">
                {primaryLadder.steps.map((step) => renderLadderStep(step, true))}
              </ol>
            </div>
          ) : null}

          <div className="mt-5">
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
