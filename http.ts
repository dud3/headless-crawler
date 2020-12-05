import Browser from './Browser';

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
  const browser = new Browser('x', true, 600, 200);
  await browser.launch();
  await browser.newPages(20);

  app.get('/', function (req: any, res: any) {
    res.send("The rest api layer of the extractor, api docs coming soon...");
  });

  app.post('/url', async function (req: any, res: any) {
    let blocked: Array<any> = [];
    let thextract: any = {};

    const cbs: Record<string, any> = {
        'request-blocked': (request: any) => { blocked.push(request); /* console.log(request.url); */ },
        'script-injected': (script: string, url: string) => { /* console.log(script, url); */ },
        'browser-extract-data': (extract: any) => { thextract = extract; }
    }

    await core.main([req.body.url], cbs, 8000, true);

    // todo: remove me

    thextract.canvas_fingerprinters = thextract.reports.canvas_fingerprinters.fingerprinters.length;
    thextract.canvas_font_fingerprinters = Object.keys(thextract.reports.canvas_font_fingerprinters.canvas_font).length;
    thextract.key_logging = Object.keys(thextract.reports.key_logging).length;
    thextract.session_recorders = Object.keys(thextract.reports.session_recorders).length;

    delete thextract.reports;

    thextract.blocked = {} as any;
    thextract.blocked.data = blocked.map(b => { return { tabId: b.tabId, type: b.type, url: b.url } });
    thextract.blocked.amount = thextract.blocked.data.length;

    res.json(thextract);
  });

  // todo: remove me

  app.post('/extractor/readability', async function (req: any, res: any) {
    const pages = await browser.assignPages([req.body.url]);
    const fpages = pages.filter(p => p.url.length > 0);

    console.log(fpages);

    for (const key in fpages) {
      const extract = await readability.main(fpages[key]);

      res.json(extract);

      await browser.close(fpages[key].page);
      await browser.newPages(1);
    }
  });

  http.listen(port, function() {
    console.log("listening on *:" + port);
  });
})();