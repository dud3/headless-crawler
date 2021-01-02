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
    \`referenceId\` varchar(1024) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    \`originUrl\` text COLLATE utf8mb4_unicode_ci NOT NULL,
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
    \`error\` text COLLATE utf8mb4_unicode_ci NOT NULL,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  ALTER TABLE extracts AUTO_INCREMENT = 1;

  DROP TABLE IF EXISTS \`sites\`;
  CREATE TABLE \`sites\` (
    \`id\` bigint NOT NULL AUTO_INCREMENT,
    \`url\` varchar(2024) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    \`crawled\` tinyint(1) NOT NULL DEFAULT '0',
    \`crawlTime\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`locked\` tinyint(1) NOT NULL DEFAULT '0',
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

  ALTER TABLE
      sites
      CONVERT TO CHARACTER SET utf8mb4
      COLLATE utf8mb4_unicode_ci;

  ALTER TABLE \`extracts\`
    CHANGE \`title\` \`title\` text COLLATE 'utf8mb4_unicode_ci' NOT NULL AFTER \`url\`;

  ALTER TABLE \`sites\`
    CHANGE \`crawlTime\` \`crawlTime\` timestamp NOT NULL DEFAULT '1970-01-01 01:01:01' AFTER \`crawled\`;

  ALTER TABLE sites AUTO_INCREMENT = 1;

  INSERT INTO \`sites\` (\`url\`, \`crawled\`, \`crawlTime\`, \`error\`) VALUES
    ('wsj.com',  0,  '2020-12-11 20:27:29',  ''),
    ('washingtonpost.com', 0,  '2020-12-11 20:27:32',  ''),
    ('wordpress.com',  0,  '2020-12-11 20:27:29',  ''),
    ('wired.com',  0,  '2020-12-11 20:27:32',  ''),
    ('reuters.com',  0,  '2020-12-11 20:27:31',  ''),
    ('mozilla.org',  0,  '2020-12-11 20:27:30',  ''),
    ('npr.org',  0,  '2020-12-11 20:27:37',  ''),
    ('007names.info',  0,  '2020-12-11 23:01:23',  ''), -- error
    ('newyorker.com',  0,  '2020-12-11 20:27:45',  ''),
    ('economist.com',  0,  '2020-12-11 20:27:42',  ''),
    ('wikipedia.org',  0,  '2020-12-11 20:27:39',  ''),
    ('tumblr.com', 0,  '2020-12-11 20:27:45',  ''),
    ('nautil.us',  0,  '2020-12-11 20:27:56',  ''),
    ('ycombinator.com',  0,  '2020-12-11 20:27:54',  ''),
    ('apple.com',  0,  '2020-12-11 20:27:49',  ''),
    ('arxiv.org',  0,  '2020-12-11 20:27:57',  ''),
    ('amazon.com', 0,  '2020-12-11 20:27:55',  ''),
    ('youtube.com',  0,  '2020-12-11 20:28:03',  ''),
    ('lwn.net',  0,  '2020-12-11 20:28:06',  ''),
    ('facebook.com', 0,  '2020-12-11 20:28:10',  ''),
    ('forbes.com', 0,  '2020-12-11 20:28:14',  ''),
    ('slate.com',  0,  '2020-12-11 20:28:15',  ''),
    ('paulgraham.com', 0,  '2020-12-11 20:28:13',  ''),
    ('anandtech.com',  0,  '2020-12-11 20:28:19',  ''),
    ('jacquesmattheij.com',  0,  '2020-12-11 23:00:55',  ''),
    ('cbc.ca', 0,  '2020-12-11 23:01:10',  ''),
    ('cnbc.com', 0,  '2020-12-11 23:01:19',  ''),
    ('37signals.com',  0,  '2020-12-11 23:01:02',  ''),
    ('phys.org', 0,  '2020-12-11 23:01:08',  ''),
    ('torrentfreak.com', 0,  '2020-12-11 23:01:12',  ''),
    ('zdnet.com',  0,  '2020-12-11 23:01:18',  ''),
    ('theregister.co.uk',  0,  '2020-12-11 23:01:12',  ''),
    ('acm.org',  0,  '2020-12-11 23:01:15',  ''),
    ('daringfireball.net', 0,  '2020-12-11 23:01:19',  ''),
    ('stackoverflow.com',  0,  '2020-12-11 23:01:20',  ''),
    ('stackexchange.com',  0,  '2020-12-11 23:01:23',  ''),
    ('01.media',  0,  '2020-12-11 23:01:23',  '') -- error
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
