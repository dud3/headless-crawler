require('dotenv').config()

const dbSql = require('./db-sql');

dbSql.query("select id, originUrl from extracts where error LIKE '%Timeout%' limit 40", (err, rows) => {
    console.log(rows);
	const urls = rows.map(r => `'${r.originUrl}'`).join("'");
	console.log(urls);
    rows.map(r => {
        const up = `update sites set crawled = 0, locked = 0, error = '' where url in (${r.originUrl})`;
        dbSql.query(up, (err) => {
            if (!err) {
                const del = `delete from extracts where id = ${r.id}'`;
                console.log(del);
                dbSql.query(del);
            }
        });
    });
});

