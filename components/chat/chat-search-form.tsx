"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ui } from "@/components/layout/stats-ui";
import {
  SuggestionMenu,
  type SuggestionMenuItem
} from "@/components/search/suggestion-menu";

type ChatSearchSuggestion = {
  kind: "date" | "player" | "message";
  value: string;
  label: string;
  detail: string | null;
};

type ChatSuggestResponse = {
  suggestions?: ChatSearchSuggestion[];
};

type ChatSuggestionMenuItem = SuggestionMenuItem & {
  suggestion: ChatSearchSuggestion;
};

type ChatSearchFormProps = Readonly<{
  basePath: string;
  clearHref: string;
  defaultValue: string;
  sort: string;
  order: string;
  serverId?: number | null;
}>;

const KIND_LABELS: Record<ChatSearchSuggestion["kind"], string> = {
  date: "Date",
  player: "Player",
  message: "Message"
};

function buildSearchHref(
  basePath: string,
  sort: string,
  order: string,
  query: string
): string {
  const params = new URLSearchParams();
  params.set("sort", sort);
  params.set("order", order);

  const trimmedQuery = query.trim();
  if (trimmedQuery) {
    params.set("q", trimmedQuery);
  }

  return `${basePath}?${params.toString()}`;
}

export function ChatSearchForm({
  basePath,
  clearHref,
  defaultValue,
  sort,
  order,
  serverId = null
}: ChatSearchFormProps) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<ChatSearchSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [suggestEnabled, setSuggestEnabled] = useState(false);
  const latestQueryRef = useRef("");

  useEffect(() => {
    setValue(defaultValue);
    setSuggestions([]);
    setOpen(false);
    setSuggestEnabled(false);
  }, [defaultValue]);

  useEffect(() => {
    const query = value.trim();
    latestQueryRef.current = query;

    if (!suggestEnabled || query.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const params = new URLSearchParams();
      params.set("term", query);
      params.set("limit", "8");
      if (serverId !== null && Number.isFinite(serverId)) {
        params.set("sid", String(serverId));
      }

      try {
        const response = await fetch(`/api/search/chat?${params.toString()}`, {
          signal: controller.signal
        });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as ChatSuggestResponse;
        if (latestQueryRef.current !== query) {
          return;
        }

        const nextSuggestions = payload.suggestions ?? [];
        setSuggestions(nextSuggestions);
        setOpen(nextSuggestions.length > 0);
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([]);
          setOpen(false);
        }
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [value, serverId, suggestEnabled]);

  function applySuggestion(suggestion: ChatSearchSuggestion) {
    setValue(suggestion.value);
    setOpen(false);
    setSuggestEnabled(false);
    router.push(buildSearchHref(basePath, sort, order, suggestion.value));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOpen(false);
    setSuggestEnabled(false);
    router.push(buildSearchHref(basePath, sort, order, value));
  }

  const suggestionItems: ChatSuggestionMenuItem[] = suggestions.map(
    (suggestion, index) => ({
      id: `${suggestion.kind}:${suggestion.value}:${index}`,
      badge: KIND_LABELS[suggestion.kind],
      label: suggestion.label,
      detail: suggestion.detail,
      suggestion
    })
  );

  return (
    <form
      action={basePath}
      method="get"
      onSubmit={handleSubmit}
      className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start"
    >
      <div
        className="relative min-w-0 flex-1 sm:max-w-md"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setOpen(false);
          }
        }}
      >
        <input
          type="text"
          name="q"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setSuggestEnabled(true);
          }}
          onFocus={() => {
            if (value.trim().length >= 2) {
              setSuggestEnabled(true);
              setOpen(suggestions.length > 0);
            }
          }}
          placeholder="Search chat..."
          autoComplete="off"
          aria-expanded={open}
          aria-controls="chat-search-suggestions"
          className={ui.input}
        />
        {open ? (
          <SuggestionMenu
            id="chat-search-suggestions"
            items={suggestionItems}
            onSelect={(item) => applySuggestion(item.suggestion)}
          />
        ) : null}
      </div>
      <input type="hidden" name="sort" value={sort} />
      <input type="hidden" name="order" value={order} />
      <div className="flex shrink-0 gap-2">
        <button type="submit" className={ui.buttonPrimary}>
          Search
        </button>
        {defaultValue ? (
          <Link href={clearHref} className={ui.buttonGhost}>
            Clear
          </Link>
        ) : null}
      </div>
    </form>
  );
}
