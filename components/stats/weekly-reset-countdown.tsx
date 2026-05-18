"use client";

import { useEffect, useMemo, useState } from "react";

type WeeklyResetCountdownProps = Readonly<{
  resetAt: string;
  initialNow: number;
}>;

function formatResetCountdown(remainingMs: number): string {
  if (!Number.isFinite(remainingMs)) {
    return "Reset pending";
  }

  if (remainingMs <= 0) {
    return "Resetting now";
  }

  const totalMinutes = Math.max(1, Math.ceil(remainingMs / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return hours > 0 ? `Resets in ${days}d ${hours}h` : `Resets in ${days}d`;
  }

  if (hours > 0) {
    return minutes > 0 ? `Resets in ${hours}h ${minutes}m` : `Resets in ${hours}h`;
  }

  return `Resets in ${minutes}m`;
}

export function WeeklyResetCountdown({
  resetAt,
  initialNow
}: WeeklyResetCountdownProps) {
  const resetAtMs = useMemo(() => Date.parse(resetAt), [resetAt]);
  const [now, setNow] = useState(initialNow);

  useEffect(() => {
    setNow(Date.now());

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 30000);

    return () => window.clearInterval(timer);
  }, []);

  return <>{formatResetCountdown(resetAtMs - now)}</>;
}
