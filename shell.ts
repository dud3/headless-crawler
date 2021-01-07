import { sparseInt, wait } from "./utils";
const { addSlashes, stripSlashes } = require('slashes')

import constants from './constants'

import puppeteer, { LoadEvent, Page, EmulateOptions } from "puppeteer";
import core from "./core";

import Browser, { Npage, Url, Extract } from './Browser';
import dbSql from "./db-sql";

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

const instance = async () => {
  const sqlExtract = async (npage) => {
    const extract = npage.extract;

    try {
      const sql = `
        insert into extracts set
        referenceId = '${extract.referenceId}',
        originUrl = '${extract.originUrl}',
        url = '${extract.url}',
        title = '${extract.title}',
        blockedRequests = ${extract.blockedRequests},
        totalRequests = ${extract.totalRequests},
        canvasFingerprint = ${extract.canvasFingerprint},
        keyLogging = ${extract.keyLogging},
        sessionRecording = ${extract.sessionRecording},
        totalSize = ${extract.totalSize},
        contentSize = ${extract.contentSize},
        contentReaderable = ${extract.contentReaderable},
        loadSpeed = ${extract.loadSpeed},
        error = '${extract.error}'
    `

      await dbSql.query(sql, (err) => { if (err) console.log(err); });
    } catch (e) {
      throw new Error(e);
    }
  }

  const sqlUrls = async (take: number = 1): Promise<Array<Url>> => {
    return new Promise((resolve) => {

      let condition = "(crawled = 0 and length(error) = 0)";

      let locked = " and (locked = 0) ";
        argv['--syncerrors'].v.map((c) => {
          switch (c) {
            case "all":
              locked = "";
              condition += " OR (length(error) > 0) ";
            break;
            case "epte":
              locked = "";
              condition += " OR (`error` LIKE '%Error: Protocol error%') ";
            break;

            case "eoe":
              locked = "";
              condition += " "; // todo: ...
            break;
          }
			});

      if(argv['--synctimeouts'].v) condition += " OR `error` LIKE '%TimeoutError%' ";

      const sql = `select * from sites where ${condition} ${locked} order by id asc limit ${take}`

      if (argv['--debug'].v) console.log(sql);

      dbSql.query(sql, async (err, rows) => {
        const ids = rows.map(r => r.id).join(',');
        if (ids.length > 0) {
          const idsql = `update sites set locked = 1 where id in(${ids})`;

          dbSql.query(idsql, async (err) => {
            resolve(rows.map(row => { return { id: row.id, url: row.url } }) || []);
          });
        } else {
          resolve([]);
        }
      });
    });
  }

  const sqlSites = async (): Promise<number> => {
    return new Promise((resolve, reject) => {
      dbSql.query(`select count(*) as sites from sites where crawled = 0 and length(error) = 0`, async (err, rows) => {
        if (err) reject(0); resolve(rows[0].sites);
      });
    });
  }

  const extractPromise = async (npage: Npage): Promise<Npage> => {
    return new Promise(async (resolve, reject) => {

      let theExtract = new Extract;

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

        try {
          await sqlExtract(npage);
          dbSql.query(`update sites set crawled = 1, error = '' where id = "${npage.url.id}"`);

          resolve(npage);
        } catch (e) {
          reject(e);
        }

      } catch (err) {
        npage.error = err.message;

        dbSql.query(`update sites set crawled = 1, error="${addSlashes(err.message)}" where id = "${npage.url.id}"`);

        theExtract.originUrl = addSlashes(npage.url.url);
        theExtract.error = err.message;

        npage.extract = theExtract;

        await sqlExtract(npage);

        reject(npage);
      }
    });
  }

  const handleTab = async (i: number) => {
     return promisses[i]() // note: array -> function -> promise -> npage, we did push extractPromises above, we can't let the execute until we then...then...catch
      .then(async npage => {
        success++;
        console.log(`Resolved(${success}): ${npage.url.url}` +
          ` - goto time: ${npage.extract.goto.end - npage.extract.goto.start}` +
          ` - dequeue time: ${Date.now() - npage.extract.goto.start}`);

        return Promise.resolve(npage);
      })
      .catch(async npage => {
        failed++;
        console.log(`Failed(${failed}): ${npage.url.url} - ${npage.error}`);

        return Promise.resolve(npage);
      })
      .then(async npage => { // finally
        processed++;

        if(urls.length <= tabs) (await sqlUrls(1)).map(r => { urls.push(r) });

        if (urls.length > 0) {
          console.log(`Swapping tab(${npage.index}) - ${npage.url.url} -> ${urls[0].url}\n`);

          npage.url = urls[0];

          if (argv['--closetab'].v) {
            await browser.closePage(npage);
            npage = await browser.newPage(npage.url, npage.index);
          }

          promisses[npage.index] = () => extractPromise(npage);

          urls.splice(0, 1);
        } else {
          console.log(`Waiting for last promisses... seconds elapsed = ${Math.floor((Date.now() - cstime) / 1000)} (${Date.now() - cstime}ms)`);
          await wait(60000);
          await browser.close();
          process.exit();
        }

        if (await sqlSites() > 0) await handleTab(npage.index);
      });
  }

  const browser = new Browser({ id: "ys", blocker: true, headless: argv['--headless'].v });
  await browser.launch();

  let tabs: number = argv['--tabs'].v;
  let sites: number = await sqlSites(); // Total number of sites to crawl
  let urls: Array<Url> = await sqlUrls(argv['--tabs'].v); // The urls to crawl

  let processed: number = 0;
  let success: number = 0;
  let failed: number = 0;

  const pages: Array<Npage> = await browser.newPages(urls.splice(0, tabs));
  const promisses: Array<() => Promise<Npage>> = [];

  const cstime = Date.now(); // Start of crawl

  pages.map(async npage => { promisses.push(() => extractPromise(npage)) }); // Initial tabs

  // kickstart

  for (let i = 0; i < promisses.length; i++) handleTab(i);
  console.log(`...starting with: ${promisses.length} tabs`);;
};

instance();
