import dbSql from "./db-sql";

import Browser, { Npage, Url, Extract } from './Browser';

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

// todo: remove me

// Browser instances

(async () => {
  const browser = new Browser({
    id: 'xs',
    headless: false,
    blocker: true,
    block: ["blockMedias", "blockImages", "blockStyles", "blockFonts"],
    chromeArgs: [
    "--disable-extensions-except=/home/dud3/git/headless-crawler/extension/bypass-paywalls-chrome-clean",
    "--load-extension=/home/dud3/git/headless-crawler/extension/bypass-paywalls-chrome-clean"
  ]});
  await browser.launch();

  const pages: Array<Npage> = await browser.newPages([]);

  app.get('/', function (req: any, res: any) {
    res.send("The rest api layer of the extractor, api docs coming soon...");
  });

  app.post('/extractor/readability', async function (req: any, res: any) {

    // todo: remove me

    const iextract = (e: {} = {}) => {
      let o = {
        url: "",
        byline: null,
        content: "",
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

    console.log(req.body.urls);

    const urls: Array<Url> = [];

    req.body.urls.map(url => {
      urls.push({ id: Math.random() + '', url: 'http://' + url });
    })

    console.log(urls);

    const promisses: Array<Promise<Npage>> = []
    const npages: Array<Npage> = await browser.newPages(urls);
    const extracts = [];

    npages.map(async npage => {
      promisses.push(new Promise(async (resolve, reject) => {
        try {
          const extract = iextract(await readability.main(npage));

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