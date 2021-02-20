require('dotenv').config()

const dbSql = require('./db-sql');
var tcpp = require('tcp-ping');

const where = '(crawled = 0 and length(error) = 0) and (locked = 0)'

let take = 1;
let skip = 0;
let i = 0;
const fetch = async (call) => {
    const sql = `select id, url from sites where ${where} order by id asc limit ${skip}, ${take}`
    return dbSql.query(sql, call);
}

const dofetech = () => {
    fetch(async (err, rows) => {
        skip += take;

        let urls = rows.length > 0 ? rows.map(row => row.url) : [];

        if (urls.length == 0) { prcess.ext('Nothing to probe!') }

        for (const key in urls) {
            await tcpp.probe(urls[key], 80, function(err, available) {
                // console.log(`Probe: - ${available ? 'alive' : 'dead'} - ${urls[key]}`);
                if (!available) { console.log(`${i} - Probe  - ${available ? 'alive' : 'dead'} - ${urls[key]}`); }

                i++
                if(i % take == 0) { dofetech() }
            });
        }

        for (const key in urls) {
            await tcpp.ping({ address: urls[key] }, function(err, data) {
                // console.log(data);
            });
        }
    })
}

(async () => {
    await dbSql.connect();
    dofetech()
})()