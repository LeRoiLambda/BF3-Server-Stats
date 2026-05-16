"use client";

import { useEffect, useId, useState } from "react";
import { clsx } from "clsx";
import {
  SuggestionMenu,
  type SuggestionMenuItem
} from "@/components/search/suggestion-menu";
import {
  disciplineKindFromBanStatus,
  playerDisciplineLabel
} from "@/components/stats/player-discipline-badge";

export type PlayerAutocompleteSuggestion = {
  playerId: number;
  soldierName: string;
  countryCode?: string | null;
  score?: number;
  kills?: number;
  kdr?: number;
  banStatus?: "active" | "expired" | null;
};

type PlayerAutocompleteInputProps = {
  name: string;
  placeholder: string;
  className?: string;
  wrapperClassName?: string;
  defaultValue?: string;
  serverId?: number | null;
  onSuggestionsChange?: (suggestions: PlayerAutocompleteSuggestion[]) => void;
  onSuggestionSelect?: (suggestion: PlayerAutocompleteSuggestion) => void;
};

type SuggestResponse = {
  suggestions: string[];
  players?: PlayerAutocompleteSuggestion[];
};

type PlayerSuggestionMenuItem = SuggestionMenuItem & {
  suggestion: PlayerAutocompleteSuggestion;
};

function playerSuggestionDetail(suggestion: PlayerAutocompleteSuggestion): string | null {
  const parts: string[] = [];

  if (typeof suggestion.score === "number") {
    parts.push(`Score ${suggestion.score}`);
  }

  if (typeof suggestion.kills === "number") {
    parts.push(`Kills ${suggestion.kills}`);
  }

  if (typeof suggestion.kdr === "number") {
    parts.push(`KDR ${suggestion.kdr.toFixed(2)}`);
  }

  if (suggestion.banStatus) {
    parts.push(
      playerDisciplineLabel(disciplineKindFromBanStatus(suggestion.banStatus))
    );
  }

  return parts.length > 0 ? parts.join(" / ") : null;
}

export function PlayerAutocompleteInput({
  name,
  placeholder,
  className,
  wrapperClassName,
  defaultValue = "",
  serverId = null,
  onSuggestionsChange,
  onSuggestionSelect
}: PlayerAutocompleteInputProps) {
  const menuId = useId();
  const [value, setValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<PlayerAutocompleteSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [suggestEnabled, setSuggestEnabled] = useState(false);

  useEffect(() => {
    setValue(defaultValue);
    setSuggestions([]);
    setOpen(false);
    setSuggestEnabled(false);
    onSuggestionsChange?.([]);
  }, [defaultValue, onSuggestionsChange]);

  useEffect(() => {
    const query = value.trim();
    if (!suggestEnabled || query.length < 2) {
      setSuggestions([]);
      setOpen(false);
      onSuggestionsChange?.([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        params.set("term", query);
        if (serverId !== null && Number.isFinite(serverId)) {
          params.set("sid", String(serverId));
        }

        const response = await fetch(`/api/players/suggest?${params.toString()}`, {
          signal: controller.signal
        });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as SuggestResponse;
        const nextSuggestions =
          payload.players ??
          (payload.suggestions ?? []).map((entry) => ({
            playerId: 0,
            soldierName: entry
          }));
        setSuggestions(nextSuggestions);
        setOpen(nextSuggestions.length > 0);
        onSuggestionsChange?.(nextSuggestions);
      } catch {
        setSuggestions([]);
        setOpen(false);
        onSuggestionsChange?.([]);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [value, serverId, onSuggestionsChange, suggestEnabled]);

  function selectSuggestion(suggestion: PlayerAutocompleteSuggestion) {
    setValue(suggestion.soldierName);
    setOpen(false);
    setSuggestEnabled(false);
    onSuggestionSelect?.(suggestion);
  }

  const suggestionItems: PlayerSuggestionMenuItem[] = suggestions.map(
    (suggestion, index) => ({
      id: `${suggestion.playerId}:${suggestion.soldierName}:${index}`,
      badge: "Player",
      label: suggestion.soldierName,
      detail: playerSuggestionDetail(suggestion),
      suggestion
    })
  );

  return (
    <div
      className={clsx("relative min-w-0", wrapperClassName)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
    >
      <input
        type="text"
        name={name}
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
        placeholder={placeholder}
        autoComplete="off"
        aria-expanded={open}
        aria-controls={menuId}
        className={className}
      />
      {open ? (
        <SuggestionMenu
          id={menuId}
          items={suggestionItems}
          onSelect={(item) => selectSuggestion(item.suggestion)}
        />
      ) : null}
    </div>
  );
}
