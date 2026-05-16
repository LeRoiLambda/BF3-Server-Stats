import { clsx } from "clsx";

const panelBase =
  "stats-panel min-w-0 rounded-sm p-5";

const sectionCardBase =
  "rounded-sm border border-slate-600/35 bg-slate-950/70 p-4";

const tableShellBase =
  "w-full min-w-0 max-w-full overflow-x-auto rounded-sm border border-slate-600/35 bg-slate-950/60";

export const ui = {
  pageContainer: "mx-auto max-w-[1120px] px-3 py-6 sm:px-4 sm:py-8",
  panel: panelBase,
  card: sectionCardBase,
  cardCompact: `${sectionCardBase} p-3`,
  tableShell: tableShellBase,
  table: "min-w-full border-separate border-spacing-0 text-left text-xs sm:text-sm",
  tableHead: "bg-slate-900/90 text-slate-300",
  th: "border-b border-slate-500/45 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-slate-300",
  td: "border-b border-slate-800/70 px-3 py-2 text-slate-200",
  tableRow: "odd:bg-slate-950/35 even:bg-slate-900/25",
  emptyCell: "border-b border-slate-800/70 px-3 py-4 text-slate-400",
  input:
    "h-9 w-full rounded-sm border border-slate-600 bg-slate-950/85 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-400 focus:outline-none",
  buttonPrimary:
    "inline-flex h-9 items-center justify-center rounded-sm border border-teal-400/55 bg-teal-900/35 px-3 text-xs font-semibold uppercase tracking-wide text-slate-100 transition-colors hover:bg-teal-800/40",
  buttonGhost:
    "inline-flex h-9 items-center justify-center rounded-sm border border-slate-600 bg-slate-900/85 px-3 text-xs font-semibold uppercase tracking-wide text-slate-200 transition-colors hover:border-slate-400 hover:bg-slate-800/70 hover:text-slate-50",
  buttonLink:
    "rounded-sm border border-slate-600 bg-slate-900/80 px-2 py-1 text-xs text-slate-200 hover:border-slate-400",
  monoBlock:
    "mt-2 overflow-x-auto rounded-sm border border-slate-600/40 bg-slate-950/70 p-3 text-xs text-slate-300",
  subtitle: "max-w-3xl text-sm leading-6 text-slate-300",
  sectionTitle:
    "text-sm font-semibold uppercase tracking-[0.16em] text-slate-200"
} as const;

export function switchButtonClass(selected: boolean): string {
  return clsx(
    "rounded-sm border px-3 py-1.5 text-xs uppercase tracking-wide transition-colors",
    selected
      ? "border-teal-400/70 bg-teal-900/40 text-slate-100"
      : "border-slate-600 bg-slate-950/80 text-slate-300 hover:border-slate-400 hover:text-slate-100"
  );
}

export function navButtonClass(selected: boolean): string {
  return clsx(
    "shrink-0 whitespace-nowrap rounded-sm border px-2.5 py-2 text-xs font-medium uppercase tracking-wide transition-colors",
    selected
      ? "border-slate-300/40 bg-slate-700/50 text-slate-50"
      : "border-slate-600 bg-slate-950/80 text-slate-300 hover:border-slate-400 hover:text-slate-100"
  );
}

export function statusBadgeClass(isOnline: boolean): string {
  return isOnline
    ? "rounded-sm border border-emerald-400/55 bg-emerald-900/30 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-200"
    : "rounded-sm border border-slate-500/50 bg-slate-900/70 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300";
}

export function sortableHeadingClass(active: boolean): string {
  return clsx(
    "inline-flex items-center gap-1 transition-colors",
    active ? "text-slate-50" : "text-slate-200 hover:text-white"
  );
}
