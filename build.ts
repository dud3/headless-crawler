import dbSql from "./db-sql";

const sql = `
  SET NAMES utf8;
  SET time_zone = '+00:00';
  SET foreign_key_checks = 0;
  SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

  SET NAMES utf8mb4;

  DROP TABLE IF EXISTS \`extracts\`;
  CREATE TABLE \`extracts\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`url\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    \`title\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    \`blockedRequests\` int NOT NULL,
    \`totalRequests\` int NOT NULL,
    \`canvasFingerprint\` int NOT NULL,
    \`keyLogging\` int NOT NULL,
    \`sessionRecording\` int NOT NULL,
    \`totalSize\` bigint NOT NULL,
    \`contentSize\` bigint NOT NULL COMMENT 'length of text output of readability in characters',
    \`contentReaderable\` tinyint NOT NULL,
    \`loadSpeed\` double NOT NULL COMMENT 'seconds to document loaded',
    \`loadFailed\` tinyint unsigned NOT NULL DEFAULT '0',
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


  DROP TABLE IF EXISTS \`sites\`;
  CREATE TABLE \`sites\` (
    \`id\` bigint NOT NULL AUTO_INCREMENT,
    \`url\` varchar(2024) NOT NULL,
    \`crawled\` tinyint(1) NOT NULL DEFAULT '0',
    \`crawlTime\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`error\` varchar(2024) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  ALTER DATABASE
      extractor
      CHARACTER SET = utf8mb4
      COLLATE = utf8mb4_unicode_ci;

  ALTER TABLE
      extracts
      CONVERT TO CHARACTER SET utf8mb4
      COLLATE utf8mb4_unicode_ci;

  ALTER TABLE \`extracts\`
    CHANGE \`title\` \`title\` text COLLATE 'utf8mb4_unicode_ci' NOT NULL AFTER \`url\`;

  ALTER TABLE \`sites\`
    CHANGE \`crawlTime\` \`crawlTime\` timestamp NOT NULL DEFAULT '1970-01-01 01:01:01' AFTER \`crawled\`;

  INSERT INTO \`sites\` (\`id\`, \`url\`, \`crawled\`, \`crawlTime\`, \`error\`) VALUES
    (11,  'wsj.com',  1,  '2020-12-11 20:27:29',  ''),
    (13,  'washingtonpost.com', 1,  '2020-12-11 20:27:32',  ''),
    (14,  'wordpress.com',  1,  '2020-12-11 20:27:29',  ''),
    (16,  'wired.com',  1,  '2020-12-11 20:27:32',  ''),
    (17,  'reuters.com',  1,  '2020-12-11 20:27:31',  ''),
    (18,  'mozilla.org',  1,  '2020-12-11 20:27:30',  ''),
    (21,  'npr.org',  1,  '2020-12-11 20:27:37',  ''),
    (22,  'newyorker.com',  1,  '2020-12-11 20:27:45',  ''),
    (23,  'economist.com',  1,  '2020-12-11 20:27:42',  ''),
    (24,  'wikipedia.org',  1,  '2020-12-11 20:27:39',  ''),
    (28,  'tumblr.com', 1,  '2020-12-11 20:27:45',  ''),
    (29,  'nautil.us',  1,  '2020-12-11 20:27:56',  ''),
    (30,  'ycombinator.com',  1,  '2020-12-11 20:27:54',  ''),
    (31,  'apple.com',  1,  '2020-12-11 20:27:49',  ''),
    (32,  'arxiv.org',  1,  '2020-12-11 20:27:57',  ''),
    (33,  'amazon.com', 1,  '2020-12-11 20:27:55',  ''),
    (34,  'youtube.com',  1,  '2020-12-11 20:28:03',  ''),
    (45,  'lwn.net',  1,  '2020-12-11 20:28:06',  ''),
    (46,  'facebook.com', 1,  '2020-12-11 20:28:10',  ''),
    (47,  'forbes.com', 1,  '2020-12-11 20:28:14',  ''),
    (48,  'slate.com',  1,  '2020-12-11 20:28:15',  ''),
    (49,  'paulgraham.com', 1,  '2020-12-11 20:28:13',  ''),
    (50,  'anandtech.com',  1,  '2020-12-11 20:28:19',  ''),
    (59,  'jacquesmattheij.com',  1,  '2020-12-11 23:00:55',  ''),
    (60,  'cbc.ca', 1,  '2020-12-11 23:01:10',  ''),
    (61,  'cnbc.com', 1,  '2020-12-11 23:01:19',  ''),
    (62,  '37signals.com',  1,  '2020-12-11 23:01:02',  ''),
    (63,  'phys.org', 1,  '2020-12-11 23:01:08',  ''),
    (64,  'torrentfreak.com', 1,  '2020-12-11 23:01:12',  ''),
    (65,  'zdnet.com',  1,  '2020-12-11 23:01:18',  ''),
    (66,  'theregister.co.uk',  1,  '2020-12-11 23:01:12',  ''),
    (67,  'acm.org',  1,  '2020-12-11 23:01:15',  ''),
    (68,  'daringfireball.net', 1,  '2020-12-11 23:01:19',  ''),
    (69,  'stackoverflow.com',  1,  '2020-12-11 23:01:20',  ''),
    (70,  'stackexchange.com',  1,  '2020-12-11 23:01:23',  '')
`;

const promisses = [];
sql.split(';').map(s => {
  if(s.length > 0) {
    promisses.push(new Promise((resolve) => {
      dbSql.query(s, err => { resolve(err); });
    }));
  }
});

(async () => {
  const parr = await Promise.all(promisses);

  let e = {
    f: false,
    e: ''
  };

  for(const key in parr) {
    if(parr[key] != null) { e.f = true; e.e = parr[key]; break; }
  }

  if (e.f) console.log(e.e); else { console.log("Buuild successfull, database created."); process.exit(); }
})();
