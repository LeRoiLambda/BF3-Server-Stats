"use client";

import { Tooltip } from "@base-ui/react/tooltip";
import { clsx } from "clsx";
import Image from "next/image";
import Link from "next/link";
import { Fragment, memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { highlightParts } from "@/components/chat/chat-highlight";
import { chatHref } from "@/components/chat/chat-href";
import type { ChatChannelTone, ChatMessageView } from "@/components/chat/chat-message-view";
import { ui } from "@/components/layout/stats-ui";
import { PlayerDisciplineBadge } from "@/components/stats/player-discipline-badge";

export type ChatTranscriptPage = {
  messages: ChatMessageView[];
  hasOlder: boolean;
  hasNewer: boolean;
  latestLoggedId: number;
};

type ChatTranscriptProps = Readonly<{
  initial: ChatTranscriptPage;
  anchorId: number | null;
  positionLabel: string | null;
  terms: string[];
  pagePath: string;
  filterQuery: string;
  apiQuery: string;
  timeZone: string;
  filtered: boolean;
  emptyLabel: string;
}>;

type LoadKind = "older" | "newer" | "follow" | "latest";

type DetailTooltip = Tooltip.Handle<string>;

const FOLLOW_INTERVAL_MS = 10_000;
// Ids can be committed out of order.
const FOLLOW_OVERLAP_IDS = 20;
const TOP_SLACK_PX = 64;
const MAX_SHOWN_MESSAGES = 500;

const CHANNEL_TONE_CLASSES: Record<ChatChannelTone, string> = {
  global: "border-slate-500/45 text-slate-300",
  team: "border-sky-400/45 text-sky-200",
  squad: "border-emerald-400/45 text-emerald-200",
  other: "border-slate-600/45 text-slate-400"
};

async function fetchPage(apiQuery: string, cursor: Record<string, string>) {
  const response = await fetch(chatHref("/api/chat", apiQuery, cursor), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Chat request failed with ${response.status}`);
  }

  return (await response.json()) as ChatTranscriptPage;
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5 fill-current">
      <path d="M1.5 2.5A.5.5 0 0 1 2 2h12a.5.5 0 0 1 .38.82L9.5 8.6v4.9a.5.5 0 0 1-.72.45l-2-1A.5.5 0 0 1 6.5 12.5V8.6L1.62 2.82a.5.5 0 0 1-.12-.32Z" />
    </svg>
  );
}

function DaySeparator({ label }: Readonly<{ label: string }>) {
  return (
    <li className="sticky top-0 z-10 flex items-center gap-3 bg-slate-950/95 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 backdrop-blur-sm sm:px-4">
      <span aria-hidden="true" className="h-px flex-1 bg-slate-700/70" />
      {label}
      <span aria-hidden="true" className="h-px flex-1 bg-slate-700/70" />
    </li>
  );
}

function Speaker({
  message,
  tooltip
}: Readonly<{ message: ChatMessageView; tooltip: DetailTooltip }>) {
  const name = (
    <>
      {message.flag ? (
        <Tooltip.Trigger
          handle={tooltip}
          payload={message.flag.label}
          render={<span className="mr-1.5 inline-block align-[-1px]" />}
        >
          <Image
            src={message.flag.src}
            alt={message.flag.label}
            width={18}
            height={12}
            className="h-3 w-[18px] rounded-[2px] border border-slate-700/80 object-cover"
          />
        </Tooltip.Trigger>
      ) : null}
      <span
        className={clsx(
          "font-semibold",
          message.fromServer ? "text-amber-300" : "text-slate-50"
        )}
      >
        {message.speaker || "Unknown"}
      </span>
    </>
  );

  return (
    <span className="mr-1 whitespace-nowrap">
      {message.playerHref ? (
        <Link
          href={message.playerHref}
          prefetch={false}
          className="rounded-sm hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200/70"
        >
          {name}
        </Link>
      ) : (
        name
      )}
      <PlayerDisciplineBadge status={message.banStatus} density="compact" />
      <span className="text-slate-400">:</span>
    </span>
  );
}

type ChatMessageRowProps = Readonly<{
  message: ChatMessageView;
  terms: string[];
  anchored: boolean;
  playerFilterHref: string | null;
  tooltip: DetailTooltip;
}>;

const ChatMessageRow = memo(function ChatMessageRow({
  message,
  terms,
  anchored,
  playerFilterHref,
  tooltip
}: ChatMessageRowProps) {
  return (
    <li
      id={`message-${message.id}`}
      className={clsx(
        "group/message relative py-1 pl-3 pr-9 text-sm leading-6 sm:flex sm:gap-3 sm:px-4",
        anchored
          ? "bg-teal-400/10 shadow-[inset_3px_0_0_0_rgba(45,212,191,0.75)]"
          : "hover:bg-slate-800/35"
      )}
    >
      <Tooltip.Trigger
        handle={tooltip}
        payload={message.sentAt ? `${message.sentAt.label} · Show in conversation` : "Show in conversation"}
        render={
          <Link
            href={message.contextHref}
            prefetch={false}
            className="mr-1 font-mono text-[11px] tabular-nums text-slate-500 hover:text-teal-200 sm:mr-0 sm:w-[4.25rem] sm:shrink-0"
          />
        }
      >
        {message.sentAt ? (
          <time dateTime={message.sentAt.iso}>{message.sentAt.clock}</time>
        ) : (
          "--:--:--"
        )}
      </Tooltip.Trigger>{" "}
      <p className="inline break-words sm:block sm:min-w-0 sm:flex-1">
        <span
          className={clsx(
            "mr-1 inline-block rounded-sm border px-1 align-[1px] text-[10px] font-semibold uppercase leading-4 tracking-wide",
            CHANNEL_TONE_CLASSES[message.channelTone]
          )}
        >
          {message.channel ?? "?"}
        </span>{" "}
        {message.serverName ? (
          <>
            <span className="mr-1 text-xs text-slate-500">
              {message.serverName}
            </span>{" "}
          </>
        ) : null}
        <Speaker message={message} tooltip={tooltip} />{" "}
        <span className={message.fromServer ? "italic text-amber-100/80" : "text-slate-200"}>
          {highlightParts(message.text, terms).map((part, index) =>
            part.match ? (
              <mark key={index} className="rounded-sm bg-amber-300/25 px-0.5 text-amber-50">
                {part.text}
              </mark>
            ) : (
              part.text
            )
          )}
        </span>
      </p>
      {playerFilterHref ? (
        <Tooltip.Trigger
          handle={tooltip}
          payload={`Only messages from ${message.speaker}`}
          render={
            <Link
              href={playerFilterHref}
              prefetch={false}
              aria-label={`Show only messages from ${message.speaker}`}
              className="absolute right-2 top-1.5 rounded-sm p-1 text-slate-500 opacity-0 transition-opacity hover:bg-slate-800 hover:text-slate-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200/70 group-hover/message:opacity-100 sm:static sm:mt-1 sm:h-fit [@media(hover:none)]:opacity-100"
            />
          }
        >
          <FilterIcon />
        </Tooltip.Trigger>
      ) : null}
    </li>
  );
});

function newMessageAnnouncement(added: ChatMessageView[]): string {
  const newest = added[0];
  const from = `${newest.speaker || "Unknown"}: ${newest.text}`;
  return added.length === 1
    ? `New message from ${from}`
    : `${added.length} new messages, the newest from ${from}`;
}

export function ChatTranscript({
  initial,
  anchorId,
  positionLabel,
  terms,
  pagePath,
  filterQuery,
  apiQuery,
  timeZone,
  filtered,
  emptyLabel
}: ChatTranscriptProps) {
  const [messages, setMessages] = useState(initial.messages);
  const [hasOlder, setHasOlder] = useState(initial.hasOlder);
  const [hasNewer, setHasNewer] = useState(initial.hasNewer);
  const [waiting, setWaiting] = useState<{ messages: ChatMessageView[]; overflow: boolean }>({
    messages: [],
    overflow: false
  });
  const [loading, setLoading] = useState<LoadKind | null>(null);
  const [failed, setFailed] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [tooltip] = useState(() => Tooltip.createHandle<string>());
  const topRef = useRef<HTMLDivElement>(null);
  const olderRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  const waitingRef = useRef(waiting);
  const atTopRef = useRef(anchorId === null);
  const followAfterRef = useRef(
    Math.max(initial.latestLoggedId, initial.messages[0]?.id ?? 0)
  );
  const keepInPlaceRef = useRef<{ id: number; top: number } | null>(null);
  const scrollToTopRef = useRef(false);
  const queueRef = useRef<LoadKind[]>([]);
  const drainingRef = useRef(false);
  const filterPlayerId = new URLSearchParams(filterQuery).get("player");

  const showMessages = useCallback((next: ChatMessageView[]) => {
    messagesRef.current = next;
    setMessages(next);
  }, []);

  const setWaitingMessages = useCallback(
    (next: { messages: ChatMessageView[]; overflow: boolean }) => {
      waitingRef.current = next;
      setWaiting(next);
    },
    []
  );

  const unknownMessages = useCallback((page: ChatTranscriptPage) => {
    const known = new Set(
      [...messagesRef.current, ...waitingRef.current.messages].map((message) => message.id)
    );
    return page.messages.filter((message) => !known.has(message.id));
  }, []);

  const addNewest = useCallback(
    (added: ChatMessageView[]) => {
      let next = [...added, ...messagesRef.current];
      if (next.length > MAX_SHOWN_MESSAGES) {
        next = next.slice(0, MAX_SHOWN_MESSAGES);
        setHasOlder(true);
      }
      showMessages(next);
    },
    [showMessages]
  );

  const followPast = useCallback((page: ChatTranscriptPage) => {
    followAfterRef.current = Math.max(
      followAfterRef.current,
      page.latestLoggedId,
      page.messages[0]?.id ?? 0
    );
  }, []);

  const loadLatest = useCallback(async () => {
    const page = await fetchPage(apiQuery, {});
    showMessages(page.messages);
    setHasOlder(page.hasOlder);
    setHasNewer(false);
    setWaitingMessages({ messages: [], overflow: false });
    followPast(page);
    scrollToTopRef.current = true;
  }, [apiQuery, followPast, setWaitingMessages, showMessages]);

  const loadOlder = useCallback(async () => {
    const oldest = messagesRef.current.at(-1);
    if (!oldest) {
      return;
    }

    const page = await fetchPage(apiQuery, { before: String(oldest.id) });
    showMessages([...messagesRef.current, ...unknownMessages(page)]);
    setHasOlder(page.hasOlder);
  }, [apiQuery, showMessages, unknownMessages]);

  const loadNewer = useCallback(async () => {
    const newest = messagesRef.current[0];
    const page = await fetchPage(apiQuery, { after: String(newest?.id ?? 0) });
    const kept = newest ? document.getElementById(`message-${newest.id}`) : null;
    keepInPlaceRef.current =
      newest && kept ? { id: newest.id, top: kept.getBoundingClientRect().top } : null;
    showMessages([...unknownMessages(page), ...messagesRef.current]);
    setHasNewer(page.hasNewer);
    if (!page.hasNewer) {
      followPast(page);
    }
  }, [apiQuery, followPast, showMessages, unknownMessages]);

  const follow = useCallback(async () => {
    const oldest = messagesRef.current.at(-1);
    const overlapFloor = oldest ? oldest.id - 1 : followAfterRef.current;
    const page = await fetchPage(apiQuery, {
      after: String(Math.max(overlapFloor, followAfterRef.current - FOLLOW_OVERLAP_IDS))
    });
    const added = unknownMessages(page);

    if (page.hasNewer) {
      if (atTopRef.current) {
        await loadLatest();
        return;
      }
      setWaitingMessages({ messages: [...added, ...waitingRef.current.messages], overflow: true });
      if (added.length > 0) {
        setAnnouncement(newMessageAnnouncement(added));
      }
      return;
    }

    followPast(page);
    if (added.length === 0) {
      return;
    }

    if (atTopRef.current && waitingRef.current.messages.length === 0) {
      addNewest(added);
    } else {
      setWaitingMessages({ messages: [...added, ...waitingRef.current.messages], overflow: false });
    }
    setAnnouncement(newMessageAnnouncement(added));
  }, [addNewest, apiQuery, followPast, loadLatest, setWaitingMessages, unknownMessages]);

  const loaders: Record<LoadKind, () => Promise<void>> = {
    older: loadOlder,
    newer: loadNewer,
    follow,
    latest: loadLatest
  };
  const loadersRef = useRef(loaders);
  useEffect(() => {
    loadersRef.current = loaders;
  });

  const drain = useCallback(async () => {
    if (drainingRef.current) {
      return;
    }

    drainingRef.current = true;
    try {
      for (let kind = queueRef.current.shift(); kind; kind = queueRef.current.shift()) {
        if (kind !== "follow") {
          setLoading(kind);
        }
        try {
          await loadersRef.current[kind]();
          if (kind !== "follow") {
            setFailed(false);
          }
        } catch {
          if (kind !== "follow") {
            queueRef.current = [];
            setFailed(true);
          }
        }
      }
    } finally {
      drainingRef.current = false;
      setLoading(null);
    }
  }, []);

  const request = useCallback(
    (kind: LoadKind) => {
      if (!queueRef.current.includes(kind)) {
        queueRef.current.push(kind);
      }
      void drain();
    },
    [drain]
  );

  const showWaiting = useCallback(() => {
    if (waitingRef.current.overflow) {
      request("latest");
      return;
    }

    addNewest(waitingRef.current.messages);
    setWaitingMessages({ messages: [], overflow: false });
  }, [addNewest, request, setWaitingMessages]);

  useEffect(() => {
    if (anchorId === null) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`message-${anchorId}`)?.scrollIntoView({ block: "center" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [anchorId]);

  useLayoutEffect(() => {
    const kept = keepInPlaceRef.current;
    keepInPlaceRef.current = null;
    if (kept) {
      const element = document.getElementById(`message-${kept.id}`);
      if (element) {
        window.scrollBy(0, element.getBoundingClientRect().top - kept.top);
      }
    } else if (scrollToTopRef.current) {
      scrollToTopRef.current = false;
      const top = topRef.current;
      if (top && top.getBoundingClientRect().top < 0) {
        top.scrollIntoView({ block: "start" });
      }
    }
  }, [messages]);

  useEffect(() => {
    const update = () => {
      const top = topRef.current;
      atTopRef.current = top !== null && top.getBoundingClientRect().top >= -TOP_SLACK_PX;
      if (atTopRef.current && waitingRef.current.messages.length > 0 && !waitingRef.current.overflow) {
        showWaiting();
      }
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [showWaiting]);

  useEffect(() => {
    if (hasNewer || waiting.overflow) {
      return;
    }

    const followIfVisible = () => {
      if (document.visibilityState === "visible") {
        request("follow");
      }
    };
    const timer = window.setInterval(followIfVisible, FOLLOW_INTERVAL_MS);
    document.addEventListener("visibilitychange", followIfVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", followIfVisible);
    };
  }, [hasNewer, request, waiting.overflow]);

  useEffect(() => {
    const older = hasOlder ? olderRef.current : null;
    if (!older || failed) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          request("older");
        }
      },
      { rootMargin: "0px 0px 600px 0px" }
    );
    observer.observe(older);

    return () => observer.disconnect();
  }, [hasOlder, failed, messages, request]);

  function loadInPlace(event: MouseEvent<HTMLAnchorElement>, kind: LoadKind) {
    event.preventDefault();
    request(kind);
  }

  function showWaitingAtTop() {
    scrollToTopRef.current = true;
    showWaiting();
  }

  const newest = messages[0];
  const oldest = messages.at(-1);
  const latestHref = chatHref(pagePath, filterQuery);
  const waitingCount = waiting.messages.length;

  return (
    <Tooltip.Provider delay={300}>
      <div>
        <div
          ref={topRef}
          className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400"
        >
          {hasNewer ? (
            <span>
              {positionLabel ?? "Earlier messages"}.{" "}
              {positionLabel !== null ? (
                <Link href={latestHref} className="font-semibold text-teal-200 hover:text-teal-100">
                  Back to the latest
                </Link>
              ) : (
                <a
                  href={latestHref}
                  onClick={(event) => loadInPlace(event, "latest")}
                  className="font-semibold text-teal-200 hover:text-teal-100"
                >
                  Back to the latest
                </a>
              )}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Live
            </span>
          )}
          <span>Times in {timeZone}</span>
        </div>

        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>

        {waitingCount > 0 || waiting.overflow ? (
          <button
            type="button"
            onClick={showWaitingAtTop}
            className="fixed left-1/2 top-10 z-20 -translate-x-1/2 rounded-full border border-teal-400/60 bg-teal-900/90 px-3 py-1 text-xs font-semibold text-slate-50 shadow-[0_8px_20px_rgba(0,0,0,0.45)] hover:bg-teal-800"
          >
            ↑{" "}
            {waiting.overflow
              ? `${waitingCount}+ new messages`
              : waitingCount === 1
                ? "1 new message"
                : `${waitingCount} new messages`}
          </button>
        ) : null}

        <div className="rounded-sm border border-slate-600/35 bg-slate-950/60 [overflow-anchor:none]">
          {hasNewer && newest ? (
            <div className="flex justify-center border-b border-slate-800/70 py-3">
              <a
                href={chatHref(pagePath, filterQuery, { after: String(newest.id) })}
                onClick={(event) => loadInPlace(event, "newer")}
                className={ui.buttonGhost}
              >
                {loading === "newer" ? "Loading..." : "Show newer messages"}
              </a>
            </div>
          ) : null}

          {messages.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-400">
              {emptyLabel}
              {hasNewer ? null : " New ones will appear here."}
            </p>
          ) : null}

          <ol aria-label="Chat messages" aria-busy={loading !== null}>
            {messages.map((message, index) => {
              const day = message.sentAt?.day ?? null;
              const newDay = day !== null && day !== messages[index - 1]?.sentAt?.day;
              const playerId = message.playerId === null ? null : String(message.playerId);

              return (
                <Fragment key={message.id}>
                  {newDay && message.sentAt ? <DaySeparator label={message.sentAt.dayLabel} /> : null}
                  <ChatMessageRow
                    message={message}
                    terms={terms}
                    anchored={anchorId === message.id}
                    playerFilterHref={
                      playerId !== null && playerId !== filterPlayerId
                        ? chatHref(pagePath, filterQuery, { player: playerId })
                        : null
                    }
                    tooltip={tooltip}
                  />
                </Fragment>
              );
            })}
          </ol>

          {hasOlder && oldest ? (
            <div ref={olderRef} className="flex justify-center border-t border-slate-800/70 py-3">
              <a
                href={chatHref(pagePath, filterQuery, { before: String(oldest.id) })}
                onClick={(event) => loadInPlace(event, "older")}
                className={ui.buttonGhost}
              >
                {loading === "older" ? "Loading..." : "Load older messages"}
              </a>
            </div>
          ) : messages.length > 0 ? (
            <p className="border-t border-slate-800/70 py-3 text-center text-[11px] uppercase tracking-wide text-slate-500">
              {filtered ? "No earlier matching messages" : "Start of the chat log"}
            </p>
          ) : null}
        </div>

        {failed ? (
          <p role="alert" className="mt-2 text-xs text-rose-200">
            Messages could not be loaded.{" "}
            <button
              type="button"
              onClick={() => setFailed(false)}
              className="font-semibold underline hover:text-rose-100"
            >
              Try again
            </button>
          </p>
        ) : null}

        <Tooltip.Root handle={tooltip}>
          {({ payload }) => (
            <Tooltip.Portal>
              <Tooltip.Positioner sideOffset={6} className="z-50">
                <Tooltip.Popup className="max-w-xs rounded-sm border border-slate-600/70 bg-slate-900 px-2 py-1 text-xs text-slate-100 shadow-[0_8px_20px_rgba(0,0,0,0.45)] transition-opacity duration-100 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0">
                  {payload}
                </Tooltip.Popup>
              </Tooltip.Positioner>
            </Tooltip.Portal>
          )}
        </Tooltip.Root>
      </div>
    </Tooltip.Provider>
  );
}
