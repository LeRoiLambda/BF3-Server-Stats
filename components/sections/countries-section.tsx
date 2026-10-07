import Link from "next/link";
import { StatsShell } from "@/components/layout/stats-shell";
import { switchButtonClass, ui } from "@/components/layout/stats-ui";
import { CountryFlag } from "@/components/stats/country-flag";
import { PlayerDisciplineBadge } from "@/components/stats/player-discipline-badge";
import {
  PlayerIdentity,
  PlayerTableCellLink,
  playerTableRowClass
} from "@/components/stats/player-link";
import {
  formatCountryName,
  normalizeCountryCode
} from "@/src/server/domain/bf3-reference";
import { getServerCountriesSnapshot } from "@/src/server/repositories/countries-repository";
import { firstValue } from "@/src/server/routing/params";
import {
  scopeHref,
  scopeName,
  scopeServerId,
  scopeServers,
  type PageScope,
  type SearchParams
} from "@/src/server/routing/server-pages";

type CountriesSectionProps = {
  scope: PageScope;
  searchParams: SearchParams;
};

// ?c= lists the country tabs to show; ?country= selects one of them.
function parseTabCodes(searchParams: SearchParams): string[] {
  return Array.from(
    new Set(
      (firstValue(searchParams.c) ?? "")
        .split(",")
        .map((code) => normalizeCountryCode(code))
        .filter((code): code is string => Boolean(code))
    )
  );
}

export async function CountriesSection({ scope, searchParams }: CountriesSectionProps) {
  const tabCodes = parseTabCodes(searchParams);
  const serverId = scopeServerId(scope);
  const snapshot = await getServerCountriesSnapshot({
    ...scopeServers(scope),
    gameId: scope.gameId,
    selectedCountryCode:
      normalizeCountryCode(firstValue(searchParams.country)) ?? tabCodes[0] ?? null
  });
  const requestedCountries = tabCodes
    .map((code) => snapshot.countries.find((entry) => entry.countryCode === code))
    .filter((entry): entry is (typeof snapshot.countries)[number] => Boolean(entry));
  const countriesForTabs =
    requestedCountries.length > 0 ? requestedCountries : snapshot.countries;

  return (
    <StatsShell
      title={`${scopeName(scope)} - Countries`}
      subtitle={
        scope.kind === "all"
          ? "Player distribution by country and top players for each country across all servers."
          : "Player distribution by country and top players for each country."
      }
      servers={scope.context.servers}
      currentServerId={serverId}
      activeSection="countries"
    >
      <section className={ui.panel}>
        {snapshot.countries.length === 0 ? (
          <p className="text-sm text-slate-300">
            {scope.kind === "all"
              ? "No country stats found."
              : "No country stats found for this server."}
          </p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              {countriesForTabs.map((country) => (
                <Link
                  key={country.countryCode}
                  href={scopeHref(scope, "countries", {
                    country: country.countryCode,
                    c: tabCodes.join(",")
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
                <p>
                  <span className="text-slate-400">Code:</span>{" "}
                  {snapshot.selectedCountryCode}
                </p>
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
                      <tr key={player.playerId} className={playerTableRowClass(ui.tableRow)}>
                        <td className={ui.td}>
                          <PlayerTableCellLink playerId={player.playerId} serverId={serverId}>
                            {index + 1}
                          </PlayerTableCellLink>
                        </td>
                        <td className={ui.td}>
                          <PlayerTableCellLink
                            playerId={player.playerId}
                            serverId={serverId}
                            primary
                          >
                            <PlayerIdentity
                              soldierName={player.soldierName}
                              countryCode={player.countryCode}
                            />
                            <PlayerDisciplineBadge status={player.banStatus} />
                          </PlayerTableCellLink>
                        </td>
                        <td className={ui.td}>
                          <PlayerTableCellLink playerId={player.playerId} serverId={serverId}>
                            {player.score}
                          </PlayerTableCellLink>
                        </td>
                        <td className={ui.td}>
                          <PlayerTableCellLink playerId={player.playerId} serverId={serverId}>
                            {player.kills}
                          </PlayerTableCellLink>
                        </td>
                        <td className={ui.td}>
                          <PlayerTableCellLink playerId={player.playerId} serverId={serverId}>
                            {player.kdr.toFixed(2)}
                          </PlayerTableCellLink>
                        </td>
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
