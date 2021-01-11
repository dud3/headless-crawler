require('dotenv').config()

const fs = require('fs');

import { sparseInt, wait, rand } from "./utils";
const { addSlashes, stripSlashes } = require('slashes');

import puppeteer, { LoadEvent, Page, EmulateOptions } from "puppeteer";
import Browser, { Npage, Url, Extract } from './Browser';
import core from "./core";

import eapi from "./api/extractor";

const argv = {
  "--headless": {
    v: true,
    f: v => v == "false" ? false : true
  },
  "--instances": {
    v: 1,
    f: v => sparseInt(v, 1)
  },
  "--tabs": {
    v: 4,
    f: v => Math.min(sparseInt(v, 10), 20)
  },
  "--closetab": {
    v: false,
    f: v => v == "true" ? true : false
  },
  "--sites": {
    v: 100,
    f: v => sparseInt(v, 100)
  },
  "--waitfor": {
    v: 3000,
    f: v => sparseInt(v, 3000)
  },
  "--timeout": {
    v: 60000,
    f: v => sparseInt(v, 60000)
  },
  "--syncerrors": {
    v: "" as any, // all,epte,oe
    f: (v) => v.split(',')
  },
  "--synctimeouts": {
    v: false,
    f: eval
  },
  "--debug": {
    v: false,
    f: eval
  }
};

if(process.argv.length > 2) {
  process.argv.splice(0, 2);
  process.argv.map(a => a.split('=')).map(a => { const c = argv[a[0]]; if (c !== undefined) c.v = a[1]; });
}

for(const k in argv) argv[k].v = argv[k].f(argv[k].v);

console.log(argv);

const writeUrls = (urls) => {
  fs.writeFileSync('urls.json', JSON.stringify(urls));
}

const readUrls = () => {
  return JSON.parse(fs.readFileSync('urls.json'));
}

const instance = async () => {
  const extractPromise = async (npage: Npage): Promise<Npage> => {
    return new Promise(async (resolve, reject) => {

      let theExtract = new Extract;
      theExtract.crawler = process.env.CRAWLER as string;

      try {
        // Extraction
        const extract = await core(npage.blocker, npage.page, "https://" + npage.url.url, argv["--timeout"].v, argv["--waitfor"].v);

        theExtract.originUrl = addSlashes(npage.url.url);
        theExtract.url = extract.url;
        theExtract.title = addSlashes(extract.title) || '',
        theExtract.blockedRequests = (extract.blocked && extract.blocked.length) || 0,
        theExtract.totalRequests = extract.requests.amount,
        theExtract.canvasFingerprint = 0,
        theExtract.keyLogging = Object.keys(extract.reports.key_logging).length,
        theExtract.sessionRecording = Object.keys(extract.reports.session_recorders).length,
        theExtract.totalSize = extract.pageSize,
        theExtract.contentSize = extract.readability.length || 0,
        theExtract.contentReaderable = 1, // extract.readability == null ? '' : extract.readability,
        theExtract.loadSpeed = extract.timing.loadTime,
        theExtract.goto = {
          start: extract.goto.start,
          end: extract.goto.end
        };

        npage.extract = theExtract;
        resolve(npage);
      } catch (err) {
        // note: these cause infinite loop

        if (err.message == 'Error: Protocol error (Page.navigate): Target closed.' ||
            err.message == 'Error: Protocol error (Page.navigate): Session closed. Most likely the page has been closed.') {
          process.exit();
        }

        npage.error = err.message.slice(0, 64);

        theExtract.originUrl = addSlashes(npage.url.url);
        theExtract.error = err.message;

        npage.extract = theExtract;

        reject(npage);
      }
    });
  }

  const extractStore = async (npage) => {
    await eapi.post('/api/v0/extracts/store', npage.extract)
    return npage;
  }

  const handlePage = (index: number) => {
    return promisses[index]() // note: ()
    .then(async npage => {
      success++;
      console.log(`Resolved(${success}): ${npage.url.url}` +
        ` - goto time: ${npage.extract.goto.end - npage.extract.goto.start}` +
        ` - dequeue time: ${Date.now() - npage.extract.goto.start}`);

      return Promise.resolve(await extractStore(npage));
    })
    .catch(async npage => {
      failed++
      console.log(`Failed(${failed}): ${npage.url.url} - ${npage.error}`);

      return Promise.resolve(await extractStore(npage));
    })
    .then(async npage => { // finally
      processed++;

      if (urls.length <= tabs + 32) { urls = await fetchUrls(); }

      console.log("Urls left: ", urls.length);

      if (urls.length > 0) {
        const urlids = urls.map(e => e.id);

        console.log(urlids, npage.url, urlids.indexOf(npage.url.id));

        if (urlids.indexOf(npage.url.id) > -1) {
          urls.splice(urlids.indexOf(npage.url.id), 1); // remove processed
        }

        writeUrls(urls); // save

        const url = urls[rand(urls.length)]; // avoid collision of multiple promises

        if (url) {
          console.log(`Swapping tab(${npage.index}): ${npage.url.url} -> ${url.url}\n`);
          npage.url = url

          if (argv['--closetab'].v) {
            await browser.closePage(npage);
            npage = await browser.newPage(npage.url, npage.index);
          }

          await handlePage(npage.index);
        }
      } else {
        console.log(`Waiting for last promisses... seconds elapsed = ${Math.floor((Date.now() - cstime) / 1000)} (${Date.now() - cstime}ms)`);
        await wait(60000);
        process.exit();
      }
    });
  }

  const fetchUrls = async () => {
    const urls = readUrls();

    if (urls.length < urlsLimit) {
      const getUrls = await eapi.get(`/api/v0/sites/get?take=1024`); // Locks sites
      getUrls.data.map(r => { urls.push(r) });
    }

    writeUrls(urls);

    return urls;
  }

  const browser = new Browser({ id: "ys", blocker: true, headless: argv['--headless'].v });
  await browser.launch();

  let tabs: number = argv['--tabs'].v;

  let processed: number = 0;
  let success: number = 0;
  let failed: number = 0;

  let urlsLimit = 1024;
  let urls = await fetchUrls();

  if (urls.length === 0) { console.log("Nothing to crawl."); process.exit() };

  const pages: Array<Npage> = await browser.newPages(urls.slice(0, tabs));
  const promisses: Array<() => Promise<Npage>> = [];

  const cstime = Date.now();

  console.log(`Crawler: ${process.env.CRAWLER} -> Tabs: ${promisses.length}\n`);

  pages.map((npage) => { promisses.push(() => extractPromise(npage)); }); // Initial tabs

  // kickstart

  promisses.map((p, i) => { handlePage(i); });
};

instance();