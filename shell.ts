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
    v: 10,
    f: v => sparseInt(v, 10)
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
    f: (v) => v.split(',').map(c => c)
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

  for(const k in argv) argv[k].v = argv[k].f(argv[k].v);
}

console.log(argv);

const instances = [];
const launch = (async (c: number) => {
  for (let i = 0; i < c; i++) {
    instances.push(async () => {

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

      const sqlUrls = async (take): Promise<Array<Url>> => {
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

              if (argv['--closetab'].v) {
                await browser.closePage(npage);
                npage = await browser.newPage(npage.url, npage.index);
              }

              resolve(npage);
            } catch (e) {
              console.log(e);
            }

          } catch (err) {
            npage.error = err.message;

            dbSql.query(`update sites set crawled = 0, error="${addSlashes(err.message)}" where id = "${npage.url.id}"`);

            theExtract.originUrl = addSlashes(npage.url.url);
            theExtract.error = err.message;

            npage.extract = theExtract;

            await sqlExtract(npage);

            if (argv['--closetab'].v) {
              await browser.closePage(npage);
              npage = await browser.newPage(npage.url, npage.index);
            }

            reject(npage);
          }
        });
      }

      const browser = new Browser({ id: "ys", blocker: true, headless: argv['--headless'].v });
      await browser.launch();

      let tabs: number = argv['--tabs'].v;
      let sites: number = argv['--sites'].v / c;

      let take: number = sites > argv['--tabs'].v ? argv['--tabs'].v : sites;
      let skip: number = i * take;
      let processed: number = 0;
      let success: number = 0;
      let failed: number = 0;
      let urls: Array<Url> = await sqlUrls(take);

      const pages: Array<Npage> = await browser.newPages(urls.splice(0, tabs));
      const cstime = Date.now();

      const promisses: Array<Promise<Npage>> = [];
      pages.map(npage => { promisses.push(extractPromise(npage)); });

      console.log(`...starting with: ${promisses.length} tabs`);

      const shcedulePage = async (npage: Npage, index: number) => {
        processed++;

        // Fetch more urls as needed
        if(urls.length <= tabs) (await sqlUrls(1)).map(r => { urls.push(r) });

        // Check if the end...
        if (urls.length > 0) {
          console.log(`Swapping tab(${index}) - npage(${npage.index}) - ${npage.url.url} -> ${urls[0].url}\n`);

          npage.url = urls[0];
          promisses[index] = extractPromise(npage);

          // ... wait for my recursion
          await recurse(index);
        }

        // ... the end, wait for the rest of possible promisses
        if (urls.length == 0 || processed >= sites) {
          console.log(`Waiting for last promisses... seconds elapsed = ${Math.floor((Date.now() - cstime) / 1000)} (${Date.now() - cstime}ms)`);
          await wait(60000);
          await browser.close();
          process.exit();
        }

          // if not the end ... and splice
          urls.splice(0, 1);
      };

      const recurse = async (index: number) => {
        promisses[index]
        .then(async npage => {
          success++;
          console.log(`Resolved(${success}): ${npage.url.url}` +
            ` - goto time: ${npage.extract.goto.end - npage.extract.goto.start}` +
            ` - dequeue time: ${Date.now() - npage.extract.goto.start}`);

          await shcedulePage(npage, npage.index);
      	})
        .catch(async npage => {
          failed++;
          console.log(`Failed(${failed}): ${npage.url.url} - ${npage.error}`);

          await shcedulePage(npage, npage.index);
        })
      }

      // kickstart
      for (let i = 0; i < promisses.length; i++) { recurse(i); }
    });
  }
});

launch(argv['--instances'].v); instances.map((i) => i());
