import { RowDataPacket } from "mysql2";
import { getDbPool } from "@/src/server/db/pool";
import { hasTable } from "@/src/server/db/schema";
import { normalizeCountryCode } from "@/src/server/domain/bf3-reference";
import { buildServerScopeCondition } from "@/src/server/repositories/server-scope";
import { toFixedNumber } from "@/src/server/utils/numbers";

export type CountryBreakdown = {
  countryCode: string;
  playerCount: number;
};

export type CountryPlayer = {
  playerId: number;
  soldierName: string;
  countryCode: string | null;
  score: number;
  kills: number;
  kdr: number;
  banStatus: "active" | "expired" | null;
};

export type CountriesSnapshotInput = {
  serverId?: number;
  serverIds?: number[];
  gameId: number;
  selectedCountryCode: string | null;
};

export type CountriesSnapshot = {
  countries: CountryBreakdown[];
  selectedCountryCode: string | null;
  selectedCountryPlayerCount: number;
  players: CountryPlayer[];
};

type CountryBreakdownRow = RowDataPacket & {
  countryCode: string;
  playerCount: number;
};

type CountryPlayerCountRow = RowDataPacket & {
  totalRows: number;
};

type CountryPlayerRow = RowDataPacket & {
  playerId: number;
  soldierName: string;
  countryCode: string | null;
  score: number;
  kills: number;
  kdr: number | null;
  banStatus?: string | null;
};

export async function listServerCountryBreakdown(
  input: {
    serverId?: number;
    serverIds?: number[];
    gameId: number;
  }
): Promise<CountryBreakdown[]> {
  const pool = getDbPool();
  const scope = buildServerScopeCondition("tsp.ServerID", input);
  const [rows] = await pool.query<CountryBreakdownRow[]>(
    `
      SELECT
        UPPER(tpd.CountryCode) AS countryCode,
        COUNT(DISTINCT tpd.PlayerID) AS playerCount
      FROM tbl_playerstats tps
      INNER JOIN tbl_server_player tsp ON tsp.StatsID = tps.StatsID
      INNER JOIN tbl_playerdata tpd ON tsp.PlayerID = tpd.PlayerID
      WHERE ${scope.sql}
        AND tpd.GameID = ?
        AND tpd.CountryCode != '--'
        AND tpd.CountryCode != ''
      GROUP BY tpd.CountryCode
      ORDER BY playerCount DESC, tpd.CountryCode ASC
      LIMIT 20
    `,
    [...scope.params, input.gameId]
  );

  return rows.map((row) => ({
    countryCode: row.countryCode,
    playerCount: Number(row.playerCount ?? 0)
  }));
}

async function countServerPlayersByCountry(
  input: {
    serverId?: number;
    serverIds?: number[];
    gameId: number;
  },
  countryCode: string
): Promise<number> {
  const pool = getDbPool();
  const scope = buildServerScopeCondition("tsp.ServerID", input);
  const [rows] = await pool.query<CountryPlayerCountRow[]>(
    `
      SELECT COUNT(DISTINCT tpd.PlayerID) AS totalRows
      FROM tbl_playerstats tps
      INNER JOIN tbl_server_player tsp ON tsp.StatsID = tps.StatsID
      INNER JOIN tbl_playerdata tpd ON tsp.PlayerID = tpd.PlayerID
      WHERE ${scope.sql}
        AND tpd.GameID = ?
        AND UPPER(tpd.CountryCode) = ?
    `,
    [...scope.params, input.gameId, countryCode]
  );

  return Number(rows[0]?.totalRows ?? 0);
}

async function listServerPlayersByCountry(
  input: {
    serverId?: number;
    serverIds?: number[];
    gameId: number;
  },
  countryCode: string
): Promise<CountryPlayer[]> {
  const pool = getDbPool();
  const adkatsAvailable = await hasTable("adkats_bans");
  const scope = buildServerScopeCondition("tsp.ServerID", input);
  const [rows] = await pool.query<CountryPlayerRow[]>(
    `
      SELECT
        tpd.PlayerID AS playerId,
        tpd.SoldierName AS soldierName,
        UPPER(tpd.CountryCode) AS countryCode,
        SUM(tps.Score) AS score,
        SUM(tps.Kills) AS kills,
        (SUM(tps.Kills) / NULLIF(SUM(tps.Deaths), 0)) AS kdr
        ${adkatsAvailable ? ", adk.ban_status AS banStatus" : ""}
      FROM tbl_playerstats tps
      INNER JOIN tbl_server_player tsp ON tsp.StatsID = tps.StatsID
      INNER JOIN tbl_playerdata tpd ON tsp.PlayerID = tpd.PlayerID
      ${adkatsAvailable ? "LEFT JOIN adkats_bans adk ON adk.player_id = tpd.PlayerID" : ""}
      WHERE ${scope.sql}
        AND tpd.GameID = ?
        AND UPPER(tpd.CountryCode) = ?
      GROUP BY tpd.PlayerID, tpd.SoldierName, tpd.CountryCode ${adkatsAvailable ? ", adk.ban_status" : ""}
      ORDER BY score DESC, tpd.SoldierName ASC
      LIMIT 20
    `,
    [...scope.params, input.gameId, countryCode]
  );

  return rows.map((row) => ({
    playerId: Number(row.playerId),
    soldierName: row.soldierName,
    countryCode: normalizeCountryCode(row.countryCode),
    score: Number(row.score ?? 0),
    kills: Number(row.kills ?? 0),
    kdr: toFixedNumber(row.kdr),
    banStatus:
      row.banStatus === "Active"
        ? "active"
        : row.banStatus === "Expired"
          ? "expired"
          : null
  }));
}

export async function getServerCountriesSnapshot(
  input: CountriesSnapshotInput
): Promise<CountriesSnapshot> {
  const countries = await listServerCountryBreakdown(input);

  const requestedCode = normalizeCountryCode(input.selectedCountryCode);
  const selectedCountryCode =
    requestedCode && countries.some((country) => country.countryCode === requestedCode)
      ? requestedCode
      : countries[0]?.countryCode ?? null;

  if (!selectedCountryCode) {
    return {
      countries,
      selectedCountryCode: null,
      selectedCountryPlayerCount: 0,
      players: []
    };
  }

  const [selectedCountryPlayerCount, players] = await Promise.all([
    countServerPlayersByCountry(input, selectedCountryCode),
    listServerPlayersByCountry(input, selectedCountryCode)
  ]);

  return {
    countries,
    selectedCountryCode,
    selectedCountryPlayerCount,
    players
  };
}
