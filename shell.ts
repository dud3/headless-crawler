const { addSlashes, stripSlashes } = require('slashes');

import puppeteer, { LoadEvent, Page, EmulateOptions } from "puppeteer";
import core from "./core";
import readability from "./readability";

let fun: string = process.argv.length > 2 ? process.argv[2] : 'readability';

import Browser, { Npage } from './Browser';
import dbSql from './db-sql';

// 'https://posterous.com', // failed
// 'https://samaltman.com', // failed

const urls = [
'https://newyorker.com',
'https://stanford.edu',
'https://theverge.com',
'https://scientificamerican.com',
'https://reddit.com',
'https://latimes.com',
'https://atlasobscura.com',
'https://quantamagazine.org',
'https://ieee.org',
'https://lwn.net',
'https://facebook.com',
'https://forbes.com',
'https://slate.com',
'https://paulgraham.com',
'https://anandtech.com',
'https://googleblog.com',
'https://gnu.org',
'https://qz.com',
'https://smithsonianmag.com',
'https://thenextweb.com',
'https://cnn.com',
'https://jacquesmattheij.com',
'https://cbc.ca',
'https://cnbc.com',
'https://37signals.com',
'https://phys.org',
'https://torrentfreak.com',
'https://zdnet.com',
'https://theregister.co.uk',
'https://acm.org',
'https://daringfireball.net',
'https://stackoverflow.com',
'https://stackexchange.com',
'https://priceonomics.com',
'https://nasa.gov',
'https://businessinsider.com',
'https://venturebeat.com',
'https://righto.com',
'https://cloudflare.com',
'https://stripe.com',
'https://rust-lang.org',
'https://archive.org',
'https://marco.org',
'https://kalzumeus.com',
'https://antirez.com',
'https://techdirt.com',
'https://technologyreview.com',
'https://citylab.com',
'https://codinghorror.com',
'https://harvard.edu',
'https://sciencemag.org',
'https://vox.com',
'https://msdn.com',
'https://engadget.com',
'https://nationalgeographic.com',
'https://golang.org',
'https://fastcompany.com',
'https://avc.com',
'https://berkeley.edu',
'https://cnet.com',
'https://aeon.co',
'https://krebsonsecurity.com',
'https://extremetech.com',
'https://gitlab.com',
'https://troyhunt.com',
'https://jgc.org',
'https://theintercept.com',
'https://schneier.com',
'https://buzzfeednews.com',
'https://heroku.com',
'https://dropbox.com',
'https://danluu.com',
'https://boingboing.net',
'https://nih.gov',
'https://gigaom.com',
'https://sec.gov',
'https://gamasutra.com',
'https://yahoo.com',
'https://nybooks.com',
'https://chromium.org',
'https://stratechery.com',
'https://gizmodo.com',
'https://rachelbythebay.com',
'https://debian.org',
'https://jvns.ca',
'https://gabrielweinberg.com',
'https://kickstarter.com',
'https://steveblank.com',
'https://daemonology.net',
'https://sivers.org',
'https://newscientist.com',
'https://substack.com',
'https://cmu.edu',
'https://propublica.org',
'https://blog.google',
'https://typepad.com',
'https://nymag.com',
'https://chronicle.com',
'https://hackaday.com',
'https://businessweek.com',
'https://openai.com'
// 'https://tbray.org',
// 'https://catonmat.net',
// 'https://livejournal.com',
// 'https://hbr.org',
// 'https://openculture.com',
// 'https://fb.com',
// 'https://salon.com',
// 'https://torproject.org',
// 'https://mercurynews.com',
// 'https://theparisreview.org',
// 'https://netflix.com',
// 'https://thedrive.com',
// 'https://infoq.com',
// 'https://marc.info',
// 'https://time.com',
// 'https://laphamsquarterly.org',
// 'https://slideshare.net',
// 'https://gwern.net',
// 'https://python.org',
// 'https://llvm.org',
// 'https://pastebin.com',
// 'https://recode.net'
];

(async () => {
  const browser = new Browser({ id: 'ys', blocker: true, headless: true });

	await browser.launch();

	const prepare = async (urls) => {
		await browser.newPages(urls.length);

		const pages: Array<Npage> = await browser.assignPages(urls);
		const fpages: Array<Npage> = pages.filter(p => p.url.length > 0);

		const promisses = [];
		for (const key in fpages) {
			promisses.push(() => (new Promise(async (resolve) => {
				const theExtract: any = {
					canvas_fingerprinters: {},
					key_logging: {}
				};

				try {
					const extract = await core(fpages[key].blocker, fpages[key].page, fpages[key].url, 30000);

					theExtract.canvas_fingerprinters = extract.reports.canvas_fingerprinters.fingerprinters.length;
				  // theExtract.canvas_font_fingerprinters = Object.keys(extract.reports.canvas_font_fingerprinters.canvas_font).length;
				  theExtract.key_logging = Object.keys(extract.reports.key_logging).length;
				  theExtract.session_recorders = Object.keys(extract.reports.session_recorders).length;
				  theExtract.blocked_amount = extract.blocked.length;

				  const sql = `
						insert into extracts set
						url = '${extract.url}',
						title = '${addSlashes(extract.title)}',
						BlockedRequests = ${theExtract.blocked_amount},
						totalRequests = ${extract.requests.amount},
						CanvasFingerprint = ${theExtract.canvas_fingerprinters},
						KeyLogging = ${theExtract.key_logging},
						SessionRecording = ${theExtract.session_recorders},
						TotalSize = ${extract.pageSize},
						ContentSize = ${extract.readability.length},
						ContentReaderable = 1,
						LoadSpeed = ${extract.timing.loadTime}
					`

				  try {
						await dbSql.query(sql, (err) => { if (err) throw err });
					} catch(err) {
						console.log(err.stack);
					}

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

  for (let i = 0; i < urls.length - 10; i += 10) {
	  const promisses = await prepare(urls.slice(i, i + 10));

		const fps = promisses.map(p => p());
	  const npages: Array<Npage> = await Promise.all(fps);

		console.log("Crawled current 10 tabs: " + Math.floor((Date.now() - now) / 1000) + "sec");

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
