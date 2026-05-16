import Link from "next/link";
import { StatsShell } from "@/components/layout/stats-shell";
import { switchButtonClass, ui } from "@/components/layout/stats-ui";
import { CountryFlag } from "@/components/stats/country-flag";
import { PlayerDisciplineBadge } from "@/components/stats/player-discipline-badge";
import { PlayerLink } from "@/components/stats/player-link";
import {
  formatCountryName,
  normalizeCountryCode
} from "@/src/server/domain/bf3-reference";
import { getServerCountriesSnapshot } from "@/src/server/repositories/countries-repository";
import { firstValue } from "@/src/server/routing/params";
import {
  allServersHref,
  getAllServersPageScope
} from "@/src/server/routing/server-pages";

export const revalidate = 30;

type AllServersCountriesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AllServersCountriesPage({
  searchParams
}: AllServersCountriesPageProps) {
  const scope = await getAllServersPageScope("countries");
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const requestedCodes = (firstValue(resolvedSearchParams.c) ?? "")
    .split(",")
    .map((code) => normalizeCountryCode(code))
    .filter((code): code is string => Boolean(code));
  const direct = normalizeCountryCode(firstValue(resolvedSearchParams.country));
  const snapshot = await getServerCountriesSnapshot({
    serverIds: scope.serverIds,
    gameId: scope.gameId,
    selectedCountryCode: direct ?? requestedCodes[0] ?? null
  });
  const countriesForTabs =
    requestedCodes.length === 0
      ? snapshot.countries
      : requestedCodes
          .map((code) => snapshot.countries.find((entry) => entry.countryCode === code))
          .filter((entry): entry is (typeof snapshot.countries)[number] => Boolean(entry));

  return (
    <StatsShell
      title="All Servers - Countries"
      subtitle="Player distribution by country and top players for each country across all servers."
      servers={scope.context.servers}
      activeSection="countries"
    >
      <section className={ui.panel}>
        {snapshot.countries.length === 0 ? (
          <p className="text-sm text-slate-300">No country stats found.</p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              {(countriesForTabs.length > 0 ? countriesForTabs : snapshot.countries).map((country) => (
                <Link
                  key={country.countryCode}
                  href={allServersHref("countries", {
                    country: country.countryCode,
                    c: requestedCodes.join(",")
                  })}
                  className={switchButtonClass(snapshot.selectedCountryCode === country.countryCode)}
                >
                  <span className="inline-flex items-center gap-2">
                    <CountryFlag countryCode={country.countryCode} />
                    {country.countryCode} · {country.playerCount}
                  </span>
                </Link>
              ))}
            </div>
            {snapshot.selectedCountryCode ? (
              <div className="mb-4 grid gap-3 rounded-sm border border-slate-600/40 bg-slate-950/60 p-4 text-sm text-slate-300 sm:grid-cols-3">
                <p>
                  <span className="text-slate-400">Country:</span>{" "}
                  <span className="inline-flex items-center gap-2">
                    <CountryFlag countryCode={snapshot.selectedCountryCode} />
                    {formatCountryName(snapshot.selectedCountryCode)}
                  </span>
                </p>
                <p><span className="text-slate-400">Code:</span> {snapshot.selectedCountryCode}</p>
                <p>
                  <span className="text-slate-400">Player Count:</span>{" "}
                  {snapshot.selectedCountryPlayerCount}
                </p>
              </div>
            ) : null}
            <div className={ui.tableShell}>
              <table className={ui.table}>
                <thead className={ui.tableHead}>
                  <tr>
                    <th className={ui.th}>#</th>
                    <th className={ui.th}>Player</th>
                    <th className={ui.th}>Score</th>
                    <th className={ui.th}>Kills</th>
                    <th className={ui.th}>KDR</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.players.length === 0 ? (
                    <tr className={ui.tableRow}>
                      <td className={ui.emptyCell} colSpan={5}>
                        No players found for this country.
                      </td>
                    </tr>
                  ) : (
                    snapshot.players.map((player, index) => (
                      <tr key={player.playerId} className={ui.tableRow}>
                        <td className={ui.td}>{index + 1}</td>
                        <td className={ui.td}>
                          <PlayerLink
                            playerId={player.playerId}
                            soldierName={player.soldierName}
                            countryCode={player.countryCode}
                          />
                          <PlayerDisciplineBadge status={player.banStatus} />
                        </td>
                        <td className={ui.td}>{player.score}</td>
                        <td className={ui.td}>{player.kills}</td>
                        <td className={ui.td}>{player.kdr.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </StatsShell>
  );
}
