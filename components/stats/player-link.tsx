import Link from "next/link";
import { clsx } from "clsx";
import type { ReactNode } from "react";
import { CountryFlag } from "@/components/stats/country-flag";

type PlayerLinkProps = Readonly<{
  playerId: number;
  soldierName: string;
  countryCode: string | null;
  serverId?: number | null;
}>;

type PlayerIdentityProps = Readonly<{
  soldierName: string;
  countryCode: string | null;
  className?: string;
}>;

type PlayerTableCellLinkProps = Readonly<{
  playerId: number | null;
  serverId?: number | null;
  primary?: boolean;
  className?: string;
  children: ReactNode;
}>;

export function playerHref(playerId: number, serverId?: number | null): string {
  const query = serverId ? `?sid=${serverId}` : "";

  return `/players/${playerId}${query}`;
}

export function playerTableRowClass(className?: string, linked = true): string {
  return clsx(
    className,
    linked &&
      "group/player-row cursor-pointer transition-colors hover:bg-slate-800/45"
  );
}

export function PlayerIdentity({
  soldierName,
  countryCode,
  className
}: PlayerIdentityProps) {
  return (
    <span
      className={clsx(
        "inline-flex min-w-0 max-w-full items-center gap-2",
        className
      )}
    >
      <CountryFlag countryCode={countryCode} />
      <span className="truncate">{soldierName}</span>
    </span>
  );
}

// Makes a whole table row link to the player's profile. The `primary` cell (the
// player's name) holds the focusable link; the other cells get an overlay link
// hidden from keyboard and screen-reader users, so each row is one tab stop.
export function PlayerTableCellLink({
  playerId,
  serverId = null,
  primary = false,
  className,
  children
}: PlayerTableCellLinkProps) {
  // Rows without a player record (server messages, unknown speakers) stay plain
  // text.
  if (playerId === null) {
    return children;
  }

  const href = playerHref(playerId, serverId);
  const cellClassName = clsx(
    "block -mx-3 -my-2 px-3 py-2 transition-colors group-hover/player-row:text-slate-50",
    className
  );

  if (primary) {
    return (
      <Link
        href={href}
        className={clsx(
          cellClassName,
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200/70"
        )}
      >
        {children}
      </Link>
    );
  }

  return (
    <span className={clsx("relative", cellClassName)}>
      {children}
      <Link
        href={href}
        tabIndex={-1}
        aria-hidden="true"
        className="absolute inset-0"
      />
    </span>
  );
}

export function PlayerLink({
  playerId,
  soldierName,
  countryCode,
  serverId = null
}: PlayerLinkProps) {
  return (
    <Link
      href={playerHref(playerId, serverId)}
      className="inline-flex items-center gap-2 text-slate-100 hover:text-white"
    >
      <PlayerIdentity soldierName={soldierName} countryCode={countryCode} />
    </Link>
  );
}
