const { addSlashes, stripSlashes } = require('slashes');

import puppeteer, { LoadEvent, Page, EmulateOptions } from "puppeteer";
import core from "./core";

import Browser, { Npage } from './Browser';
import dbSql from "./db-sql";

const argv = {
	"--headless": {
		v: true,
		f: eval
	},
	"--tabs": {
		v: 10,
		f: parseInt
	},
	"--sites": {
		v: 100,
		f: parseInt
	},
	"--waitfor": {
		v: 20000,
		f: parseInt
	},
	"--timeout": {
		v: 60000,
		f: parseInt
	}
};

if (process.argv.length > 2) {
	process.argv.splice(0, 2);
	process.argv.map(a => a.split('=')).map(a => { const c = argv[a[0]]; if (c !== undefined) c.v = c.f(a[1]); });
}

console.log(argv);

const instances = [];
const launch = (async (c: number) => {
	for (let i = 0; i < c; i++) {
		instances.push(async () => {
		  const sqlExtract = async (theExtract, extract) => {
		  	const sql = `
					insert into extracts set
		      url = '${extract.url}',
		      title = '${addSlashes(extract.title)}',
		      blockedRequests = ${theExtract.blocked_amount},
		      totalRequests = ${extract.requests.amount},
		      canvasFingerprint = ${theExtract.canvas_fingerprinters},
		      keyLogging = ${theExtract.key_logging},
		      sessionRecording = ${theExtract.session_recorders},
		      totalSize = ${extract.pageSize},
		      contentSize = ${extract.readability.length},
		      contentReaderable = 1,
		      loadSpeed = ${extract.timing.loadTime}
		     `

		    try {
					await dbSql.query(sql, (err) => { if (err) throw err });
		    } catch(err) {
		      console.log(err.stack);
		    }
		  }

		  const sqlUrls = async (skip, take): Promise<Array<string>> => {
		  	return new Promise((resolve) => {
			  	dbSql.query(`select * from sites limit ${skip}, ${take}`, async (err, rows) => {
			   		resolve(rows.map(row => row.url) || []);
			  	});
		   	});
		  }

		  const doEextract = async (fpages: Array<Npage>) => {
		  		if (skip < sites) {
						if(urls.length <= tabs) {
							skip += take;
							(await sqlUrls(skip, take)).map(r => { urls.push(r) });
						}
					}

					if (urls.length == 0) { return }

		      const promisses = [];

		      for (const key in fpages) {
		          promisses.push(() => (new Promise(async (resolve) => {
		              const theExtract: any = {
		                  canvas_fingerprinters: {},
		                  key_logging: {}
		              };

		              try {
		                const extract = await core(fpages[key].blocker, fpages[key].page, "https://" + fpages[key].url, argv["--timeout"].v, argv["--waitfor"].v);

										theExtract.canvas_fingerprinters = extract.reports.canvas_fingerprinters.fingerprinters.length;
										// theExtract.canvas_font_fingerprinters = Object.keys(extract.reports.canvas_font_fingerprinters.canvas_font).length;
										theExtract.key_logging = Object.keys(extract.reports.key_logging).length;
										theExtract.session_recorders = Object.keys(extract.reports.session_recorders).length;
										theExtract.blocked_amount = extract.blocked.length;

										await sqlExtract(theExtract, extract);

										dbSql.query(`update sites set crawled = 1 where url = '${fpages[key].url}'`);

										resolve(fpages[key]);

		                swapTab(fpages[key], urls[0], `Resolved: ${fpages[key].url} - time: ${Date.now() - extract.startTime}`);
										doEextract([fpages[key]]);

		              } catch (err) {
										dbSql.query(`update sites set crawled = 0, error="${addSlashes(err.message)}" where url = "${fpages[key].url}"`);

		                resolve(fpages[key]);

		                swapTab(fpages[key], urls[0], `Failed: ${fpages[key].url} - ${err.message}`);
										doEextract([fpages[key]]);
		              }
		          })));
		      }

		      Promise.all(promisses.map(p => p()));
		  }

		  const swapTab = (fpage, url, message = "") => {
		  	urls.splice(0, 1);
		  	fpage.url = url;

		  	processed++;

		  	if (processed == sites - 1) {
		  		console.log(`seconds elapsed = ${Math.floor((Date.now() - cstime) / 1000)} (${Date.now() - cstime}ms)`);
		  		browser.close();
		  		process.exit();
		  	}

		  	console.log(i + " - message", message, "processed", processed);
		  }

		  const browser = new Browser({ id: "ys", blocker: true, headless: argv['--headless'].v });
		  await browser.launch();

			let tabs: number = argv['--tabs'].v;
			let sites: number = argv['--sites'].v / c;

			let take: number = 50;
			let skip: number = i * take;
			let processed: number = 0;
			let urls: Array<string> = await sqlUrls(skip, take);

			skip += take;

			const pages: Array<Npage> = await browser.newPages(urls.splice(0, tabs));

			const cstime = Date.now(); // after pages have been assigned but not processed

			await doEextract(pages);
		});
	}
});

launch(2);
instances.map((i) => i());
