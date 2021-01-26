const dbSql = require('./../db-sql');

const fs = require('fs');

((req, res) => {
  const crawled = `select count(id) as crawled from extracts where error = ''`;
  const error = `select count(id) as errors from extracts where error <> ''`;

  dbSql.query(crawled, (err, r0) => {
    dbSql.query(error, (err, r1) => {

      const res = {
        crawled: r0[0].crawled,
        errors: r1[0].errors
      };

      fs.writeFileSync('./cache/stats.json', JSON.stringify(res));

      process.exit();
    });
  });
})();
