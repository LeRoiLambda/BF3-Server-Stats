import Link from "next/link";
import { CountryFlag } from "@/components/stats/country-flag";

type PlayerLinkProps = Readonly<{
  playerId: number;
  soldierName: string;
  countryCode: string | null;
  serverId?: number | null;
}>;

function playerHref(playerId: number, serverId?: number | null): string {
  const query = serverId ? `?sid=${serverId}` : "";

  return `/players/${playerId}${query}`;
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
      <CountryFlag countryCode={countryCode} />
      {soldierName}
    </Link>
  );
}
