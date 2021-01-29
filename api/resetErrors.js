require('dotenv').config()

const dbSql = require('./db-sql');

dbSql.query("select originUrl from extracts where error LIKE '%Timeout%'", (err, rows) => {
    console.log(rows);
    rows.map(r => {
        const up = `update sites set crawled = 0, locked = 0, error = '' where url = '${r.originUrl}'`;
        dbSql.query(up, (err) => {
            if (!err) {
                const del = `delete from extracts where originUrl = '${r.originUrl}'`;
	    }
	})
    });
});


