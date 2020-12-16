-- Adminer 4.7.8 MySQL dump

SET NAMES utf8;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

SET NAMES utf8mb4;

DROP TABLE IF EXISTS `extracts`;
CREATE TABLE `extracts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `title` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `blockedRequests` int NOT NULL,
  `totalRequests` int NOT NULL,
  `canvasFingerprint` int NOT NULL,
  `keyLogging` int NOT NULL,
  `sessionRecording` int NOT NULL,
  `totalSize` bigint NOT NULL,
  `contentSize` bigint NOT NULL COMMENT 'length of text output of readability in characters',
  `contentReaderable` tinyint NOT NULL,
  `loadSpeed` double NOT NULL COMMENT 'seconds to document loaded',
  `loadFailed` tinyint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `sites`;
CREATE TABLE `sites` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `url` varchar(2024) NOT NULL,
  `crawled` tinyint(1) NOT NULL DEFAULT '0',
  `carwlTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `error` varchar(2024) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- 2020-12-16 00:23:16