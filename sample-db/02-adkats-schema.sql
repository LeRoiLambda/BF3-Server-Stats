-- The AdKats tables the site reads, defined as in the LeRoiLambda AdKats fork's
-- adkats.sql (https://github.com/leroilambda/adkats). adkats_maplist only
-- exists in that fork.

ALTER TABLE `tbl_chatlog`
  ADD COLUMN `logPlayerID` INT(10) UNSIGNED DEFAULT NULL,
  ADD INDEX (`logPlayerID`),
  ADD CONSTRAINT `tbl_chatlog_ibfk_player_id` FOREIGN KEY (`logPlayerID`)
    REFERENCES `tbl_playerdata` (`PlayerID`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `adkats_commands` (
  `command_id` int(11) unsigned NOT NULL,
  `command_active` enum('Active','Disabled','Invisible') CHARACTER SET 'utf8' COLLATE 'utf8_unicode_ci' NOT NULL DEFAULT 'Active',
  `command_key` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `command_logging` ENUM('Log','Mandatory','Ignore', 'Unable') CHARACTER SET 'utf8' COLLATE 'utf8_unicode_ci' NOT NULL DEFAULT 'Log',
  `command_name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `command_text` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `command_playerInteraction` BOOLEAN NOT NULL,
  `command_access` enum('Any','AnyHidden','AnyVisible','GlobalVisible','TeamVisible','SquadVisible') CHARACTER SET 'utf8' COLLATE 'utf8_unicode_ci' NOT NULL DEFAULT 'Any',
  PRIMARY KEY (`command_id`),
  UNIQUE KEY `command_key_UNIQUE` (`command_key`),
  UNIQUE KEY `command_text_UNIQUE` (`command_text`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='AdKats - Command List';

CREATE TABLE `adkats_records_main` (
  `record_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `server_id` smallint(5) unsigned NOT NULL,
  `command_type` int(11) unsigned NOT NULL,
  `command_action` int(11) unsigned NOT NULL,
  `command_numeric` int(11) NOT NULL DEFAULT '0',
  `target_name` varchar(45) COLLATE utf8_unicode_ci NOT NULL DEFAULT 'NoTarget',
  `target_id` int(11) unsigned DEFAULT NULL,
  `source_name` varchar(45) COLLATE utf8_unicode_ci NOT NULL DEFAULT 'NoSource',
  `source_id` int(11) unsigned DEFAULT NULL,
  `record_message` varchar(500) COLLATE utf8_unicode_ci NOT NULL DEFAULT 'NoMessage',
  `record_time` datetime NOT NULL,
  `adkats_read` enum('Y','N') COLLATE utf8_unicode_ci NOT NULL DEFAULT 'N',
  `adkats_web` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`record_id`),
  KEY `adkats_records_main_fk_server_id` (`server_id`),
  KEY `adkats_records_main_fk_command_type` (`command_type`),
  KEY `adkats_records_main_fk_command_action` (`command_action`),
  KEY `adkats_records_main_fk_target_id` (`target_id`),
  KEY `adkats_records_main_fk_source_id` (`source_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='AdKats - Main Records';

CREATE TABLE `adkats_bans` (
  `ban_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `player_id` int(11) unsigned NOT NULL,
  `latest_record_id` int(11) unsigned NOT NULL,
  `ban_notes` varchar(150) COLLATE utf8_unicode_ci NOT NULL DEFAULT 'NoNotes',
  `ban_status` enum('Active','Expired','Disabled') COLLATE utf8_unicode_ci NOT NULL DEFAULT 'Active',
  `ban_startTime` datetime NOT NULL,
  `ban_endTime` datetime NOT NULL,
  `ban_enforceName` enum('Y','N') COLLATE utf8_unicode_ci NOT NULL DEFAULT 'N',
  `ban_enforceGUID` enum('Y','N') COLLATE utf8_unicode_ci NOT NULL DEFAULT 'Y',
  `ban_enforceIP` enum('Y','N') COLLATE utf8_unicode_ci NOT NULL DEFAULT 'N',
  `ban_sync` varchar(100) COLLATE utf8_unicode_ci NOT NULL DEFAULT '-sync-',
  PRIMARY KEY (`ban_id`),
  UNIQUE KEY `player_id_UNIQUE` (`player_id`),
  KEY `adkats_bans_fk_latest_record_id` (`latest_record_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='AdKats - Ban List';

CREATE TABLE `adkats_infractions_global` (
  `player_id` int(11) unsigned NOT NULL,
  `punish_points` int(11) NOT NULL,
  `forgive_points` int(11) NOT NULL,
  `total_points` int(11) NOT NULL,
  PRIMARY KEY (`player_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='AdKats - Global Player Infraction Points';

CREATE TABLE `adkats_infractions_server` (
  `player_id` int(11) unsigned NOT NULL,
  `server_id` smallint(5) unsigned NOT NULL,
  `punish_points` int(11) NOT NULL,
  `forgive_points` int(11) NOT NULL,
  `total_points` int(11) NOT NULL,
  PRIMARY KEY (`player_id`, `server_id`),
  KEY `adkats_infractions_server_fk_server_id` (`server_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='AdKats - Server Specific Player Infraction Points';

CREATE TABLE `adkats_settings` (
  `server_id` smallint(5) unsigned NOT NULL,
  `setting_name` varchar(200) COLLATE utf8_unicode_ci NOT NULL DEFAULT 'SettingName',
  `setting_type` varchar(45) COLLATE utf8_unicode_ci NOT NULL DEFAULT 'SettingType',
  `setting_value` varchar(3000) COLLATE utf8_unicode_ci NOT NULL DEFAULT 'SettingValue',
  PRIMARY KEY (`server_id`, `setting_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='AdKats - Server Setting List';

CREATE TABLE `adkats_maplist` (
  `server_id` SMALLINT(5) UNSIGNED NOT NULL,
  `map_index` INT(10) UNSIGNED NOT NULL,
  `map_file` VARCHAR(100) COLLATE utf8_unicode_ci NOT NULL,
  `map_mode` VARCHAR(100) COLLATE utf8_unicode_ci NOT NULL,
  `map_rounds` INT(10) UNSIGNED NOT NULL,
  `map_current` BOOLEAN NOT NULL DEFAULT FALSE,
  `map_next` BOOLEAN NOT NULL DEFAULT FALSE,
  `map_round_current` INT(10) UNSIGNED NOT NULL DEFAULT 0,
  `map_round_total` INT(10) UNSIGNED NOT NULL DEFAULT 0,
  `maplist_time` DATETIME NOT NULL,
  PRIMARY KEY (`server_id`, `map_index`),
  KEY `adkats_maplist_server_current` (`server_id`, `map_current`),
  KEY `adkats_maplist_server_next` (`server_id`, `map_next`),
  CONSTRAINT `adkats_maplist_server_id_fk` FOREIGN KEY (`server_id`)
    REFERENCES `tbl_server` (`ServerID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='AdKats - Server Maplist';
