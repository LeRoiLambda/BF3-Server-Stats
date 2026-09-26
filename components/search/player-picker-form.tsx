"use client";

import type { FormEvent } from "react";
import { useCallback, useState } from "react";
import {
  PlayerAutocompleteInput,
  type PlayerAutocompleteSuggestion
} from "@/components/search/player-autocomplete-input";

type PlayerPickerFormProps = {
  serverId: number | null;
  placeholder: string;
  className?: string;
  inputClassName: string;
  inputWrapperClassName?: string;
  // Without a button, Enter submits the typed name.
  buttonLabel?: string;
  buttonClassName?: string;
  onPick: (player: PlayerAutocompleteSuggestion) => void;
};

type SuggestResponse = {
  players?: PlayerAutocompleteSuggestion[];
};

function sameName(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

// A player name field with suggestions. Choosing a suggestion, or submitting
// a name that matches one player, picks that player.
export function PlayerPickerForm({
  serverId,
  placeholder,
  className,
  inputClassName,
  inputWrapperClassName,
  buttonLabel,
  buttonClassName,
  onPick
}: PlayerPickerFormProps) {
  const [suggestions, setSuggestions] = useState<PlayerAutocompleteSuggestion[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const pick = useCallback(
    (player: PlayerAutocompleteSuggestion) => {
      if (!player.playerId) {
        return;
      }

      setMessage(null);
      onPick(player);
    },
    [onPick]
  );

  const handleSuggestionsChange = useCallback(
    (nextSuggestions: PlayerAutocompleteSuggestion[]) => {
      setSuggestions(nextSuggestions);
      setMessage(null);
    },
    []
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    if (!name) {
      return;
    }

    const localMatch = suggestions.find((player) => sameName(player.soldierName, name));
    if (localMatch?.playerId) {
      pick(localMatch);
      return;
    }

    const params = new URLSearchParams({
      term: name,
      limit: "10"
    });
    if (serverId !== null) {
      params.set("sid", String(serverId));
    }

    const response = await fetch(`/api/players/suggest?${params.toString()}`);
    if (!response.ok) {
      setMessage("Player lookup failed.");
      return;
    }

    const payload = (await response.json()) as SuggestResponse;
    const players = payload.players ?? [];
    const exactMatch = players.find((player) => sameName(player.soldierName, name));
    const target = exactMatch ?? (players.length === 1 ? players[0] : null);

    if (target) {
      pick(target);
      return;
    }

    setMessage(players.length > 1 ? "Choose a suggested player." : "No matching player.");
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <PlayerAutocompleteInput
        name="name"
        placeholder={placeholder}
        serverId={serverId}
        onSuggestionsChange={handleSuggestionsChange}
        onSuggestionSelect={pick}
        className={inputClassName}
        wrapperClassName={inputWrapperClassName}
      />
      {buttonLabel ? (
        <button type="submit" className={buttonClassName}>
          {buttonLabel}
        </button>
      ) : null}
      {message ? (
        <span aria-live="polite" className="sr-only">
          {message}
        </span>
      ) : null}
    </form>
  );
}
