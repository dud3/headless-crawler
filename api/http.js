require('dotenv').config()

const express = require('express')
const bodyParser = require('body-parser');
const dbSql = require('./db-sql');

const { addSlashes, stripSlashes } = require('slashes');

const app = express();
const port = 3000

app.set("port", port);

let http = require("http").Server(app);

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*"); // note: for now any origin allowed
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.raw());

app.get('/', function (req, res) {
  res.send("The rest api layer of the extractor, api docs coming soon...");
});

function iextract(e) {
  let o = {
    referenceId: '',
    originUrl: '',
    url: '',
    title: '',
    blockedRequests: 0,
    totalRequests: 0,
    canvasFingerprint: 0,
    keyLogging: 0,
    sessionRecording: 0,
    totalSize: 0,
    contentSize: 0,
    contentReaderable: 0,
    loadSpeed: 0,
    error: '',
    crawler: ''
  };

  if (e) {
    for (const k in e) {
      if (o[k] !== undefined && e[k] !== null) {
        o[k] = e[k];
      }
    }
  }

  return o;
}

app.post('/api/v0/extracts/get', function (req, res) {
  const condition = req.body.urls.map(u => `'${u}'`).join(',');
  const sql = `select * from extracts where originUrl in(${condition}) `;

  if (process.env.DEBUG) console.log(sql);

  const extracts = [];

  dbSql.query(sql, (err, rows) => {
    req.body.urls.map(u => {
      let extract = new iextract();
      extract.originUrl = u;

      rows.map(row => {
        if (row.originUrl == u) {
          extract = new iextract(row);
          extract.status = extract.error.length > 0 ? -1 : 1;
        }
      });

      extracts.push(extract);
    });

    res.json(extracts);
  });
});

app.post('/api/v0/extracts/store', function (req, res) {
  req.body = req.body;

  if (process.env.DEBUG) console.log(req.body);

  const extract = new iextract(req.body);

  try {
    const sql = `
      insert into extracts set
      referenceId = '${addSlashes(extract.referenceId)}',
      originUrl = '${extract.originUrl}',
      url = '${extract.url}',
      title = '${extract.title}',
      blockedRequests = '${extract.blockedRequests}',
      totalRequests = '${extract.totalRequests}',
      canvasFingerprint = '${extract.canvasFingerprint}',
      keyLogging = '${extract.keyLogging}',
      sessionRecording = '${extract.sessionRecording}',
      totalSize = '${extract.totalSize}',
      contentSize = '${extract.contentSize}',
      contentReaderable = '${extract.contentReaderable}',
      loadSpeed = '${extract.loadSpeed}',
      error = "${addSlashes(extract.error)}",
      crawler = '${addSlashes(extract.crawler)}'
    `

    if (process.env.DEBUG) console.log(sql);

    dbSql.query(`update sites set crawled = 1, error = '' where url = "${addSlashes(extract.originUrl)}"`);

    dbSql.query(sql, (err) => { if (err) throw err; else res.status(200).json(true); });
  } catch (e) {
    console.log(e);
  }
});

app.get('/api/v0/sites/get', function (req, res) {
  req.body.take = req.query.take || 128;

  const sql = `select id, url from sites where (crawled = 0 and length(error) = 0) and (locked = 0) order by id asc limit ${req.body.take}`

  if (process.env.DEBUG) console.log(sql);

  dbSql.query(sql, (err, rows) => {
    res.json(rows);

    const urls = rows.map(row => row.id).join(',');
    if (urls.length > 0) {
      const usql = `update sites set locked = 1 where id in(${urls})`;

      if (process.env.DEBUG) console.log(usql);

      dbSql.query(usql);
    }
  });
});

app.get('/api/v0/sites/lock', function (req, res) {
  if (req.query.url) {
    const sql = `update site set locked = 1 where url = '${req.query.url}'`;

    if (process.env.DEBUG) console.log(sql);

    dbSql.query(sql, (err, rows) => { if (erro) res.status(400).json(['Failed']); else res.json(rows); });
  } else {
    res.status(400).json([]);
  }
});

http.listen(port, function() {
  console.log("listening on *:" + port);
});
