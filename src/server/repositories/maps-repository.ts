import { RowDataPacket } from "mysql2";
import { getDbPool } from "@/src/server/db/pool";
import { buildServerScopeCondition } from "@/src/server/repositories/server-scope";
import { toFixedNumber } from "@/src/server/utils/numbers";

export type GamemodeBreakdown = {
  gamemode: string;
  totalRounds: number;
};

export type MapBreakdown = {
  mapCode: string;
  numberOfRounds: number;
  averagePlayers: number;
  averagePopularity: number;
};

export type MapCoverage = {
  mapCode: string;
  totalRounds: number;
  roundSharePercent: number;
};

export type MapsSnapshotInput = {
  serverId?: number;
  serverIds?: number[];
  selectedGamemode: string | null;
};

export type MapsSnapshot = {
  gamemodes: GamemodeBreakdown[];
  selectedGamemode: string | null;
  maps: MapBreakdown[];
  mapCoverage: MapCoverage[];
};

type GamemodeBreakdownRow = RowDataPacket & {
  gamemode: string;
  totalRounds: number;
};

type MapBreakdownRow = RowDataPacket & {
  mapCode: string;
  numberOfRounds: number;
  averagePlayers: number | null;
  averagePopularity: number | null;
};

type MapCoverageRow = RowDataPacket & {
  mapCode: string;
  totalRounds: number;
};

function normalizeGamemode(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function listServerGamemodeBreakdown(
  input: {
    serverId?: number;
    serverIds?: number[];
  }
): Promise<GamemodeBreakdown[]> {
  const pool = getDbPool();
  const scope = buildServerScopeCondition("ServerID", input);
  const [rows] = await pool.query<GamemodeBreakdownRow[]>(
    `
      SELECT
        Gamemode AS gamemode,
        SUM(NumberofRounds) AS totalRounds
      FROM tbl_mapstats
      WHERE ${scope.sql}
        AND Gamemode != ''
      GROUP BY Gamemode
      ORDER BY totalRounds DESC
      LIMIT 8
    `,
    scope.params
  );

  return rows.map((row) => ({
    gamemode: row.gamemode,
    totalRounds: Number(row.totalRounds ?? 0)
  }));
}

async function listServerMapsByGamemode(
  input: {
    serverId?: number;
    serverIds?: number[];
  },
  gamemode: string
): Promise<MapBreakdown[]> {
  const pool = getDbPool();
  const scope = buildServerScopeCondition("ServerID", input);
  const [rows] = await pool.query<MapBreakdownRow[]>(
    `
      SELECT
        MapName AS mapCode,
        SUM(NumberofRounds) AS numberOfRounds,
        AVG(AvgPlayers) AS averagePlayers,
        (AVG(AvgPlayers) / NULLIF(AVG(PlayersLeftServer), 0)) * 100 AS averagePopularity
      FROM tbl_mapstats
      WHERE ${scope.sql}
        AND Gamemode = ?
        AND MapName != ''
      GROUP BY MapName
      ORDER BY numberOfRounds DESC
    `,
    [...scope.params, gamemode]
  );

  return rows.map((row) => ({
    mapCode: row.mapCode,
    numberOfRounds: Number(row.numberOfRounds ?? 0),
    averagePlayers: toFixedNumber(row.averagePlayers),
    averagePopularity: toFixedNumber(row.averagePopularity)
  }));
}

async function listServerMapCoverage(
  input: {
    serverId?: number;
    serverIds?: number[];
  },
  limit = 12
): Promise<MapCoverage[]> {
  const pool = getDbPool();
  const safeLimit = Math.max(1, Math.min(40, Math.floor(limit)));
  const scope = buildServerScopeCondition("ServerID", input);
  const [rows] = await pool.query<MapCoverageRow[]>(
    `
      SELECT
        MapName AS mapCode,
        SUM(NumberofRounds) AS totalRounds
      FROM tbl_mapstats
      WHERE ${scope.sql}
        AND Gamemode != ''
        AND MapName != ''
      GROUP BY MapName
      ORDER BY totalRounds DESC
      LIMIT ?
    `,
    [...scope.params, safeLimit]
  );

  const totalRounds = rows.reduce(
    (sum, row) => sum + Number(row.totalRounds ?? 0),
    0
  );

  return rows.map((row) => {
    const rounds = Number(row.totalRounds ?? 0);
    return {
      mapCode: row.mapCode,
      totalRounds: rounds,
      roundSharePercent: toFixedNumber(
        totalRounds > 0 ? (rounds / totalRounds) * 100 : 0
      )
    };
  });
}

export async function getServerMapsSnapshot(
  input: MapsSnapshotInput
): Promise<MapsSnapshot> {
  const [gamemodes, mapCoverage] = await Promise.all([
    listServerGamemodeBreakdown(input),
    listServerMapCoverage(input, 12)
  ]);
  const requestedGamemode = normalizeGamemode(input.selectedGamemode);

  const selectedGamemode =
    requestedGamemode &&
    gamemodes.some((gamemode) => gamemode.gamemode === requestedGamemode)
      ? requestedGamemode
      : gamemodes[0]?.gamemode ?? null;

  if (!selectedGamemode) {
    return {
      gamemodes,
      selectedGamemode: null,
      maps: [],
      mapCoverage
    };
  }

  const maps = await listServerMapsByGamemode(input, selectedGamemode);

  return {
    gamemodes,
    selectedGamemode,
    maps,
    mapCoverage
  };
}
