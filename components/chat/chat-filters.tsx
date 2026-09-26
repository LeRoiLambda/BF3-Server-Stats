import Form from "next/form";
import Link from "next/link";
import { chatHref, type ChatQueryValues } from "@/components/chat/chat-href";
import { ChatPlayerFilter } from "@/components/chat/chat-player-filter";
import { SegmentedNav } from "@/components/layout/segmented-nav";
import { ui } from "@/components/layout/stats-ui";
import { PlayerIdentity } from "@/components/stats/player-link";
import type { ChatPlayer } from "@/src/server/repositories/chat-repository";
import { CHAT_CHANNELS, type ChatParams } from "@/src/server/routing/chat-params";

type ChatFiltersProps = Readonly<{
  params: ChatParams;
  player: ChatPlayer | null;
  pagePath: string;
  // The filters as query values, and as a query string.
  filterValues: ChatQueryValues;
  filterQuery: string;
}>;

const CHANNEL_LABELS = {
  global: "Global",
  team: "Team",
  squad: "Squad"
} as const;

function HiddenFields({ values }: Readonly<{ values: ChatQueryValues }>) {
  return Object.entries(values).map(([name, value]) =>
    value ? <input key={name} type="hidden" name={name} value={value} /> : null
  );
}

// Filters narrow the messages (words, player, channel); "jump to" moves to a
// date and time. Each keeps the others.
export function ChatFilters({
  params,
  player,
  pagePath,
  filterValues,
  filterQuery
}: ChatFiltersProps) {
  const positioned = params.position.kind !== "latest";
  const filtered = params.text !== "" || params.playerId !== null || params.channel !== null;

  return (
    <div className="mb-4 grid gap-3">
      <div className="flex flex-col gap-2 md:flex-row">
        <Form
          key={`q:${params.text}`}
          action={pagePath}
          role="search"
          className="flex min-w-0 flex-1 gap-2"
        >
          <HiddenFields values={{ player: filterValues.player, channel: filterValues.channel }} />
          <input
            type="search"
            name="q"
            defaultValue={params.text}
            placeholder="Search messages..."
            title='Every word must appear; put "a phrase" in quotes.'
            aria-label="Search messages"
            autoComplete="off"
            className={ui.input}
          />
          <button type="submit" className={`${ui.buttonPrimary} shrink-0`}>
            Search
          </button>
        </Form>

        <div className="md:w-72">
          {params.playerId !== null ? (
            <div className="flex h-9 items-center gap-2 rounded-sm border border-teal-400/45 bg-teal-900/25 pl-3 pr-1 text-sm text-slate-100">
              <span className="text-[11px] uppercase tracking-wide text-slate-400">From</span>
              {player ? (
                <PlayerIdentity
                  soldierName={player.soldierName}
                  countryCode={player.countryCode}
                  className="flex-1"
                />
              ) : (
                <span className="min-w-0 flex-1 truncate text-slate-400">Unknown player</span>
              )}
              <Link
                href={chatHref(pagePath, filterQuery, { player: null })}
                aria-label="Show messages from every player"
                title="Show messages from every player"
                className="rounded-sm px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              >
                ✕
              </Link>
            </div>
          ) : (
            <ChatPlayerFilter pagePath={pagePath} filterQuery={filterQuery} />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedNav
          label="Channel"
          items={[
            {
              href: chatHref(pagePath, filterQuery, { channel: null }),
              label: "All",
              selected: params.channel === null
            },
            ...CHAT_CHANNELS.map((channel) => ({
              href: chatHref(pagePath, filterQuery, { channel }),
              label: CHANNEL_LABELS[channel],
              selected: params.channel === channel
            }))
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Form key={`at:${params.jumpTo}`} action={pagePath} className="flex items-center gap-2">
            <HiddenFields values={filterValues} />
            <label
              htmlFor="chat-jump-to"
              className="whitespace-nowrap text-[11px] font-medium uppercase tracking-wide text-slate-400"
            >
              Jump to
            </label>
            <input
              id="chat-jump-to"
              type="datetime-local"
              name="at"
              required
              defaultValue={params.jumpTo}
              className="h-9 rounded-sm border border-slate-600 bg-slate-950/85 px-2 text-sm text-slate-100 [color-scheme:dark] focus:border-slate-400 focus:outline-none"
            />
            <button type="submit" className={ui.buttonGhost}>
              Go
            </button>
          </Form>
          {filtered || positioned ? (
            <Link href={pagePath} className={ui.buttonGhost}>
              Reset
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
