"use client";

import type { FormEvent } from "react";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PlayerAutocompleteInput,
  type PlayerAutocompleteSuggestion
} from "@/components/search/player-autocomplete-input";

type PlayerProfileSearchFormProps = {
  serverId: number | null;
  inputClassName: string;
  inputWrapperClassName?: string;
  buttonClassName: string;
};

type SuggestResponse = {
  players?: PlayerAutocompleteSuggestion[];
};

function playerHref(playerId: number, serverId: number | null): string {
  const query = serverId !== null ? `?sid=${serverId}` : "";
  return `/players/${playerId}${query}`;
}

function sameName(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export function PlayerProfileSearchForm({
  serverId,
  inputClassName,
  inputWrapperClassName,
  buttonClassName
}: PlayerProfileSearchFormProps) {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<PlayerAutocompleteSuggestion[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const navigateToPlayer = useCallback(
    (player: PlayerAutocompleteSuggestion) => {
      if (!player.playerId) {
        return;
      }

      setMessage(null);
      router.push(playerHref(player.playerId, serverId));
    },
    [router, serverId]
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
      navigateToPlayer(localMatch);
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
      navigateToPlayer(target);
      return;
    }

    setMessage(players.length > 1 ? "Choose a suggested player." : "No matching player.");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full min-w-0 items-center gap-2 lg:w-auto"
    >
      <PlayerAutocompleteInput
        name="name"
        placeholder="Player name..."
        serverId={serverId}
        onSuggestionsChange={handleSuggestionsChange}
        onSuggestionSelect={navigateToPlayer}
        className={inputClassName}
        wrapperClassName={inputWrapperClassName}
      />
      <button type="submit" className={buttonClassName}>
        Search
      </button>
      {message ? (
        <span aria-live="polite" className="sr-only">
          {message}
        </span>
      ) : null}
    </form>
  );
}
