"use client";

import { Autocomplete } from "@base-ui/react/autocomplete";
import { clsx } from "clsx";
import { useEffect, useState } from "react";
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
  label: string;
  className?: string;
  wrapperClassName?: string;
  defaultValue?: string;
  serverId?: number | null;
  pickOnEnter?: boolean;
  submitOnPick?: boolean;
  onSuggestionsChange?: (suggestions: PlayerAutocompleteSuggestion[]) => void;
  onSuggestionSelect?: (suggestion: PlayerAutocompleteSuggestion) => void;
};

type SuggestResponse = {
  players?: PlayerAutocompleteSuggestion[];
};

function suggestionDetail(suggestion: PlayerAutocompleteSuggestion): string | null {
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
    parts.push(playerDisciplineLabel(disciplineKindFromBanStatus(suggestion.banStatus)));
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function PlayerAutocompleteInput({
  name,
  placeholder,
  label,
  className,
  wrapperClassName,
  defaultValue = "",
  serverId = null,
  pickOnEnter = false,
  submitOnPick = false,
  onSuggestionsChange,
  onSuggestionSelect
}: PlayerAutocompleteInputProps) {
  const [value, setValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<PlayerAutocompleteSuggestion[]>([]);
  const [typed, setTyped] = useState(false);

  useEffect(() => {
    setValue(defaultValue);
    setTyped(false);
  }, [defaultValue]);

  useEffect(() => {
    const query = value.trim();
    if (!typed || query.length < 2) {
      setSuggestions([]);
      onSuggestionsChange?.([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ term: query });
        if (serverId !== null) {
          params.set("sid", String(serverId));
        }
        const response = await fetch(`/api/players/suggest?${params}`, {
          signal: controller.signal
        });
        if (!response.ok) {
          return;
        }
        const next = ((await response.json()) as SuggestResponse).players ?? [];
        setSuggestions(next);
        onSuggestionsChange?.(next);
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([]);
          onSuggestionsChange?.([]);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [value, serverId, typed, onSuggestionsChange]);

  return (
    <Autocomplete.Root
      items={suggestions}
      value={value}
      filter={null}
      autoHighlight={pickOnEnter ? "always" : false}
      submitOnItemClick={submitOnPick}
      itemToStringValue={(item: PlayerAutocompleteSuggestion) => item.soldierName}
      onValueChange={(next, details) => {
        setValue(next);
        if (details.reason !== "item-press") {
          setTyped(true);
          return;
        }

        setTyped(false);
        const picked = suggestions.find((suggestion) => suggestion.soldierName === next);
        if (picked) {
          onSuggestionSelect?.(picked);
        }
      }}
    >
      <div className={clsx("relative min-w-0", wrapperClassName)}>
        <Autocomplete.Input
          name={name}
          placeholder={placeholder}
          aria-label={label}
          className={className}
        />
      </div>
      <Autocomplete.Portal hidden={suggestions.length === 0}>
        <Autocomplete.Positioner sideOffset={6} align="start" className="z-40">
          <Autocomplete.Popup className="w-[var(--anchor-width)] min-w-[16rem] max-w-[var(--available-width)] overflow-hidden rounded-sm border border-slate-600/70 bg-slate-950 shadow-[0_12px_30px_rgba(0,0,0,0.5)] transition-opacity duration-100 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0">
            <Autocomplete.List className="max-h-[min(18rem,var(--available-height))] overflow-y-auto overscroll-contain py-1">
              {(suggestion: PlayerAutocompleteSuggestion) => {
                const detail = suggestionDetail(suggestion);
                return (
                  <Autocomplete.Item
                    key={`${suggestion.playerId}:${suggestion.soldierName}`}
                    value={suggestion}
                    className="flex cursor-default select-none flex-col px-3 py-2 text-sm text-slate-100 outline-none data-[highlighted]:bg-teal-900/50"
                  >
                    <span className="truncate font-medium">{suggestion.soldierName}</span>
                    {detail ? (
                      <span className="mt-0.5 truncate text-xs text-slate-400">{detail}</span>
                    ) : null}
                  </Autocomplete.Item>
                );
              }}
            </Autocomplete.List>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete.Root>
  );
}
