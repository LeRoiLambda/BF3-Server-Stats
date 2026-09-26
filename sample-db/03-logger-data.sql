-- Sample stats logger data. Times are relative to when this file is loaded and
-- written in UTC, so the site needs BF3_STATS_LOGGER_TIME_ZONE=UTC.

SET NAMES utf8mb4;

CREATE TABLE sample_numbers (n INT UNSIGNED NOT NULL PRIMARY KEY);
INSERT INTO sample_numbers (n)
SELECT ones.d + 10 * tens.d + 100 * hundreds.d
FROM (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
      UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) ones
CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
      UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) tens
CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
      UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) hundreds;

INSERT INTO tbl_games (GameID, Name) VALUES (1, 'BF3');

-- The logger never writes ConnectionState; 'off' hides a server from the site.
INSERT INTO tbl_server
  (ServerID, ServerGroup, IP_Address, ServerName, GameID, usedSlots, maxSlots, mapName, fullMapName, Gamemode, ConnectionState)
VALUES
  (1, 0, '203.0.113.10:25200', 'Sample Conquest Server', 1, 21, 64, 'XP1_004', 'Wake Island', 'ConquestLarge0', 'on'),
  (2, 0, '203.0.113.10:25300', 'Sample Close Quarters Server', 1, 8, 32, 'MP_Subway', 'Operation Metro', 'TeamDeathMatch0', NULL),
  (3, 0, '203.0.113.20:25200', 'Retired Server', 1, 0, 32, 'MP_001', 'Grand Bazaar', 'RushLarge0', 'off');

-- Players with a specific role in the sample, then 240 generated players.
INSERT INTO tbl_playerdata (PlayerID, GameID, ClanTag, SoldierName, GlobalRank, CountryCode) VALUES
  (1, 1, NULL, 'Alex', 12, 'us'),
  (2, 1, 'SMPL', 'SuperAlex1', 145, 'de'),
  (3, 1, 'SMPL', 'SuperAlex2', 140, 'de'),
  (4, 1, 'SMPL', 'SuperAlex3', 138, 'de'),
  (5, 1, 'SMPL', 'SuperAlex4', 131, 'de'),
  (6, 1, 'SMPL', 'SuperAlex5', 127, 'de'),
  (7, 1, 'SMPL', 'SuperAlex6', 122, 'de'),
  (8, 1, 'SMPL', 'SuperAlex7', 118, 'de'),
  (9, 1, 'SMPL', 'SuperAlex8', 111, 'de'),
  (10, 1, 'SMPL', 'SuperAlex9', 104, 'de'),
  (11, 1, 'SMPL', 'SuperAlex10', 99, 'de'),
  (12, 1, 'SMPL', 'SuperAlex11', 95, 'de'),
  (13, 1, NULL, 'NeverDies', 45, 'ru'),
  (14, 1, NULL, 'ProxyPlayer', 30, 'a1'),
  (15, 1, NULL, 'BannedCheater', 88, 'nl'),
  (16, 1, 'BFX', 'TempBanned', 54, 'br'),
  (17, 1, NULL, 'MutedTalker', 67, 'fr'),
  (18, 1, 'BFX', 'LadderClimber', 71, 'gb'),
  (19, 1, NULL, 'RepeatOffender', 23, 'pl'),
  (20, 1, NULL, 'Forgiven', 60, 'se'),
  (21, 1, NULL, 'Müller', 76, 'de'),
  (22, 1, NULL, 'HiddenLegend', 145, 'us');

INSERT INTO tbl_playerdata (PlayerID, GameID, ClanTag, SoldierName, GlobalRank, CountryCode)
SELECT
  101 + n,
  1,
  CASE n MOD 4 WHEN 0 THEN 'SMPL' WHEN 1 THEN 'BFX' ELSE NULL END,
  CONCAT(
    ELT(1 + n MOD 16, 'Ghost', 'Viper', 'Nomad', 'Raven', 'Havoc', 'Frost', 'Blaze', 'Shadow',
        'Reaper', 'Spectre', 'Talon', 'Onyx', 'Rogue', 'Cobra', 'Falcon', 'Wolf'),
    ELT(1 + (n DIV 16) MOD 15, 'Hunter', 'Strike', 'Fang', 'Storm', 'Runner', 'Eye', 'Blade',
        'Rider', 'Hawk', 'Six', 'Zero', 'Actual', 'Prime', 'One', 'Lead')
  ),
  (n * 37) MOD 146,
  ELT(1 + n MOD 12, 'us', 'de', 'fr', 'gb', 'ru', 'pl', 'br', 'ca', 'se', 'nl', 'au', 'es')
FROM sample_numbers
WHERE n < 240;

UPDATE tbl_playerdata
SET PBGUID = MD5(CONCAT('pb-', PlayerID)),
    EAGUID = CONCAT('EA_', UPPER(MD5(CONCAT('ea-', PlayerID)))),
    IP_Address = CONCAT('10.1.', PlayerID DIV 250, '.', PlayerID MOD 250);

-- Everyone plays on server 1 except HiddenLegend, who only has stats on the
-- hidden server 3.
INSERT INTO tbl_server_player (ServerID, PlayerID)
SELECT 1, PlayerID FROM tbl_playerdata WHERE PlayerID <> 22 ORDER BY PlayerID;
INSERT INTO tbl_server_player (ServerID, PlayerID)
SELECT 2, PlayerID FROM tbl_playerdata
WHERE PlayerID IN (1, 13, 21) OR (PlayerID > 100 AND PlayerID MOD 2 = 0)
ORDER BY PlayerID;
INSERT INTO tbl_server_player (ServerID, PlayerID)
SELECT 3, PlayerID FROM tbl_playerdata
WHERE PlayerID = 22 OR (PlayerID > 100 AND PlayerID MOD 10 = 0)
ORDER BY PlayerID;

INSERT INTO tbl_playerstats
  (StatsID, Score, Kills, Headshots, Deaths, Suicide, TKs, Playtime, Rounds, FirstSeenOnServer,
   LastSeenOnServer, Killstreak, Deathstreak, HighScore, Wins, Losses)
SELECT
  StatsID,
  kills * 100 + (StatsID * 131) MOD 5000,
  kills,
  kills * (10 + StatsID MOD 25) DIV 100,
  30 + (StatsID * 104729) MOD 2000,
  StatsID MOD 15,
  StatsID MOD 7,
  rounds * (600 + (StatsID * 13) MOD 600),
  rounds,
  UTC_TIMESTAMP() - INTERVAL (30 + StatsID MOD 300) DAY,
  UTC_TIMESTAMP() - INTERVAL ((StatsID * 11) MOD 20000) MINUTE,
  3 + StatsID MOD 25,
  2 + StatsID MOD 12,
  1500 + (StatsID * 97) MOD 9000,
  rounds * (40 + StatsID MOD 30) DIV 100,
  rounds - rounds * (40 + StatsID MOD 30) DIV 100
FROM (
  SELECT StatsID, 40 + (StatsID * 7919) MOD 2400 AS kills, 5 + (StatsID * 17) MOD 200 AS rounds
  FROM tbl_server_player
) player_totals;

-- Alex scores less than every SuperAlex, so only an exact name match lists him first.
UPDATE tbl_playerstats ps JOIN tbl_server_player sp ON sp.StatsID = ps.StatsID
SET ps.Score = 500, ps.Kills = 5, ps.Headshots = 1, ps.Deaths = 9
WHERE sp.PlayerID = 1;
UPDATE tbl_playerstats ps JOIN tbl_server_player sp ON sp.StatsID = ps.StatsID
SET ps.Score = 400000 + sp.PlayerID * 1000, ps.Kills = 4000 + sp.PlayerID * 10
WHERE sp.PlayerID BETWEEN 2 AND 12;
UPDATE tbl_playerstats ps JOIN tbl_server_player sp ON sp.StatsID = ps.StatsID
SET ps.Score = 30000, ps.Kills = 200, ps.Headshots = 160, ps.Deaths = 0
WHERE sp.PlayerID = 13;
UPDATE tbl_playerstats ps JOIN tbl_server_player sp ON sp.StatsID = ps.StatsID
SET ps.Score = 999999, ps.Kills = 99999
WHERE sp.PlayerID = 22;

INSERT INTO tbl_server_stats
  (ServerID, CountPlayers, SumScore, AvgScore, SumKills, AvgKills, SumHeadshots, AvgHeadshots,
   SumDeaths, AvgDeaths, SumSuicide, AvgSuicide, SumTKs, AvgTKs, SumPlaytime, AvgPlaytime,
   SumRounds, AvgRounds)
SELECT
  sp.ServerID, COUNT(*), SUM(ps.Score), AVG(ps.Score), SUM(ps.Kills), AVG(ps.Kills),
  SUM(ps.Headshots), AVG(ps.Headshots), SUM(ps.Deaths), AVG(ps.Deaths), SUM(ps.Suicide),
  AVG(ps.Suicide), SUM(ps.TKs), AVG(ps.TKs), SUM(ps.Playtime), AVG(ps.Playtime),
  SUM(ps.Rounds), AVG(ps.Rounds)
FROM tbl_playerstats ps
INNER JOIN tbl_server_player sp ON sp.StatsID = ps.StatsID
GROUP BY sp.ServerID;

-- Completed sessions over the last twelve days, one to three per player.
INSERT INTO tbl_sessions
  (StatsID, StartTime, EndTime, Score, Kills, Headshots, Deaths, TKs, Suicide, RoundCount,
   Playtime, Killstreak, Deathstreak, HighScore, Wins, Losses)
SELECT
  StatsID,
  started,
  started + INTERVAL minutes MINUTE,
  kills * 100 + (StatsID * 7) MOD 900,
  kills,
  kills * 20 DIV 100,
  3 + (StatsID + visit * 11) MOD 35,
  visit MOD 2,
  StatsID MOD 3,
  1 + minutes DIV 25,
  minutes * 60,
  2 + kills DIV 5,
  1 + StatsID MOD 6,
  kills * 100 + 300,
  (1 + minutes DIV 25) DIV 2,
  (1 + minutes DIV 25) - (1 + minutes DIV 25) DIV 2
FROM (
  SELECT
    sp.StatsID,
    sample_numbers.n AS visit,
    UTC_TIMESTAMP() - INTERVAL (180 + (sp.StatsID * 53 + sample_numbers.n * 1409) MOD 17280) MINUTE AS started,
    20 + (sp.StatsID + sample_numbers.n * 7) MOD 150 AS minutes,
    5 + (sp.StatsID + sample_numbers.n * 13) MOD 40 AS kills
  FROM tbl_server_player sp
  INNER JOIN sample_numbers ON sample_numbers.n < IF(sp.StatsID MOD 2 = 0, 3, 1)
  WHERE sp.ServerID IN (1, 2)
) visits;

-- The round in progress. BrandNewGuy joined for the first time: the logger
-- writes his player and stats rows at the next map load.
INSERT INTO tbl_currentplayers
  (ServerID, Soldiername, GlobalRank, ClanTag, Score, Kills, Headshots, Deaths, Suicide,
   Killstreak, Deathstreak, TeamID, SquadID, EA_GUID, PB_GUID, CountryCode, Ping, PlayerJoined)
SELECT
  sp.ServerID, pd.SoldierName, pd.GlobalRank, pd.ClanTag,
  (pd.PlayerID * 97) MOD 3000, (pd.PlayerID * 7) MOD 30, (pd.PlayerID * 3) MOD 8,
  (pd.PlayerID * 5) MOD 25, 0, (pd.PlayerID * 7) MOD 30 DIV 3, (pd.PlayerID * 5) MOD 25 DIV 4,
  1 + pd.PlayerID MOD 2, 1 + (pd.PlayerID DIV 2) MOD 8, pd.EAGUID, pd.PBGUID, pd.CountryCode,
  20 + (pd.PlayerID * 13) MOD 80, UTC_TIMESTAMP() - INTERVAL ((pd.PlayerID * 7) MOD 50) MINUTE
FROM tbl_playerdata pd
INNER JOIN tbl_server_player sp ON sp.PlayerID = pd.PlayerID
WHERE (sp.ServerID = 1 AND (pd.PlayerID IN (13, 14, 17) OR pd.PlayerID BETWEEN 101 AND 117))
   OR (sp.ServerID = 2 AND pd.PlayerID BETWEEN 200 AND 214);

INSERT INTO tbl_currentplayers
  (ServerID, Soldiername, GlobalRank, Score, Kills, Deaths, TeamID, SquadID, EA_GUID, CountryCode, Ping, PlayerJoined)
VALUES
  (1, 'BrandNewGuy', 0, 150, 1, 2, 2, 3, 'EA_BRANDNEWGUY', 'nl', 45, UTC_TIMESTAMP() - INTERVAL 4 MINUTE);

INSERT INTO tbl_teamscores (ServerID, TeamID, Score, WinningScore) VALUES
  (1, 1, 412, 0),
  (1, 2, 287, 0),
  (2, 1, 64, 100),
  (2, 2, 71, 100);

-- One row per round: two rounds per map, most recent first.
INSERT INTO tbl_mapstats
  (ServerID, TimeMapLoad, TimeRoundStarted, TimeRoundEnd, MapName, Gamemode, Roundcount,
   NumberofRounds, MinPlayers, AvgPlayers, MaxPlayers, PlayersJoinedServer, PlayersLeftServer)
SELECT
  servers.ServerID,
  UTC_TIMESTAMP() - INTERVAL (servers.age + n * 60 + 57) MINUTE,
  UTC_TIMESTAMP() - INTERVAL (servers.age + n * 60 + 55) MINUTE,
  UTC_TIMESTAMP() - INTERVAL (servers.age + n * 60 + 5) MINUTE,
  IF(servers.ServerID = 2,
     ELT(1 + (n DIV 2) MOD 5, 'MP_Subway', 'XP2_Office', 'XP2_Factory', 'XP2_Palace', 'XP2_Skybar'),
     ELT(1 + (n DIV 2) MOD 6, 'XP1_004', 'MP_001', 'MP_003', 'MP_007', 'MP_017', 'XP1_002')),
  IF(servers.ServerID = 2, IF((n DIV 2) MOD 5 = 4, 'SquadDeathMatch0', 'TeamDeathMatch0'),
     IF(servers.ServerID = 3, 'RushLarge0', 'ConquestLarge0')),
  2 - n MOD 2,
  2,
  8 + (n * 7) MOD 30,
  16.5 + (n * 7) MOD 30,
  LEAST(servers.slots, 22 + (n * 7) MOD 30),
  5 + (n * 3) MOD 20,
  4 + (n * 5) MOD 18
FROM sample_numbers
CROSS JOIN (
  SELECT 1 AS ServerID, 0 AS age, 64 AS slots
  UNION ALL SELECT 2, 0, 32
  UNION ALL SELECT 3, 60 * 24 * 90, 32
) servers
WHERE n < IF(servers.ServerID = 3, 20, 192);

-- Nobody left during Operation 925 rounds, so its joins per leave are undefined.
UPDATE tbl_mapstats SET PlayersLeftServer = 0 WHERE ServerID = 2 AND MapName = 'XP2_Office';

INSERT INTO tbl_weapons (WeaponID, GameID, Friendlyname, Fullname, Damagetype, Slot, Kitrestriction) VALUES
  (1, 1, 'M16A4', 'M16A4', 'assaultrifle', 'Primary', 'Assault'),
  (2, 1, 'AEK-971', 'AEK-971', 'assaultrifle', 'Primary', 'Assault'),
  (3, 1, 'M416', 'M416', 'assaultrifle', 'Primary', 'Assault'),
  (4, 1, 'M4A1', 'M4A1', 'smg', 'Primary', 'Demolition'),
  (5, 1, 'P90', 'Weapons/P90/P90', 'smg', 'Primary', 'None'),
  (6, 1, 'M249', 'M249', 'lmg', 'Primary', 'Support'),
  (7, 1, 'Pecheneg', 'Pecheneg', 'lmg', 'Primary', 'Support'),
  (8, 1, 'M40A5', 'M40A5', 'sniperrifle', 'Primary', 'Recon'),
  (9, 1, 'SV98', 'SV98', 'sniperrifle', 'Primary', 'Recon'),
  (10, 1, '870MCS', '870MCS', 'shotgun', 'Secondary', 'None'),
  (11, 1, 'M9', 'M9', 'handgun', 'Auxiliary', 'None'),
  (12, 1, 'Knife_RazorBlade', 'Knife_RazorBlade', 'melee', 'Secondary', 'None'),
  (13, 1, 'M320', 'M320', 'projectileexplosive', 'Secondary', 'Assault'),
  (14, 1, 'Death', 'Death', 'none', 'Primary', 'None');

INSERT INTO tbl_weapons_stats (StatsID, WeaponID, Kills, Headshots, Deaths)
SELECT
  ps.StatsID,
  1 + (ps.StatsID + sample_numbers.n * 5) MOD 14,
  ps.Kills * ELT(1 + sample_numbers.n, 50, 30, 20) DIV 100,
  ps.Headshots * ELT(1 + sample_numbers.n, 50, 30, 20) DIV 100,
  ps.Deaths * ELT(1 + sample_numbers.n, 50, 30, 20) DIV 100
FROM tbl_playerstats ps
INNER JOIN sample_numbers ON sample_numbers.n < 3;

INSERT INTO tbl_dogtags (KillerID, VictimID, Count)
SELECT killer.StatsID, victim.StatsID, 1 + (killer.StatsID + victim.StatsID) MOD 4
FROM tbl_server_player killer
INNER JOIN tbl_server_player victim
  ON victim.ServerID = killer.ServerID
  AND victim.StatsID IN (killer.StatsID + 1, killer.StatsID + 4)
WHERE killer.ServerID = 1 AND killer.StatsID MOD 3 = 0;

-- The logger inserts chat lines as they are sent, so ids follow time.
INSERT INTO tbl_chatlog (logDate, ServerID, logSubset, logSoldierName, logMessage)
SELECT logDate, ServerID, logSubset, logSoldierName, logMessage
FROM (
  SELECT
    UTC_TIMESTAMP() - INTERVAL (n * 53 + 7) MINUTE AS logDate,
    1 + n MOD 2 AS ServerID,
    ELT(1 + n MOD 5, 'Global', 'Global', 'Team', 'Squad', 'Global') AS logSubset,
    (SELECT SoldierName FROM tbl_playerdata WHERE PlayerID = 101 + (n * 7) MOD 240) AS logSoldierName,
    ELT(1 + n MOD 16, 'gg', 'nice shot', 'ak 47 is too strong', 'top 10 this week!',
        'who is on the tank?', 'push the flag', 'medic!', 'anyone has ammo?',
        'thanks for the revive', 'lag?', 'gg wp', 'nice round', 'rush B',
        'that sniper on the hill...', 'need a pilot', 'ready up') AS logMessage
  FROM sample_numbers
  WHERE n < 240
  UNION ALL SELECT UTC_TIMESTAMP() - INTERVAL 2 MINUTE, 1, 'Global', 'BrandNewGuy', 'hello, first time here'
  UNION ALL SELECT UTC_TIMESTAMP() - INTERVAL 3 MINUTE, 1, 'Global', 'Server', 'Welcome to the Sample Conquest Server!'
  UNION ALL SELECT UTC_TIMESTAMP() - INTERVAL 1 DAY, 1, 'Global', 'Server', 'Next map: Grand Bazaar'
  UNION ALL SELECT UTC_TIMESTAMP() - INTERVAL 2 DAY, 2, 'Global', 'Server', 'Welcome to the Sample Close Quarters Server!'
  UNION ALL SELECT UTC_TIMESTAMP() - INTERVAL 5 HOUR, 1, 'Global', 'Müller', 'Grüße aus München'
  UNION ALL SELECT UTC_TIMESTAMP() - INTERVAL 40 MINUTE, 1, 'Global', 'MutedTalker', 'LOOOOOL'
  UNION ALL SELECT UTC_TIMESTAMP() - INTERVAL 39 MINUTE, 1, 'Global', 'MutedTalker', 'LOOOOOOOOOL'
) chat
ORDER BY logDate;

DROP TABLE sample_numbers;
