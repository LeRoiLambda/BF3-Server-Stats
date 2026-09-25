-- Tables of the Procon stats logger, defined as the plugin creates them. They
-- use latin1, like databases first created under MySQL 5.x.

CREATE TABLE `tbl_games` (
  `GameID` tinyint(4) unsigned NOT NULL AUTO_INCREMENT,
  `Name` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`GameID`),
  UNIQUE KEY `name_unique` (`Name`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tbl_server` (
  `ServerID` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ServerGroup` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `IP_Address` VARCHAR(45) NULL DEFAULT NULL,
  `ServerName` VARCHAR(200) NULL DEFAULT NULL,
  `GameID` tinyint(4) unsigned NOT NULL DEFAULT '0',
  `usedSlots` SMALLINT UNSIGNED NULL DEFAULT 0,
  `maxSlots` SMALLINT UNSIGNED NULL DEFAULT 0,
  `mapName` VARCHAR(45) NULL DEFAULT NULL,
  `fullMapName` TEXT NULL DEFAULT NULL,
  `Gamemode` VARCHAR(45) NULL DEFAULT NULL,
  `GameMod` VARCHAR(45) NULL DEFAULT NULL,
  `PBversion` VARCHAR(45) NULL DEFAULT NULL,
  `ConnectionState` VARCHAR(45) NULL DEFAULT NULL,
  PRIMARY KEY (`ServerID`),
  INDEX `INDEX_SERVERGROUP` (`ServerGroup` ASC),
  UNIQUE INDEX `IP_Address_UNIQUE` (`IP_Address` ASC)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tbl_playerdata` (
  `PlayerID` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `GameID` tinyint(4) unsigned NOT NULL DEFAULT '0',
  `ClanTag` VARCHAR(10) NULL DEFAULT NULL,
  `SoldierName` VARCHAR(45) NULL DEFAULT NULL,
  `GlobalRank` SMALLINT UNSIGNED NOT NULL DEFAULT '0',
  `PBGUID` VARCHAR(32) NULL DEFAULT NULL,
  `EAGUID` VARCHAR(35) NULL DEFAULT NULL,
  `IP_Address` VARCHAR(15) NULL DEFAULT NULL,
  `IPv6_Address` VARBINARY(16) NULL DEFAULT NULL,
  `CountryCode` VARCHAR(2) NULL DEFAULT NULL,
  PRIMARY KEY (`PlayerID`),
  UNIQUE INDEX `UNIQUE_playerdata` (`GameID` ASC, `EAGUID` ASC),
  INDEX `INDEX_SoldierName` (`SoldierName` ASC)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tbl_server_player` (
  `StatsID` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ServerID` SMALLINT UNSIGNED NOT NULL,
  `PlayerID` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`StatsID`),
  UNIQUE INDEX `UNIQUE_INDEX` (`ServerID` ASC, `PlayerID` ASC),
  INDEX `fk_tbl_server_player_tbl_playerdata` (`PlayerID` ASC),
  INDEX `fk_tbl_server_player_tbl_server` (`ServerID` ASC),
  CONSTRAINT `fk_tbl_server_player_tbl_playerdata`
    FOREIGN KEY (`PlayerID`) REFERENCES `tbl_playerdata` (`PlayerID`)
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `fk_tbl_server_player_tbl_server`
    FOREIGN KEY (`ServerID`) REFERENCES `tbl_server` (`ServerID`)
    ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tbl_server_stats` (
  `ServerID` SMALLINT(5) UNSIGNED NOT NULL,
  `CountPlayers` BIGINT NOT NULL DEFAULT 0,
  `SumScore` BIGINT NOT NULL DEFAULT 0,
  `AvgScore` FLOAT NOT NULL DEFAULT 0,
  `SumKills` BIGINT NOT NULL DEFAULT 0,
  `AvgKills` FLOAT NOT NULL DEFAULT 0,
  `SumHeadshots` BIGINT NOT NULL DEFAULT 0,
  `AvgHeadshots` FLOAT NOT NULL DEFAULT 0,
  `SumDeaths` BIGINT NOT NULL DEFAULT 0,
  `AvgDeaths` FLOAT NOT NULL DEFAULT 0,
  `SumSuicide` BIGINT NOT NULL DEFAULT 0,
  `AvgSuicide` FLOAT NOT NULL DEFAULT 0,
  `SumTKs` BIGINT NOT NULL DEFAULT 0,
  `AvgTKs` FLOAT NOT NULL DEFAULT 0,
  `SumPlaytime` BIGINT NOT NULL DEFAULT 0,
  `AvgPlaytime` FLOAT NOT NULL DEFAULT 0,
  `SumRounds` BIGINT NOT NULL DEFAULT 0,
  `AvgRounds` FLOAT NOT NULL DEFAULT 0,
  PRIMARY KEY (`ServerID`),
  INDEX `fk_tbl_server_stats_tbl_server` (`ServerID` ASC),
  CONSTRAINT `fk_tbl_server_stats_tbl_server`
    FOREIGN KEY (`ServerID`) REFERENCES `tbl_server` (`ServerID`)
    ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tbl_playerstats` (
  `StatsID` INT UNSIGNED NOT NULL,
  `Score` INT NOT NULL DEFAULT '0',
  `Kills` INT UNSIGNED NOT NULL DEFAULT '0',
  `Headshots` INT UNSIGNED NOT NULL DEFAULT '0',
  `Deaths` INT UNSIGNED NOT NULL DEFAULT '0',
  `Suicide` INT UNSIGNED NOT NULL DEFAULT '0',
  `TKs` INT UNSIGNED NOT NULL DEFAULT '0',
  `Playtime` INT UNSIGNED NOT NULL DEFAULT '0',
  `Rounds` INT UNSIGNED NOT NULL DEFAULT '0',
  `FirstSeenOnServer` DATETIME NULL DEFAULT NULL,
  `LastSeenOnServer` DATETIME NULL DEFAULT NULL,
  `Killstreak` SMALLINT UNSIGNED NOT NULL DEFAULT '0',
  `Deathstreak` SMALLINT UNSIGNED NOT NULL DEFAULT '0',
  `HighScore` MEDIUMINT UNSIGNED NOT NULL DEFAULT '0',
  `rankScore` INT UNSIGNED NOT NULL DEFAULT '0',
  `rankKills` INT UNSIGNED NOT NULL DEFAULT '0',
  `Wins` INT UNSIGNED NOT NULL DEFAULT '0',
  `Losses` INT UNSIGNED NOT NULL DEFAULT '0',
  PRIMARY KEY (`StatsID`),
  INDEX `INDEX_Score` (`Score`),
  KEY `INDEX_RANK_SCORE` (`rankScore`),
  KEY `INDEX_RANK_KILLS` (`rankKills`),
  CONSTRAINT `fk_tbl_playerstats_tbl_server_player1`
    FOREIGN KEY (`StatsID`) REFERENCES `tbl_server_player` (`StatsID`)
    ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tbl_sessions` (
  `SessionID` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `StatsID` INT UNSIGNED NOT NULL,
  `StartTime` DATETIME NOT NULL,
  `EndTime` DATETIME NOT NULL,
  `Score` MEDIUMINT NOT NULL DEFAULT '0',
  `Kills` SMALLINT(5) UNSIGNED NOT NULL DEFAULT '0',
  `Headshots` SMALLINT(5) UNSIGNED NOT NULL DEFAULT '0',
  `Deaths` SMALLINT(5) UNSIGNED NOT NULL DEFAULT '0',
  `TKs` SMALLINT(5) UNSIGNED NOT NULL DEFAULT '0',
  `Suicide` SMALLINT(5) UNSIGNED NOT NULL DEFAULT '0',
  `RoundCount` TINYINT UNSIGNED NOT NULL DEFAULT '0',
  `Playtime` MEDIUMINT UNSIGNED NOT NULL DEFAULT '0',
  `Killstreak` SMALLINT(5) UNSIGNED NOT NULL DEFAULT '0',
  `Deathstreak` SMALLINT(5) UNSIGNED NOT NULL DEFAULT '0',
  `HighScore` MEDIUMINT UNSIGNED NOT NULL DEFAULT '0',
  `Wins` TINYINT UNSIGNED NOT NULL DEFAULT '0',
  `Losses` TINYINT UNSIGNED NOT NULL DEFAULT '0',
  PRIMARY KEY (`SessionID`),
  INDEX `INDEX_STATSID` (`StatsID` ASC),
  INDEX `INDEX_STARTTIME` (`StartTime` ASC),
  CONSTRAINT `fk_tbl_sessions_tbl_server_player`
    FOREIGN KEY (`StatsID`) REFERENCES `tbl_server_player` (`StatsID`)
    ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tbl_currentplayers` (
  `ServerID` smallint(6) NOT NULL,
  `Soldiername` varchar(45) NOT NULL,
  `GlobalRank` SMALLINT UNSIGNED NOT NULL DEFAULT '0',
  `ClanTag` varchar(45) DEFAULT NULL,
  `Score` int(11) NOT NULL DEFAULT '0',
  `Kills` int(11) NOT NULL DEFAULT '0',
  `Headshots` int(11) NOT NULL DEFAULT '0',
  `Deaths` int(11) NOT NULL DEFAULT '0',
  `Suicide` int(11) DEFAULT NULL,
  `Killstreak` smallint(6) DEFAULT '0',
  `Deathstreak` smallint(6) DEFAULT '0',
  `TeamID` tinyint(4) DEFAULT NULL,
  `SquadID` tinyint(4) DEFAULT NULL,
  `EA_GUID` varchar(45) NOT NULL DEFAULT '',
  `PB_GUID` varchar(45) NOT NULL DEFAULT '',
  `IP_aton` int(11) unsigned DEFAULT NULL,
  `CountryCode` varchar(2) DEFAULT '',
  `Ping` smallint(6) DEFAULT NULL,
  `PlayerJoined` datetime DEFAULT NULL,
  PRIMARY KEY (`ServerID`, `Soldiername`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tbl_weapons` (
  `WeaponID` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `GameID` tinyint(4) unsigned NOT NULL,
  `Friendlyname` varchar(45) DEFAULT NULL,
  `Fullname` varchar(100) DEFAULT NULL,
  `Damagetype` varchar(45) DEFAULT NULL,
  `Slot` varchar(45) DEFAULT NULL,
  `Kitrestriction` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`WeaponID`),
  UNIQUE KEY `unique` (`GameID`, `Fullname`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tbl_weapons_stats` (
  `StatsID` INT unsigned NOT NULL,
  `WeaponID` int(11) unsigned NOT NULL,
  `Kills` int(11) unsigned NOT NULL DEFAULT '0',
  `Headshots` int(11) unsigned NOT NULL DEFAULT '0',
  `Deaths` int(11) unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`StatsID`, `WeaponID`),
  KEY `Kills_Death_idx` (`Kills`, `Deaths`),
  KEY `Kills_Head_idx` (`Kills`, `Headshots`),
  CONSTRAINT `fk_tbl_weapons_stats_tbl_server_player_`
    FOREIGN KEY (`StatsID`) REFERENCES `tbl_server_player` (`StatsID`)
    ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tbl_dogtags` (
  `KillerID` INT UNSIGNED NOT NULL,
  `VictimID` INT UNSIGNED NOT NULL,
  `Count` SMALLINT UNSIGNED NOT NULL DEFAULT '0',
  PRIMARY KEY (`KillerID`, `VictimID`),
  INDEX `fk_tbl_dogtags_tbl_server_player1` (`KillerID` ASC),
  INDEX `fk_tbl_dogtags_tbl_server_player2` (`VictimID` ASC),
  CONSTRAINT `fk_tbl_dogtags_tbl_server_player1`
    FOREIGN KEY (`KillerID`) REFERENCES `tbl_server_player` (`StatsID`)
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `fk_tbl_dogtags_tbl_server_player2`
    FOREIGN KEY (`VictimID`) REFERENCES `tbl_server_player` (`StatsID`)
    ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tbl_teamscores` (
  `ServerID` smallint(5) unsigned NOT NULL,
  `TeamID` smallint(5) unsigned NOT NULL,
  `Score` int(11) DEFAULT NULL,
  `WinningScore` int(11) DEFAULT NULL,
  PRIMARY KEY (`ServerID`, `TeamID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tbl_chatlog` (
  `ID` INT NOT NULL AUTO_INCREMENT,
  `logDate` DATETIME NULL DEFAULT NULL,
  `ServerID` SMALLINT UNSIGNED NOT NULL,
  `logSubset` VARCHAR(45) NULL DEFAULT NULL,
  `logSoldierName` VARCHAR(45) NULL DEFAULT NULL,
  `logMessage` TEXT NULL DEFAULT NULL,
  PRIMARY KEY (`ID`),
  INDEX `INDEX_SERVERID` (`ServerID` ASC),
  INDEX `INDEX_logDate` (`logDate` ASC)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tbl_mapstats` (
  `ID` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ServerID` SMALLINT UNSIGNED NOT NULL DEFAULT '0',
  `TimeMapLoad` DATETIME NULL DEFAULT NULL,
  `TimeRoundStarted` DATETIME NULL DEFAULT NULL,
  `TimeRoundEnd` DATETIME NULL DEFAULT NULL,
  `MapName` VARCHAR(45) NULL DEFAULT NULL,
  `Gamemode` VARCHAR(45) NULL DEFAULT NULL,
  `Roundcount` SMALLINT NOT NULL DEFAULT '0',
  `NumberofRounds` SMALLINT NOT NULL DEFAULT '0',
  `MinPlayers` SMALLINT NOT NULL DEFAULT '0',
  `AvgPlayers` DOUBLE NOT NULL DEFAULT '0',
  `MaxPlayers` SMALLINT NOT NULL DEFAULT '0',
  `PlayersJoinedServer` SMALLINT NOT NULL DEFAULT '0',
  `PlayersLeftServer` SMALLINT NOT NULL DEFAULT '0',
  PRIMARY KEY (`ID`),
  INDEX `ServerID_INDEX` (`ServerID` ASC)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
