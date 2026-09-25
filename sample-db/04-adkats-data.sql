-- Sample AdKats data for the players of 03-logger-data.sql. Record times are
-- in UTC, as AdKats writes them.

SET NAMES utf8mb4;

INSERT INTO adkats_commands VALUES
  (3, 'Active', 'player_kill', 'Log', 'Kill Player', 'kill', TRUE, 'Any'),
  (6, 'Active', 'player_kick', 'Log', 'Kick Player', 'kick', TRUE, 'Any'),
  (7, 'Active', 'player_ban_temp', 'Log', 'Temp-Ban Player', 'tban', TRUE, 'Any'),
  (8, 'Active', 'player_ban_perm', 'Log', 'Permaban Player', 'ban', TRUE, 'Any'),
  (9, 'Active', 'player_punish', 'Mandatory', 'Punish Player', 'punish', TRUE, 'Any'),
  (10, 'Active', 'player_forgive', 'Mandatory', 'Forgive Player', 'forgive', TRUE, 'Any'),
  (11, 'Active', 'player_mute', 'Log', 'Mute Player', 'mute', TRUE, 'Any'),
  (36, 'Invisible', 'banenforcer_enforce', 'Mandatory', 'Enforce Active Ban', 'enforceban', TRUE, 'Any'),
  (37, 'Active', 'player_unban', 'Log', 'Unban Player', 'unban', TRUE, 'Any'),
  (50, 'Active', 'player_ban_perm_future', 'Log', 'Future Permaban Player', 'fban', TRUE, 'Any'),
  (72, 'Invisible', 'player_ban_temp_old', 'Log', 'Previous Temp Ban', 'pretban', TRUE, 'Any'),
  (73, 'Invisible', 'player_ban_perm_old', 'Log', 'Previous Perm Ban', 'preban', TRUE, 'Any'),
  (92, 'Active', 'player_warn', 'Log', 'Warn Player', 'warn', TRUE, 'Any'),
  (146, 'Active', 'player_unmute', 'Log', 'Unmute Player', 'unmute', TRUE, 'Any');

-- AdKats links chat lines to players by name. Server messages, BrandNewGuy and
-- every fifth line (chat sent before a player's first stats upload) stay NULL.
UPDATE tbl_chatlog cl
INNER JOIN tbl_playerdata pd ON pd.SoldierName = cl.logSoldierName
SET cl.logPlayerID = pd.PlayerID
WHERE cl.ID MOD 5 <> 0;

INSERT INTO adkats_settings (server_id, setting_name, setting_type, setting_value) VALUES
  (1, 'Punishment Hierarchy', 'String[]', 'warn|kill|kick|tban60|tban1440|ban'),
  (1, 'Combine Server Punishments', 'Boolean', 'True'),
  (2, 'Punishment Hierarchy', 'String[]', 'kill|kick|tban120|ban'),
  (2, 'Combine Server Punishments', 'Boolean', 'False'),
  (3, 'Punishment Hierarchy', 'String[]', 'ban');

INSERT INTO adkats_records_main
  (server_id, command_type, command_action, command_numeric, target_name, target_id, source_name, record_message, record_time)
VALUES
  (1, 11, 11, 10080, 'MutedTalker', 17, 'SampleAdmin', 'Spamming chat', UTC_TIMESTAMP() - INTERVAL 30 MINUTE),
  (1, 8, 8, 0, 'BannedCheater', 15, 'SampleAdmin', 'Aimbot', UTC_TIMESTAMP() - INTERVAL 2 DAY),
  (1, 7, 7, 1440, 'TempBanned', 16, 'SampleAdmin', 'Teamkilling', UTC_TIMESTAMP() - INTERVAL 1 HOUR),
  (1, 7, 7, 60, 'GhostStrike', 117, 'SampleAdmin', 'Glitching', UTC_TIMESTAMP() - INTERVAL 3 DAY),
  (1, 92, 92, 0, 'Alex', 1, 'SampleAdmin', 'Language', UTC_TIMESTAMP() - INTERVAL 6 HOUR),
  (1, 9, 3, 0, 'LadderClimber', 18, 'SampleAdmin', 'Base raping', UTC_TIMESTAMP() - INTERVAL 3 DAY),
  (1, 9, 6, 0, 'LadderClimber', 18, 'SampleAdmin', 'Base raping', UTC_TIMESTAMP() - INTERVAL 2 DAY),
  (1, 9, 7, 60, 'LadderClimber', 18, 'SampleAdmin', 'Base raping', UTC_TIMESTAMP() - INTERVAL 1 DAY),
  (1, 10, 10, 0, 'LadderClimber', 18, 'SampleAdmin', 'Apologized', UTC_TIMESTAMP() - INTERVAL 12 HOUR),
  (1, 9, 3, 0, 'Forgiven', 20, 'SampleAdmin', 'Spawn camping', UTC_TIMESTAMP() - INTERVAL 5 DAY),
  (1, 10, 10, 0, 'Forgiven', 20, 'SampleAdmin', 'Helped new players', UTC_TIMESTAMP() - INTERVAL 4 DAY),
  (1, 10, 10, 0, 'Forgiven', 20, 'SampleAdmin', 'Helped new players', UTC_TIMESTAMP() - INTERVAL 3 DAY),
  (1, 10, 10, 0, 'Forgiven', 20, 'SampleAdmin', 'Helped new players', UTC_TIMESTAMP() - INTERVAL 2 DAY),
  (1, 3, 3, 0, 'GhostHunter', 101, 'SampleAdmin', 'Wrong squad', UTC_TIMESTAMP() - INTERVAL 8 HOUR),
  (1, 6, 6, 0, 'ViperHunter', 102, 'SampleAdmin', 'AFK', UTC_TIMESTAMP() - INTERVAL 20 HOUR);

-- RepeatOffender has more points than the server 1 ladder has steps.
INSERT INTO adkats_records_main
  (server_id, command_type, command_action, command_numeric, target_name, target_id, source_name, record_message, record_time)
SELECT 1, 9, 6, 0, 'RepeatOffender', 19, 'SampleAdmin', 'Spawn killing', UTC_TIMESTAMP() - INTERVAL (days.d + 1) DAY
FROM (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
      UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8) days;

INSERT INTO adkats_bans (player_id, latest_record_id, ban_status, ban_startTime, ban_endTime)
SELECT
  target_id,
  record_id,
  IF(command_type = 8 OR record_time + INTERVAL command_numeric MINUTE > UTC_TIMESTAMP(), 'Active', 'Expired'),
  record_time,
  IF(command_type = 8, record_time + INTERVAL 20 YEAR, record_time + INTERVAL command_numeric MINUTE)
FROM adkats_records_main
WHERE command_type IN (7, 8);

INSERT INTO adkats_infractions_server (player_id, server_id, punish_points, forgive_points, total_points)
SELECT target_id, server_id, SUM(command_type = 9), SUM(command_type = 10), SUM(command_type = 9) - SUM(command_type = 10)
FROM adkats_records_main
WHERE command_type IN (9, 10)
GROUP BY target_id, server_id;

INSERT INTO adkats_infractions_global (player_id, punish_points, forgive_points, total_points)
SELECT target_id, SUM(command_type = 9), SUM(command_type = 10), SUM(command_type = 9) - SUM(command_type = 10)
FROM adkats_records_main
WHERE command_type IN (9, 10)
GROUP BY target_id;

-- Server 1's map_current flag is stale: it still marks Grand Bazaar while
-- tbl_server reports Wake Island as the live map.
INSERT INTO adkats_maplist
  (server_id, map_index, map_file, map_mode, map_rounds, map_current, map_next, map_round_current, map_round_total, maplist_time)
VALUES
  (1, 0, 'MP_001', 'ConquestLarge0', 2, TRUE, FALSE, 1, 2, UTC_TIMESTAMP()),
  (1, 1, 'MP_003', 'ConquestLarge0', 2, FALSE, TRUE, 0, 2, UTC_TIMESTAMP()),
  (1, 2, 'MP_007', 'ConquestLarge0', 2, FALSE, FALSE, 0, 2, UTC_TIMESTAMP()),
  (1, 3, 'XP1_004', 'ConquestLarge0', 2, FALSE, FALSE, 0, 2, UTC_TIMESTAMP()),
  (1, 4, 'MP_017', 'ConquestLarge0', 2, FALSE, FALSE, 0, 2, UTC_TIMESTAMP()),
  (1, 5, 'XP1_002', 'ConquestLarge0', 2, FALSE, FALSE, 0, 2, UTC_TIMESTAMP()),
  (2, 0, 'MP_Subway', 'TeamDeathMatch0', 1, TRUE, FALSE, 1, 1, UTC_TIMESTAMP()),
  (2, 1, 'XP2_Office', 'TeamDeathMatch0', 1, FALSE, TRUE, 0, 1, UTC_TIMESTAMP()),
  (2, 2, 'XP2_Factory', 'TeamDeathMatch0', 1, FALSE, FALSE, 0, 1, UTC_TIMESTAMP()),
  (2, 3, 'XP2_Palace', 'TeamDeathMatch0', 1, FALSE, FALSE, 0, 1, UTC_TIMESTAMP()),
  (2, 4, 'XP2_Skybar', 'SquadDeathMatch0', 1, FALSE, FALSE, 0, 1, UTC_TIMESTAMP());
