import { clsx } from "clsx";

export const segmentedShellClass = "w-fit max-w-full overflow-x-auto";

export const segmentedListClass =
  "inline-flex min-w-max rounded-md border border-slate-700/80 bg-slate-900/60 p-1 text-sm";

export function segmentedItemClass(selected: boolean): string {
  return clsx(
    "whitespace-nowrap rounded-md px-3 py-1.5",
    selected
      ? "bg-slate-200 font-medium text-slate-900"
      : "text-slate-200 hover:bg-slate-800/70"
  );
}
