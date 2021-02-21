const fs = require('fs');

import dbSql from "./db-sql";

import { sparseInt, wait, rand } from "./utils";
const { addSlashes, stripSlashes } = require('slashes');

import puppeteer, { LoadEvent, Page, EmulateOptions } from "puppeteer";
import Browser, { Npage, Url, Extract } from './Browser';
import core from "./core";

import readability from "./readability";

const port = 3002
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

(async () => {

  // Browser instances

  let browser = new Browser({
    id: 'xs',
    headless: false,
    blocker: false,
    block: ["blockMedias", "blockImages", "blockStyles", "blockFonts"],
    chromeArgs: [
    "--disable-extensions-except=/home/dud3/git/headless-crawler/extension/bypass-paywalls-chrome-clean",
    "--load-extension=/home/dud3/git/headless-crawler/extension/bypass-paywalls-chrome-clean"
  ]});
  await browser.launch();

  let browser1 = new Browser({
    id: 'BlockerDisabled',
    headless: false,
    blocker: false,
    // block: ["blockMedias", "blockImages", "blockStyles", "blockFonts"],
    chromeArgs: [
    "--disable-extensions-except=/home/dud3/git/headless-crawler/extension/bypass-paywalls-chrome-clean",
    "--load-extension=/home/dud3/git/headless-crawler/extension/bypass-paywalls-chrome-clean"
  ]});
  await browser1.launch();

  app.get('/', function (req: any, res: any) {
    res.send("The rest api layer of the extractor, api docs coming soon...");
  });

  // ---

  app.post('/extractor/extract' , async function(req: any, res: any) {
    const urls: Array<Url> = [];

    req.body.urls.map(url => {
      urls.push({ id: Math.random() + '', url: 'http://' + url, blocker: true });
    })

    console.log(urls);

    const promisses: Array<Promise<Npage>> = []
    const npages: Array<Npage> = await browser.newPages(urls);
    const extracts = [];

    npages.map(async npage => {
      promisses.push(new Promise(async (resolve, reject) => {
        try {
          const extract = await core(npage.blocker, npage.page, npage.url.url);

          extracts.push(extract);

          await browser.closePage(npage);

          resolve(npage);
        } catch (e) {
          extracts.push({ success: false });
          await browser.closePage(npage);

          resolve(npage);
        }
      }));
    });

    Promise.all(promisses).then(() => { res.json(extracts); });
  });

  // ---

  app.post('/extractor/readability', async function (req: any, res: any) {
    // todo: remove me
    const iextract = (e: {} = {}) => {
      let o = {
        url: "",
        byline: null,
        content: "",
        fullContent: "",
        dir: null,
        excerpt: "",
        length: 0,
        siteName: "",
        textContent: "",
        title: ""
      };

      if (Object.keys(e).length > 0) {
        for (const k in e) {
          if (o[k] !== undefined && e[k] !== null) {
            o[k] = e[k];
          }
        }
      }

      return o;
    }

    console.log(`Browser: ${browser.id}`);
    console.log(req.body);

    const urls: Array<Url> = [];

    // Swap browsers

    const loadJs = req.body.blockerDisabled && req.body.blockerDisabled == true

    // todo: use this

    if (loadJs) { browser = browser1; }

    const urlsWhitelisted = JSON.parse(fs.readFileSync('urls-whitelist.json'));

    req.body.urls.map(url => {
      const blocker = (urlsWhitelisted.indexOf(url) > -1) ? undefined : true
      urls.push({ id: Math.random() + '', url: 'http://' + url, blocker: blocker });
    })

    console.log(urls);

    const promisses: Array<Promise<Npage>> = []
    const npages: Array<Npage> = await browser.newPages(urls);
    const extracts = [];

    npages.map(async npage => {
      promisses.push(new Promise(async (resolve, reject) => {
        try {
          const read = await readability.main(npage, loadJs);
          const extract = iextract(read.read);

          extract.fullContent = read.fullContent;

          extract.url = npage.url.url;
          extracts.push(extract);

          await browser.closePage(npage);

          resolve(npage);
        } catch (e) {
          extracts.push(iextract({ url: npage.url.url }));
          await browser.closePage(npage);

          resolve(npage);
        }
      }));
    });

    Promise.all(promisses).then(() => {
      res.json(extracts);
    })

  });

  http.listen(port, function() {
    console.log("listening on *:" + port);
  });
})();
