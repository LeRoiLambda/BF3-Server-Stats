"use client";

import { clsx } from "clsx";
import Image from "next/image";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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
  // The chat log's highest id when the page was read: new messages come after
  // it, however far back the last matching message is.
  latestLoggedId: number;
};

// Where the page opened the log: at a linked message, or at a time whose first
// message is marked (null when none was sent since).
export type ChatTranscriptAnchor =
  | { kind: "message"; messageId: number }
  | { kind: "time"; messageId: number | null; label: string };

type ChatTranscriptProps = Readonly<{
  initial: ChatTranscriptPage;
  anchor: ChatTranscriptAnchor | null;
  // Whether the page's URL places it anywhere but at the latest messages.
  positioned: boolean;
  terms: string[];
  // The page's path and filter query; apiQuery adds the server for /api/chat.
  pagePath: string;
  filterQuery: string;
  apiQuery: string;
  timeZone: string;
  filtered: boolean;
  emptyLabel: string;
}>;

type LoadKind = "older" | "newer" | "follow" | "latest";

// New messages are checked for this often while the latest ones are shown.
const FOLLOW_INTERVAL_MS = 10_000;
// Checks for new messages start up to this many ids before the last one seen,
// in case a lower id is committed after a higher one.
const FOLLOW_OVERLAP_IDS = 20;
// Scrolled this close to the bottom counts as reading the latest messages.
const BOTTOM_SLACK_PX = 48;
// While following, older messages beyond this many are dropped from the page.
const MAX_FOLLOWED_MESSAGES = 500;

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

function JumpMarker({ label }: Readonly<{ label: string }>) {
  return (
    <li
      data-anchor=""
      className="flex items-center gap-3 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-teal-200 sm:px-4"
    >
      <span aria-hidden="true" className="h-px flex-1 bg-teal-400/45" />
      {label}
      <span aria-hidden="true" className="h-px flex-1 bg-teal-400/45" />
    </li>
  );
}

function Speaker({ message }: Readonly<{ message: ChatMessageView }>) {
  const name = (
    <>
      {message.flag ? (
        <Image
          src={message.flag.src}
          alt={message.flag.label}
          title={message.flag.label}
          width={18}
          height={12}
          className="mr-1.5 inline-block h-3 w-[18px] rounded-[2px] border border-slate-700/80 object-cover align-[-1px]"
        />
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
}>;

function ChatMessageRow({ message, terms, anchored, playerFilterHref }: ChatMessageRowProps) {
  // Narrow screens run the time, channel, speaker and text together and wrap
  // them; wider ones give the time a column of its own.
  return (
    <li
      id={`message-${message.id}`}
      data-anchor={anchored ? "" : undefined}
      className={clsx(
        "group/message relative py-1 pl-3 pr-9 text-sm leading-6 sm:flex sm:gap-3 sm:px-4",
        anchored
          ? "bg-teal-400/10 shadow-[inset_3px_0_0_0_rgba(45,212,191,0.75)]"
          : "hover:bg-slate-800/35"
      )}
    >
      <Link
        href={message.contextHref}
        title={message.sentAt ? `${message.sentAt.label} · show in conversation` : "Show in conversation"}
        className="mr-1 font-mono text-[11px] tabular-nums text-slate-500 hover:text-teal-200 sm:mr-0 sm:w-[4.25rem] sm:shrink-0"
      >
        {message.sentAt ? (
          <time dateTime={message.sentAt.iso}>{message.sentAt.clock}</time>
        ) : (
          "--:--:--"
        )}
      </Link>{" "}
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
        <Speaker message={message} />{" "}
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
        <Link
          href={playerFilterHref}
          aria-label={`Show only messages from ${message.speaker}`}
          title={`Only messages from ${message.speaker}`}
          className="absolute right-2 top-1.5 rounded-sm p-1 text-slate-500 opacity-0 transition-opacity hover:bg-slate-800 hover:text-slate-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200/70 group-hover/message:opacity-100 sm:static sm:mt-1 sm:h-fit [@media(hover:none)]:opacity-100"
        >
          <FilterIcon />
        </Link>
      ) : null}
    </li>
  );
}

function newMessageAnnouncement(added: ChatMessageView[]): string {
  const last = added[added.length - 1];
  const from = `${last.speaker || "Unknown"}: ${last.text}`;
  return added.length === 1
    ? `New message from ${from}`
    : `${added.length} new messages, the last from ${from}`;
}

// The chat log as a conversation, oldest message first. It opens at the
// latest messages, or at the anchor, and loads older or newer ones as the
// reader scrolls to either end. While the latest messages are shown it
// checks for new ones and adds them, following them down when the reader is
// at the bottom. Loads run one at a time, in the order they were asked for.
export function ChatTranscript({
  initial,
  anchor,
  positioned,
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
  const [loading, setLoading] = useState<LoadKind | null>(null);
  const [failed, setFailed] = useState(false);
  const [unseen, setUnseen] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  // The first message sent since a "jump to" time, once one is known.
  const [timeAnchorId, setTimeAnchorId] = useState(
    anchor?.kind === "time" ? anchor.messageId : null
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const olderRef = useRef<HTMLDivElement>(null);
  const newerRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  const timeAnchorIdRef = useRef(timeAnchorId);
  const atBottomRef = useRef(anchor === null);
  // New messages are asked for after this id.
  const followAfterRef = useRef(
    Math.max(initial.latestLoggedId, initial.messages.at(-1)?.id ?? 0)
  );
  // Set before messages are added: keep this distance to the bottom (older
  // messages above), or scroll to the bottom (followed messages below).
  const keepBottomOffsetRef = useRef<number | null>(null);
  const scrollToEndRef = useRef(false);
  const queueRef = useRef<LoadKind[]>([]);
  const drainingRef = useRef(false);
  const filterPlayerId = new URLSearchParams(filterQuery).get("player");

  const showMessages = useCallback((next: ChatMessageView[]) => {
    messagesRef.current = next;
    setMessages(next);
  }, []);

  const markTimeAnchor = useCallback((messageId: number) => {
    timeAnchorIdRef.current = messageId;
    setTimeAnchorId(messageId);
  }, []);

  const unknownMessages = useCallback((page: ChatTranscriptPage) => {
    const known = new Set(messagesRef.current.map((message) => message.id));
    return page.messages.filter((message) => !known.has(message.id));
  }, []);

  // Everything up to the page's newest message, or the log's, has been read.
  const followPast = useCallback((page: ChatTranscriptPage) => {
    followAfterRef.current = Math.max(
      followAfterRef.current,
      page.latestLoggedId,
      page.messages.at(-1)?.id ?? 0
    );
  }, []);

  const loadLatest = useCallback(async () => {
    const page = await fetchPage(apiQuery, {});
    keepBottomOffsetRef.current = null;
    scrollToEndRef.current = true;
    showMessages(page.messages);
    setHasOlder(page.hasOlder);
    setHasNewer(false);
    setUnseen(0);
    followPast(page);
  }, [apiQuery, followPast, showMessages]);

  const loadOlder = useCallback(async () => {
    const first = messagesRef.current[0];
    if (!first) {
      return;
    }

    const page = await fetchPage(apiQuery, { before: String(first.id) });
    const container = scrollRef.current;
    keepBottomOffsetRef.current = container ? container.scrollHeight - container.scrollTop : null;
    showMessages([...unknownMessages(page), ...messagesRef.current]);
    setHasOlder(page.hasOlder);
  }, [apiQuery, showMessages, unknownMessages]);

  const loadNewer = useCallback(async () => {
    const last = messagesRef.current.at(-1);
    const page = await fetchPage(apiQuery, { after: String(last?.id ?? 0) });
    showMessages([...messagesRef.current, ...unknownMessages(page)]);
    setHasNewer(page.hasNewer);
    if (!page.hasNewer) {
      followPast(page);
    }
  }, [apiQuery, followPast, showMessages, unknownMessages]);

  const follow = useCallback(async () => {
    // The overlap stays within the shown messages: an empty transcript has
    // nothing to fill in, so it asks only for what is new.
    const first = messagesRef.current[0];
    const overlapFloor = first ? first.id - 1 : followAfterRef.current;
    const page = await fetchPage(apiQuery, {
      after: String(Math.max(overlapFloor, followAfterRef.current - FOLLOW_OVERLAP_IDS))
    });
    const added = unknownMessages(page);
    if (added.length > 0 && timeAnchorIdRef.current === null && anchor?.kind === "time") {
      markTimeAnchor(added[0].id);
    }

    // More arrived than one load holds: a reader at the bottom moves on to the
    // latest messages; one reading further up gets the rest on scrolling down.
    if (page.hasNewer) {
      if (atBottomRef.current) {
        await loadLatest();
        return;
      }
      showMessages([...messagesRef.current, ...added]);
      setHasNewer(true);
      setUnseen((count) => count + added.length);
      return;
    }

    followPast(page);
    if (added.length === 0) {
      return;
    }

    let next = [...messagesRef.current, ...added];
    if (atBottomRef.current) {
      scrollToEndRef.current = true;
      if (next.length > MAX_FOLLOWED_MESSAGES) {
        next = next.slice(next.length - MAX_FOLLOWED_MESSAGES);
        setHasOlder(true);
      }
    } else {
      setUnseen((count) => count + added.length);
    }
    showMessages(next);
    setAnnouncement(newMessageAnnouncement(added));
  }, [anchor, apiQuery, followPast, loadLatest, markTimeAnchor, showMessages, unknownMessages]);

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

  // Runs the queued loads one after another. A failed load stops the queue
  // until the reader tries again; a failed check for new messages is retried
  // at the next one.
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

  // Opens at the anchor, centered, or else at the bottom.
  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }

    const target = container.querySelector<HTMLElement>("[data-anchor]");
    container.scrollTop = target
      ? target.offsetTop - (container.clientHeight - target.offsetHeight) / 2
      : container.scrollHeight;
  }, []);

  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }

    if (keepBottomOffsetRef.current !== null) {
      container.scrollTop = container.scrollHeight - keepBottomOffsetRef.current;
      keepBottomOffsetRef.current = null;
    } else if (scrollToEndRef.current) {
      container.scrollTop = container.scrollHeight;
      scrollToEndRef.current = false;
    }
  }, [messages]);

  useEffect(() => {
    if (hasNewer) {
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
  }, [hasNewer, request]);

  // Loads more when either end scrolls near. Observing again after each load
  // keeps loading while an end stays in view, as in a short log.
  useEffect(() => {
    const root = scrollRef.current;
    const older = hasOlder ? olderRef.current : null;
    const newer = hasNewer ? newerRef.current : null;
    if (!root || failed || (!older && !newer)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            request(entry.target === older ? "older" : "newer");
          }
        }
      },
      { root, rootMargin: "240px 0px" }
    );
    for (const target of [older, newer]) {
      if (target) {
        observer.observe(target);
      }
    }

    return () => observer.disconnect();
  }, [hasOlder, hasNewer, failed, messages, request]);

  function handleScroll() {
    const container = scrollRef.current;
    if (!container) {
      return;
    }

    atBottomRef.current =
      container.scrollHeight - container.scrollTop - container.clientHeight < BOTTOM_SLACK_PX;
    if (atBottomRef.current) {
      setUnseen(0);
    }
  }

  function scrollToEnd() {
    const container = scrollRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
    setUnseen(0);
  }

  function loadInPlace(event: MouseEvent<HTMLAnchorElement>, kind: LoadKind) {
    event.preventDefault();
    request(kind);
  }

  const first = messages[0];
  const last = messages.at(-1);
  const latestHref = chatHref(pagePath, filterQuery);

  return (
    <div className="relative">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-slate-400">
        {hasNewer ? (
          <span>
            Showing earlier messages.{" "}
            {positioned ? (
              <Link href={latestHref} className="font-semibold text-teal-200 hover:text-teal-100">
                Jump to the latest
              </Link>
            ) : (
              <a
                href={latestHref}
                onClick={(event) => loadInPlace(event, "latest")}
                className="font-semibold text-teal-200 hover:text-teal-100"
              >
                Jump to the latest
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

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        role="region"
        aria-label="Chat messages"
        aria-busy={loading !== null}
        tabIndex={0}
        className="relative h-[min(70vh,44rem)] overflow-y-auto rounded-sm border border-slate-600/35 bg-slate-950/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200/50"
      >
        {hasOlder && first ? (
          <div ref={olderRef} className="flex justify-center py-3">
            <a
              href={chatHref(pagePath, filterQuery, { before: String(first.id) })}
              onClick={(event) => loadInPlace(event, "older")}
              className={ui.buttonGhost}
            >
              {loading === "older" ? "Loading..." : "Load older messages"}
            </a>
          </div>
        ) : messages.length > 0 ? (
          <p className="py-3 text-center text-[11px] uppercase tracking-wide text-slate-500">
            {filtered ? "No earlier matching messages" : "Start of the chat log"}
          </p>
        ) : null}

        {messages.length === 0 && anchor?.kind !== "time" ? (
          <p className="px-4 py-10 text-center text-sm text-slate-400">
            {emptyLabel}
            {hasNewer ? null : " New ones will appear here."}
          </p>
        ) : null}

        <ol className="pb-2">
          {messages.map((message, index) => {
            const day = message.sentAt?.day ?? null;
            const newDay = day !== null && day !== messages[index - 1]?.sentAt?.day;
            const playerId = message.playerId === null ? null : String(message.playerId);

            return (
              <Fragment key={message.id}>
                {newDay && message.sentAt ? <DaySeparator label={message.sentAt.dayLabel} /> : null}
                {anchor?.kind === "time" && timeAnchorId === message.id ? (
                  <JumpMarker label={anchor.label} />
                ) : null}
                <ChatMessageRow
                  message={message}
                  terms={terms}
                  anchored={anchor?.kind === "message" && anchor.messageId === message.id}
                  playerFilterHref={
                    playerId !== null && playerId !== filterPlayerId
                      ? chatHref(pagePath, filterQuery, { player: playerId })
                      : null
                  }
                />
              </Fragment>
            );
          })}
          {anchor?.kind === "time" && timeAnchorId === null ? (
            <JumpMarker label={`No messages since ${anchor.label}`} />
          ) : null}
        </ol>

        {hasNewer && last ? (
          <div ref={newerRef} className="flex justify-center py-3">
            <a
              href={chatHref(pagePath, filterQuery, { after: String(last.id) })}
              onClick={(event) => loadInPlace(event, "newer")}
              className={ui.buttonGhost}
            >
              {loading === "newer" ? "Loading..." : "Load newer messages"}
            </a>
          </div>
        ) : null}
      </div>

      {unseen > 0 ? (
        <button
          type="button"
          onClick={scrollToEnd}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-teal-400/60 bg-teal-900/90 px-3 py-1 text-xs font-semibold text-slate-50 shadow-[0_8px_20px_rgba(0,0,0,0.45)] hover:bg-teal-800"
        >
          {unseen === 1 ? "1 new message" : `${unseen} new messages`}
        </button>
      ) : null}

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
    </div>
  );
}
