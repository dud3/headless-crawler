const { addSlashes, stripSlashes } = require('slashes');

import puppeteer, { LoadEvent, Page, EmulateOptions } from "puppeteer";
import core from "./core";
import readability from "./readability";

let fun: string = process.argv.length > 2 ? process.argv[2] : 'readability';

import Browser, { Npage } from './Browser';
import dbSql from './db-sql';

(async () => {
  const browser = new Browser({ id: 'ys', blocker: true, headless: true });
	await browser.launch();

	const prepare = async (urls) => {
		await browser.newPages(urls.length);

		const pages: Array<Npage> = await browser.assignPages(urls);
		const fpages: Array<Npage> = pages.filter(p => p.url.length > 0);

		const sql = async (theExtract, extract) => {
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

		const promisses = [];
		for (const key in fpages) {
			promisses.push(() => (new Promise(async (resolve) => {
				const theExtract: any = {
					canvas_fingerprinters: {},
					key_logging: {}
				};

				try {
					const extract = await core(fpages[key].blocker, fpages[key].page, "https://" + fpages[key].url, 20000, 60000);

					theExtract.canvas_fingerprinters = extract.reports.canvas_fingerprinters.fingerprinters.length;
				  // theExtract.canvas_font_fingerprinters = Object.keys(extract.reports.canvas_font_fingerprinters.canvas_font).length;
				  theExtract.key_logging = Object.keys(extract.reports.key_logging).length;
				  theExtract.session_recorders = Object.keys(extract.reports.session_recorders).length;
				  theExtract.blocked_amount = extract.blocked.length;

				  await sql(theExtract, extract);

					console.log("Resolved:", fpages[key].url);

					await browser.close(fpages[key].page);

					dbSql.query(`update sites set crawled = 1 where url = '${fpages[key].url}'`);

					resolve(fpages[key]);
				} catch (err) {
					console.log("failed: ", fpages[key].url);
					await browser.close(fpages[key].page);
					resolve(fpages[key]);
				}
			})));
		}

		return promisses;
  }

  const now = Date.now();

 	dbSql.query('select * from sites limit 50', async (err, rows) => {
		if (err) throw err

		const urls = rows.map(row => row.url);

		console.log(urls);

	  const iter = 10;
	  for (let i = 0; i < urls.length - iter; i += iter) {
	  	const nowIter = Date.now();
		  const promisses = await prepare(urls.slice(i, i + iter));

		  console.log(`Fetching ${iter} more items...`);

			const fps = promisses.map(p => p());
		  const npages: Array<Npage> = await Promise.all(fps);

			console.log(`Crawled current ${iter} tabs: ` + Math.floor((Date.now() - nowIter) / 1000) + "sec");
		}

		console.log("Crawled in all: " + Math.floor((Date.now() - now) / 1000) + "sec");

	});

	/*
	const browser = new Browser({
  	id: 'ys',
  	blocker: true,
  	chromeArgs: [
		"--disable-extensions-except=/home/dud3/git/headless-crawler/extension/bypass-paywalls-chrome-clean",
  	"--load-extension=/home/dud3/git/headless-crawler/extension/bypass-paywalls-chrome-clean"
  ]});
	await browser.launch();
	await browser.newPages(4);

	const pages = await browser.assignPages(['https://edition.cnn.com/2020/12/02/politics/mark-kelly-swearing-in-arizona-senator/index.html', 'https://cnn.com'])
	const fpages = pages.filter(p => p.url.length > 0);

	const promisses = [];
	for (const key in fpages) {
		promisses.push(() => (new Promise(async (resolve) => {
			const extract = await readability.main(fpages[key]);

			console.log(extract);

			await browser.close(fpages[key].page);
			await browser.newPages(1);
		})));
  }

  setTimeout(async () => {
	  await Promise.all(promisses.map(p => p()));
	}, 8000);
	*/
})();
