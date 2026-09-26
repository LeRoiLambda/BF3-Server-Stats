"use client";

import { Menu } from "@base-ui/react/menu";
import { clsx } from "clsx";
import Link from "next/link";

export type LinkMenuItem = Readonly<{
  label: string;
  href: string;
  current: boolean;
}>;

type LinkMenuProps = Readonly<{
  label: string;
  items: LinkMenuItem[];
  align?: "start" | "end";
  className?: string;
}>;

function ChevronIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4 shrink-0 fill-current text-slate-400">
      <path d="M4.2 6.2a.75.75 0 0 1 1.06 0L8 8.94l2.74-2.74a.75.75 0 1 1 1.06 1.06l-3.27 3.27a.75.75 0 0 1-1.06 0L4.2 7.26a.75.75 0 0 1 0-1.06Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4 shrink-0 fill-current text-teal-300">
      <path d="M13.3 4.2a.75.75 0 0 1 0 1.06l-6.5 6.5a.75.75 0 0 1-1.06 0L2.7 8.72a.75.75 0 1 1 1.06-1.06l2.51 2.51 5.97-5.97a.75.75 0 0 1 1.06 0Z" />
    </svg>
  );
}

export function LinkMenu({ label, items, align = "start", className }: LinkMenuProps) {
  const current = items.find((item) => item.current) ?? items[0];

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={`${label}: ${current?.label ?? ""}`}
        className={clsx(
          "flex h-9 items-center justify-between gap-2 rounded-sm border border-slate-600 bg-slate-950/85 px-3 text-left text-sm text-slate-100 hover:border-slate-400 focus:outline-none focus-visible:border-slate-300 data-[popup-open]:border-slate-400",
          className
        )}
      >
        <span className="min-w-0 truncate">{current?.label}</span>
        <ChevronIcon />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align={align} className="z-40">
          <Menu.Popup className="max-h-[var(--available-height)] min-w-[var(--anchor-width)] overflow-y-auto rounded-sm border border-slate-600/70 bg-slate-950 py-1 shadow-[0_12px_30px_rgba(0,0,0,0.5)] outline-none transition-opacity duration-100 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0">
            {items.map((item) => (
              <Menu.LinkItem
                key={item.href}
                closeOnClick
                aria-current={item.current ? "page" : undefined}
                render={<Link href={item.href} prefetch={false} />}
                className={clsx(
                  "flex items-center justify-between gap-6 px-3 py-2 text-sm outline-none data-[highlighted]:bg-teal-900/50",
                  item.current ? "font-semibold text-slate-50" : "text-slate-200"
                )}
              >
                {item.label}
                {item.current ? <CheckIcon /> : null}
              </Menu.LinkItem>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
