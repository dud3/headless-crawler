const { addSlashes, stripSlashes } = require('slashes');

import puppeteer, { LoadEvent, Page, EmulateOptions } from "puppeteer";
import core from "./core";
import readability from "./readability";

let fun: string = process.argv.length > 2 ? process.argv[2] : 'readability';

import Browser, { Npage } from './Browser';
import dbSql from './db-sql';

const { urls } = require("./urls");

(async () => {
  const browser = new Browser({ id: 'ys', blocker: true, headless: false });

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

  console.log(urls.length);

  const iter = 10;
  for (let i = 0; i < urls.length - iter; i += iter) {
  	const nowIter = Date.now();
	  const promisses = await prepare(urls.slice(i, i + iter));

	  console.log(`Fetching ${iter} more items...`);

		const fps = promisses.map(p => p());
	  const npages: Array<Npage> = await Promise.all(fps);

		console.log(`Crawled current ${iter} tabs: ` + Math.floor((Date.now() - nowIter) / 1000) + "sec");

		// console.log(npages.length);
		// npages.map(async (n) => { await browser.close(n.page); });
	}

	console.log("Crawled in all: " + Math.floor((Date.now() - now) / 1000) + "sec");

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

	/*
	const now = Date.now();

	const browsers = [];
	const browsersi = 8;

	for (let i = 0; i < browsersi; i++) {
		const browser = new Browser('x', false, 600, 200);
		await browser.launch();

		browsers.push(browser);
	}

	let timer = 0;
	let iter = urls.length / browsersi;

	console.log(iter, urls.length);

	let ii = 0;
	const interval = setInterval(async () => {
		timer += 1000;

		if (timer >= 12000) {
			clearInterval(interval);
			for (const key in browsers) {
				console.log(urls.slice(ii, iter + ii).length);

				browsers[key].goto(urls.slice(ii, iter + ii));
				browsers[key].invokeTabs();

				ii += iter;
			}
		}

		console.log(timer);
	}, 1000);
	*/
})();
