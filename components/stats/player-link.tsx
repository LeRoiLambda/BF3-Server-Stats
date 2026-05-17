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
  playerId: number;
  serverId?: number | null;
  className?: string;
  children: ReactNode;
}>;

export function playerHref(playerId: number, serverId?: number | null): string {
  const query = serverId ? `?sid=${serverId}` : "";

  return `/players/${playerId}${query}`;
}

export function playerTableRowClass(className?: string): string {
  return clsx(
    className,
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

export function PlayerTableCellLink({
  playerId,
  serverId = null,
  className,
  children
}: PlayerTableCellLinkProps) {
  return (
    <Link
      href={playerHref(playerId, serverId)}
      className={clsx(
        "block -mx-3 -my-2 px-3 py-2 transition-colors group-hover/player-row:text-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200/70",
        className
      )}
    >
      {children}
    </Link>
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
