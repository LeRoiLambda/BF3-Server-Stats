"use client";

import { RouteAutoRefresh } from "@/components/stats/route-auto-refresh";

type ChatAutoRefreshProps = {
  intervalMs?: number;
};

export function ChatAutoRefresh({ intervalMs = 60000 }: ChatAutoRefreshProps) {
  return <RouteAutoRefresh intervalMs={intervalMs} />;
}
