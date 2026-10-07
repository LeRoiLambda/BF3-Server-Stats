"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { PlayerAutocompleteSuggestion } from "@/components/search/player-autocomplete-input";
import { PlayerPickerForm } from "@/components/search/player-picker-form";

type PlayerProfileSearchFormProps = {
  serverId: number | null;
  inputClassName: string;
  inputWrapperClassName?: string;
  buttonClassName: string;
};

function playerHref(playerId: number, serverId: number | null): string {
  const query = serverId !== null ? `?sid=${serverId}` : "";
  return `/players/${playerId}${query}`;
}

export function PlayerProfileSearchForm({
  serverId,
  inputClassName,
  inputWrapperClassName,
  buttonClassName
}: PlayerProfileSearchFormProps) {
  const router = useRouter();
  const openProfile = useCallback(
    (player: PlayerAutocompleteSuggestion) => {
      router.push(playerHref(player.playerId, serverId));
    },
    [router, serverId]
  );

  return (
    <PlayerPickerForm
      serverId={serverId}
      placeholder="Player name..."
      buttonLabel="Search"
      className="flex w-full min-w-0 items-center gap-2 lg:w-auto"
      inputClassName={inputClassName}
      inputWrapperClassName={inputWrapperClassName}
      buttonClassName={buttonClassName}
      onPick={openProfile}
    />
  );
}
