import dbSql from "./db-sql";

import Browser, { Npage } from './Browser';

import core from "./core";
import readability from "./readability";

import * as path from "path";

const port = 3001
const express = require('express')
const bodyParser = require('body-parser');
const app = express();
app.set("port", port);

let http = require("http").Server(app);

app.use(function(req: any, res: any, next: any) {
  res.header("Access-Control-Allow-Origin", "*"); // note: for now any origin allowed
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.raw());

// Browser instances

(async () => {
  /*
  const browser = new Browser({
    id: 'xs',
    blocker: true,
    block: ["blockMedias", "blockImages", "blockStyles", "blockFonts"],
    chromeArgs: [
    "--disable-extensions-except=/home/dud3/git/headless-crawler/extension/bypass-paywalls-chrome-clean",
    "--load-extension=/home/dud3/git/headless-crawler/extension/bypass-paywalls-chrome-clean"
  ]});
  await browser.launch();
  await browser.newPages(20);
  */

  app.get('/', function (req: any, res: any) {
    res.send("The rest api layer of the extractor, api docs coming soon...");
  });

  app.post('/api/v0/extracts/get', function (req: any, res: any) {
    console.log(req.body.urls);

    const condition = req.body.urls.map(u => `(originUrl LIKE '${u}')`).join(' or ');
    const sql = `select * from extracts where 1 and (${condition}) `;

    console.log(sql);

    dbSql.query(sql, (err, rows) => { res.json(rows); });
  });

  /*
  app.post('/extractor/readability', async function (req: any, res: any) {
    const pages: Array<Npage> = await browser.newPages([req.body.url]);

    pages.map(async page => {
      const extract = await readability.main(page);

      res.json(extract);

      await browser.closePage(page);
      await browser.newPages(1);
    });
  });
  */

  http.listen(port, function() {
    console.log("listening on *:" + port);
  });
})();