"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type RouteAutoRefreshProps = {
  intervalMs: number;
};

export function RouteAutoRefresh({ intervalMs }: RouteAutoRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setInterval(() => {
      router.refresh();
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [intervalMs, router]);

  return null;
}
