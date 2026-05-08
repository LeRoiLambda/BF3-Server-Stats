import { RowDataPacket } from "mysql2";
import { getDbPool } from "@/src/server/db/pool";
import { toFixedNumber } from "@/src/server/utils/numbers";

type ServerStatsRow = RowDataPacket & {
  countPlayers: number | null;
  avgScore: number | null;
  avgKills: number | null;
  avgDeaths: number | null;
  avgHsr: number | null;
  avgKdr: number | null;
};

type TeamScoreRow = RowDataPacket & {
  teamId: number;
  score: number;
  winningScore: number;
};

export type ServerOverviewStats = {
  countPlayers: number;
  avgScore: number;
  avgKills: number;
  avgDeaths: number;
  avgHsr: number;
  avgKdr: number;
};

export type TeamScore = {
  teamId: number;
  score: number;
  winningScore: number;
};

export async function getServerOverviewStats(
  serverId: number
): Promise<ServerOverviewStats | null> {
  const pool = getDbPool();
  const [rows] = await pool.query<ServerStatsRow[]>(
    `
      SELECT
        CountPlayers AS countPlayers,
        AvgScore AS avgScore,
        AvgKills AS avgKills,
        AvgDeaths AS avgDeaths,
        (SumHeadshots / NULLIF(SumKills, 0)) * 100 AS avgHsr,
        (SumKills / NULLIF(SumDeaths, 0)) AS avgKdr
      FROM tbl_server_stats
      WHERE ServerID = ?
      LIMIT 1
    `,
    [serverId]
  );

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    countPlayers: Number(row.countPlayers ?? 0),
    avgScore: toFixedNumber(row.avgScore),
    avgKills: toFixedNumber(row.avgKills),
    avgDeaths: toFixedNumber(row.avgDeaths),
    avgHsr: toFixedNumber(row.avgHsr),
    avgKdr: toFixedNumber(row.avgKdr)
  };
}

export async function listTeamScores(serverId: number): Promise<TeamScore[]> {
  const pool = getDbPool();
  const [rows] = await pool.query<TeamScoreRow[]>(
    `
      SELECT
        TeamID AS teamId,
        Score AS score,
        WinningScore AS winningScore
      FROM tbl_teamscores
      WHERE ServerID = ?
      ORDER BY TeamID ASC
    `,
    [serverId]
  );

  return rows.map((row) => ({
    teamId: Number(row.teamId),
    score: Number(row.score ?? 0),
    winningScore: Number(row.winningScore ?? 0)
  }));
}
