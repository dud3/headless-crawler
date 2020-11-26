import core from "./core";
import * as path from "path";

const port = 3000
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

  await core.main(req.body.url, cbs, 8000, true);

  thextract.blocked = {} as any;
  thextract.blocked.data = blocked.map(b => { return { tabId: b.tabId, type: b.type, url: b.url } });
  thextract.blocked.amount = thextract.blocked.data.length;

  res.json(thextract);
});

http.listen(port, function() {
  console.log("listening on *:" + port);
});
