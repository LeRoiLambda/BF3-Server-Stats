import { clsx } from "clsx";
import { ui } from "@/components/layout/stats-ui";
import type {
  ModerationPolicy,
  ModerationSeverity
} from "@/src/server/repositories/moderation-repository";

type ModerationPolicySectionProps = {
  policy: ModerationPolicy;
  className?: string;
};

function severityClass(severity: ModerationSeverity): string {
  return clsx(
    "border",
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

export function ModerationPolicySection({
  policy,
  className
}: ModerationPolicySectionProps) {
  if (!policy.available) {
    return null;
  }

  const ladder = policy.ladders.find((entry) => entry.key === "punishment");
  if (!ladder) {
    return null;
  }

  return (
    <section className={clsx(ui.panel, className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className={ui.sectionTitle}>Punishment Ladder</h2>
        <span className="text-xs text-slate-400">
          {ladder.steps.length} steps
        </span>
      </div>

      <ol className="flex gap-2 overflow-x-auto pb-1">
        {ladder.steps.map((step) => (
          <li key={`${step.index}-${step.token}`} className="flex items-center gap-2">
            {step.index > 0 ? (
              <span className="text-xs text-slate-600" aria-hidden="true">
                -&gt;
              </span>
            ) : null}
            <span
              className={clsx(
                "inline-flex min-h-9 min-w-[6rem] items-center justify-center rounded-sm px-2 py-1 text-center text-xs font-medium",
                severityClass(step.severity)
              )}
            >
              {step.index + 1}. {step.label}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
