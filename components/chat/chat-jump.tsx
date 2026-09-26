"use client";

import { Popover } from "@base-ui/react/popover";
import { Select } from "@base-ui/react/select";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { chatHref } from "@/components/chat/chat-href";
import { ui } from "@/components/layout/stats-ui";

type ChatJumpProps = Readonly<{
  pagePath: string;
  filterQuery: string;
  today: string;
  date: string;
  hour: string;
}>;

const WHOLE_DAY = "day";

const HOURS = [
  { label: "Whole day", value: WHOLE_DAY },
  ...Array.from({ length: 24 }, (_, hour) => ({
    label: `${String(hour).padStart(2, "0")}:00`,
    value: String(hour)
  }))
];

const weekdayFormat = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long" });
const shortDateFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric"
});

function dateValue(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function shiftDate(date: string, days: number): string {
  const shifted = dateValue(date);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M5 1.75a.75.75 0 0 1 1.5 0V3h3V1.75a.75.75 0 0 1 1.5 0V3h1.25A1.75 1.75 0 0 1 14 4.75v8.5A1.75 1.75 0 0 1 12.25 15h-8.5A1.75 1.75 0 0 1 2 13.25v-8.5A1.75 1.75 0 0 1 3.75 3H5V1.75ZM3.5 7v6.25c0 .14.11.25.25.25h8.5c.14 0 .25-.11.25-.25V7h-9Z" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4 shrink-0 fill-current text-slate-400">
      <path d="M4.2 6.2a.75.75 0 0 1 1.06 0L8 8.94l2.74-2.74a.75.75 0 1 1 1.06 1.06l-3.27 3.27a.75.75 0 0 1-1.06 0L4.2 7.26a.75.75 0 0 1 0-1.06Z" />
    </svg>
  );
}

export function ChatJump({ pagePath, filterQuery, today, date, hour }: ChatJumpProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pickedDate, setPickedDate] = useState(date);
  const [pickedHour, setPickedHour] = useState(hour || WHOLE_DAY);
  const recentDays = Array.from({ length: 7 }, (_, index) => shiftDate(today, -1 - index));

  const dayHref = (day: string, dayHour: string) =>
    chatHref(pagePath, filterQuery, {
      date: day,
      hour: dayHour === WHOLE_DAY ? null : dayHour
    });

  function showPickedDay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pickedDate) {
      setOpen(false);
      router.push(dayHref(pickedDate, pickedHour));
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className={`${ui.buttonGhost} gap-2 data-[popup-open]:border-slate-400`}>
        <CalendarIcon />
        Jump to
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="end" className="z-40">
          <Popover.Popup className="w-80 max-w-[calc(100vw-1.5rem)] rounded-sm border border-slate-600/70 bg-slate-950 p-3 shadow-[0_12px_30px_rgba(0,0,0,0.5)] outline-none transition-opacity duration-100 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0">
            <Popover.Title className="px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Jump to
            </Popover.Title>
            <ul className="mt-2 grid gap-0.5">
              {recentDays.map((day, index) => (
                <li key={day}>
                  <Link
                    href={dayHref(day, WHOLE_DAY)}
                    prefetch={false}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between rounded-sm px-2 py-1.5 text-sm text-slate-100 hover:bg-teal-900/50 focus:outline-none focus-visible:bg-teal-900/50"
                  >
                    {index === 0 ? "Yesterday" : weekdayFormat.format(dateValue(day))}
                    <span className="text-xs text-slate-500">
                      {shortDateFormat.format(dateValue(day))}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <form onSubmit={showPickedDay} className="mt-3 grid gap-2 border-t border-slate-700/60 pt-3">
              <label
                htmlFor="chat-jump-date"
                className="px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400"
              >
                Another day
              </label>
              <div className="flex gap-2">
                <input
                  id="chat-jump-date"
                  type="date"
                  required
                  max={today}
                  value={pickedDate}
                  onChange={(event) => setPickedDate(event.target.value)}
                  className="h-9 min-w-0 flex-1 rounded-sm border border-slate-600 bg-slate-950/85 px-2 text-sm text-slate-100 [color-scheme:dark] focus:border-slate-400 focus:outline-none"
                />
                <Select.Root
                  items={HOURS}
                  value={pickedHour}
                  onValueChange={(value) => setPickedHour(value ?? WHOLE_DAY)}
                >
                  <Select.Trigger
                    aria-label="Hour"
                    className="flex h-9 w-32 shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-sm border border-slate-600 bg-slate-950/85 px-2 text-sm text-slate-100 hover:border-slate-400 focus:outline-none focus-visible:border-slate-300"
                  >
                    <Select.Value className="truncate" />
                    <Select.Icon>
                      <ChevronIcon />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Positioner sideOffset={4} className="z-50">
                      <Select.Popup className="min-w-[var(--anchor-width)] rounded-sm border border-slate-600/70 bg-slate-950 shadow-[0_12px_30px_rgba(0,0,0,0.5)] outline-none">
                        <Select.List className="max-h-[min(16rem,var(--available-height))] overflow-y-auto py-1">
                          {HOURS.map((item) => (
                            <Select.Item
                              key={item.value}
                              value={item.value}
                              className="cursor-default select-none px-3 py-1.5 text-sm text-slate-100 outline-none data-[highlighted]:bg-teal-900/50 data-[selected]:font-semibold"
                            >
                              <Select.ItemText>{item.label}</Select.ItemText>
                            </Select.Item>
                          ))}
                        </Select.List>
                      </Select.Popup>
                    </Select.Positioner>
                  </Select.Portal>
                </Select.Root>
              </div>
              <button type="submit" className={ui.buttonPrimary}>
                Show
              </button>
            </form>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
