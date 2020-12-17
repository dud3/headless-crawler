const { addSlashes, stripSlashes } = require('slashes')

import constants from './constants'

import puppeteer, { LoadEvent, Page, EmulateOptions } from "puppeteer";
import core from "./core";

import Browser, { Npage } from './Browser';
import dbSql from "./db-sql";

const argv = {
	"--headless": {
		v: true,
		f: eval
	},
	"--instances": {
		v: 1,
		f: parseInt
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
		  const sqlExtract = async (theExtract, extract, fpage) => {

		  	try {
			  	const sql = `
						insert into extracts set
			      url = '${extract.url}',
			      title = '${addSlashes(extract.title)}.slice(0, 200)',
			      blockedRequests = ${theExtract.blocked_amount},
			      totalRequests = ${extract.requests.amount},
			      canvasFingerprint = ${theExtract.canvas_fingerprinters},
			      keyLogging = ${theExtract.key_logging},
			      sessionRecording = ${theExtract.session_recorders},
			      totalSize = ${extract.pageSize},
			      contentSize = ${extract.readability.length || 0},
			      contentReaderable = 1,
			      loadSpeed = ${extract.timing.loadTime}
			     `

					await dbSql.query(sql, (err) => {
						if (err) console.log(err);
					});
		   	} catch (e) {
		   		throw new Error(e);
		   	}
		  }

		  const sqlUrls = async (skip, take): Promise<Array<string>> => {
		  	return new Promise((resolve) => {
			  	dbSql.query(`select * from sites where crawled = 0 and length(error) = 0 limit ${skip}, ${take}`, async (err, rows) => {
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
						promisses.push(() => {
							new Promise(async (resolve) => {
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
									extract.readability = extract.readability == null ? '' : extract.readability;
									extract.title = extract.title || '';

									try {
										await sqlExtract(theExtract, extract, fpages[key]);

										resolve(fpages[key]);

										const sql = `update sites set crawled = 1 and error = '' where url = "${fpages[key].url}"`;
										console.log(constants.shell.colors.dim, sql);
										dbSql.query(sql);

		                swapTab(
		                	fpages[key],
		                	urls[0],
		                	`Resolved: ${fpages[key].url} \n\t- goto time: ${extract.goto.end - extract.goto.start} \n\t- dequeue time: ${Date.now() - extract.goto.start}\n`
		                );

										doEextract([fpages[key]]);
									} catch (e) {
										console.log(e);
									}

	              } catch (err) {
	              	failed++;

	                resolve(fpages[key]);

									dbSql.query(`update sites set crawled = 0, error="${addSlashes(err.message)}" where url = "${fpages[key].url}"`);

	                swapTab(fpages[key], urls[0], `Failed: ${fpages[key].url} - ${err.message}`);
									doEextract([fpages[key]]);
	              }
							})
						});
		      }

		      Promise.all(promisses.map(p => p()));
		  }

		  const swapTab = (fpage, url, message = "") => {
		  	urls.splice(0, 1);
		  	fpage.url = url;

		  	processed++;

		  	if (processed == sites - 1) {
		  		console.log(`seconds elapsed = ${Math.floor((Date.now() - cstime) / 1000)} (${Date.now() - cstime}ms)`);
		  		console.log(`failed: ${failed}`)
		  		browser.close();
		  		process.exit();
		  	}

		  	console.log(i + " -", message, "\t- processed", processed, "\n");
		  }

		  const browser = new Browser({ id: "ys", blocker: true, headless: argv['--headless'].v });
		  await browser.launch();

			let tabs: number = argv['--tabs'].v;
			let sites: number = argv['--sites'].v / c;

			let take: number = 50;
			let skip: number = i * take;
			let processed: number = 0;
			let failed: number = 0;
			let urls: Array<string> = ['alexcheuk.com'];

			skip += take;

			const pages: Array<Npage> = await browser.newPages(urls.splice(0, tabs));

			const cstime = Date.now(); // after pages have been assigned but not processed

			await doEextract(pages);
		});
	}
});

launch(argv['--instances'].v); instances.map((i) => i());
