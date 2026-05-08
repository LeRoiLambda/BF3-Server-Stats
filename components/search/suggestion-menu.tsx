"use client";

export type SuggestionMenuItem = {
  id: string;
  badge: string;
  label: string;
  detail?: string | null;
};

type SuggestionMenuProps<TItem extends SuggestionMenuItem> = Readonly<{
  id: string;
  items: readonly TItem[];
  onSelect: (item: TItem) => void;
}>;

export function SuggestionMenu<TItem extends SuggestionMenuItem>({
  id,
  items,
  onSelect
}: SuggestionMenuProps<TItem>) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div
      id={id}
      className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-20 max-h-72 overflow-y-auto rounded-sm border border-slate-600/70 bg-slate-950/95 shadow-[0_12px_30px_rgba(0,0,0,0.45)]"
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(item)}
          className="flex w-full min-w-0 items-start gap-3 border-b border-slate-800/80 px-3 py-2 text-left text-sm text-slate-200 transition-colors last:border-b-0 hover:bg-slate-800/80 focus:bg-slate-800/80 focus:outline-none"
        >
          <span className="mt-0.5 shrink-0 rounded-sm border border-slate-600/70 bg-slate-900/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
            {item.badge}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-slate-100">
              {item.label}
            </span>
            {item.detail ? (
              <span className="mt-0.5 block truncate text-xs text-slate-400">
                {item.detail}
              </span>
            ) : null}
          </span>
        </button>
      ))}
    </div>
  );
}
