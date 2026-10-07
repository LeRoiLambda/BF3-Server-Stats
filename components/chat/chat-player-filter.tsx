"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { chatHref } from "@/components/chat/chat-href";
import { ui } from "@/components/layout/stats-ui";
import type { PlayerAutocompleteSuggestion } from "@/components/search/player-autocomplete-input";
import { PlayerPickerForm } from "@/components/search/player-picker-form";

type ChatPlayerFilterProps = Readonly<{
  pagePath: string;
  filterQuery: string;
}>;

export function ChatPlayerFilter({ pagePath, filterQuery }: ChatPlayerFilterProps) {
  const router = useRouter();
  const showPlayer = useCallback(
    (player: PlayerAutocompleteSuggestion) => {
      router.push(chatHref(pagePath, filterQuery, { player: String(player.playerId) }));
    },
    [router, pagePath, filterQuery]
  );

  return (
    <PlayerPickerForm
      serverId={null}
      placeholder="From player..."
      className="w-full"
      inputClassName={ui.input}
      inputWrapperClassName="w-full"
      onPick={showPlayer}
    />
  );
}
