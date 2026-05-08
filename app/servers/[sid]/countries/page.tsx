import { notFound } from "next/navigation";
import { StatsShell } from "@/components/layout/stats-shell";
import { banTagClass, switchButtonClass, ui } from "@/components/layout/stats-ui";
import { CountryFlag } from "@/components/stats/country-flag";
import { PlayerLink } from "@/components/stats/player-link";
import {
  formatCountryName,
  normalizeCountryCode
} from "@/src/server/domain/bf3-reference";
import { getServerCountriesSnapshot } from "@/src/server/repositories/countries-repository";
import { getLegacyServerContext } from "@/src/server/repositories/server-repository";
import { firstValue, parsePositiveInt } from "@/src/server/routing/params";

export const revalidate = 30;

type CountriesPageProps = {
  params: Promise<{ sid: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type CountrySelection = {
  selectedCode: string | null;
  requestedCodes: string[];
};

function parseCountrySelection(
  searchParams: Record<string, string | string[] | undefined>
): CountrySelection {
  const requestedCodes: string[] = [];
  const fromLegacy = firstValue(searchParams.c);
  if (fromLegacy) {
    const parts = fromLegacy
      .split(",")
      .map((code) => normalizeCountryCode(code))
      .filter((code): code is string => Boolean(code));

    for (const code of parts) {
      if (!requestedCodes.includes(code)) {
        requestedCodes.push(code);
      }
    }
  }

  const direct = normalizeCountryCode(firstValue(searchParams.country));
  if (direct) {
    return {
      selectedCode: direct,
      requestedCodes
    };
  }

  return {
    selectedCode: requestedCodes[0] ?? null,
    requestedCodes
  };
}

function countryHref(serverId: number, countryCode: string, requestedCodes: string[]): string {
  const params = new URLSearchParams();
  params.set("country", countryCode);
  if (requestedCodes.length > 0) {
    params.set("c", requestedCodes.join(","));
  }
  return `/servers/${serverId}/countries?${params.toString()}`;
}

export default async function CountriesPage({
  params,
  searchParams
}: CountriesPageProps) {
  const { sid } = await params;
  const serverId = parsePositiveInt(sid);
  if (!serverId) {
    notFound();
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};

  const context = await getLegacyServerContext();
  const server = context.servers.find((entry) => entry.serverId === serverId);
  if (!server) {
    notFound();
  }

  const selection = parseCountrySelection(resolvedSearchParams);
  const snapshot = await getServerCountriesSnapshot({
    serverId: server.serverId,
    gameId: server.gameId,
    selectedCountryCode: selection.selectedCode
  });
  const visibleCountries =
    selection.requestedCodes.length === 0
      ? snapshot.countries
      : selection.requestedCodes
          .map((code) => snapshot.countries.find((entry) => entry.countryCode === code))
          .filter((entry): entry is (typeof snapshot.countries)[number] => Boolean(entry));
  const countriesForTabs = visibleCountries.length > 0 ? visibleCountries : snapshot.countries;

  return (
    <StatsShell
      title={`${server.serverName} - Countries`}
      subtitle="Player distribution by country and top players for each country."
      servers={context.servers}
      currentServerId={server.serverId}
      activeSection="countries"
    >
      <section className={ui.panel}>
        {snapshot.countries.length === 0 ? (
          <p className="text-sm text-slate-300">
            No country stats found for this server.
          </p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              {countriesForTabs.map((country) => {
                const selected = snapshot.selectedCountryCode === country.countryCode;

                return (
                  <a
                    key={country.countryCode}
                    href={countryHref(server.serverId, country.countryCode, selection.requestedCodes)}
                    className={switchButtonClass(selected)}
                  >
                    <span className="inline-flex items-center gap-2">
                      <CountryFlag countryCode={country.countryCode} />
                      {country.countryCode} · {country.playerCount}
                    </span>
                  </a>
                );
              })}
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
                      <tr
                        key={player.playerId}
                        className={ui.tableRow}
                      >
                        <td className={ui.td}>{index + 1}</td>
                        <td className={ui.td}>
                          <PlayerLink
                            playerId={player.playerId}
                            soldierName={player.soldierName}
                            countryCode={player.countryCode}
                            serverId={server.serverId}
                          />
                          {player.banStatus ? (
                            <span className={banTagClass(player.banStatus)}>
                              {player.banStatus}
                            </span>
                          ) : null}
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
