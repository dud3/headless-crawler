import core from "./core";
import readability from "./readability";

let fun: string = process.argv.length > 2 ? process.argv[2] : 'readability';

import Browser from './Browser';

// ...
const urls = [
'https://github.com',
'https://nytimes.com',
'https://techcrunch.com',
'https://bloomberg.com',
'https://github.io',
'https://blogspot.com',
'https://google.com',
'https://arstechnica.com',
'https://bbc.com',
'https://theguardian.com',
'https://wsj.com',
'https://medium.com',
'https://washingtonpost.com',
'https://wordpress.com',
'https://bbc.co.uk',
'https://wired.com',
'https://reuters.com',
'https://mozilla.org',
'https://theatlantic.com',
'https://twitter.com',
'https://npr.org',
'https://newyorker.com',
'https://economist.com',
'https://wikipedia.org',
'https://mit.edu',
'https://eff.org',
'https://nature.com',
'https://tumblr.com',
'https://nautil.us',
'https://ycombinator.com',
'https://apple.com',
'https://arxiv.org',
'https://amazon.com',
'https://youtube.com',
'https://vice.com',
'https://microsoft.com',
'https://stanford.edu',
'https://theverge.com',
'https://scientificamerican.com',
'https://reddit.com',
'https://latimes.com',
// 'https://atlasobscura.com',
// 'https://quantamagazine.org',
// 'https://ieee.org',
// 'https://lwn.net',
// 'https://facebook.com',
// 'https://forbes.com',
// 'https://slate.com',
// 'https://paulgraham.com',
// 'https://anandtech.com',
// 'https://googleblog.com',
// 'https://posterous.com',
// 'https://gnu.org',
// 'https://qz.com',
// 'https://samaltman.com',
// 'https://smithsonianmag.com',
// 'https://thenextweb.com',
// 'https://cnn.com',
// 'https://jacquesmattheij.com',
// 'https://cbc.ca',
// 'https://cnbc.com',
// 'https://37signals.com',
// 'https://phys.org',
// 'https://torrentfreak.com',
// 'https://zdnet.com',
// 'https://theregister.co.uk',
// 'https://acm.org',
// 'https://daringfireball.net',
// 'https://stackoverflow.com',
// 'https://stackexchange.com',
// 'https://priceonomics.com',
// 'https://nasa.gov',
// 'https://businessinsider.com',
// 'https://venturebeat.com',
// 'https://righto.com',
// 'https://cloudflare.com',
// 'https://stripe.com',
// 'https://rust-lang.org',
// 'https://archive.org',
// 'https://marco.org',
// 'https://kalzumeus.com',
// 'https://antirez.com',
// 'https://techdirt.com',
// 'https://technologyreview.com',
// 'https://citylab.com',
// 'https://codinghorror.com',
// 'https://harvard.edu',
// 'https://sciencemag.org',
// 'https://vox.com',
// 'https://msdn.com',
// 'https://engadget.com',
// 'https://nationalgeographic.com',
// 'https://golang.org',
// 'https://fastcompany.com',
// 'https://avc.com',
// 'https://berkeley.edu',
// 'https://cnet.com',
// 'https://aeon.co',
// 'https://krebsonsecurity.com',
// 'https://extremetech.com',
// 'https://gitlab.com',
// 'https://troyhunt.com',
// 'https://jgc.org',
// 'https://theintercept.com',
// 'https://schneier.com',
// 'https://buzzfeednews.com',
// 'https://heroku.com',
// 'https://dropbox.com',
// 'https://danluu.com',
// 'https://boingboing.net',
// 'https://nih.gov',
// 'https://gigaom.com',
// 'https://sec.gov',
// 'https://gamasutra.com',
// 'https://yahoo.com',
// 'https://nybooks.com',
// 'https://chromium.org',
// 'https://stratechery.com',
// 'https://gizmodo.com',
// 'https://rachelbythebay.com',
// 'https://debian.org',
// 'https://jvns.ca',
// 'https://gabrielweinberg.com',
// 'https://kickstarter.com',
// 'https://steveblank.com',
// 'https://daemonology.net',
// 'https://sivers.org',
// 'https://newscientist.com',
// 'https://substack.com',
// 'https://cmu.edu',
// 'https://propublica.org',
// 'https://blog.google',
// 'https://typepad.com',
// 'https://nymag.com',
// 'https://chronicle.com',
// 'https://hackaday.com',
// 'https://businessweek.com',
// 'https://openai.com',
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

// block images from loading
// https://github.com/puppeteer/puppeteer/tree/main/examples#load-a-chrome-extension
/*
page.on('request', (request) => {
	if (request.resourceType() === 'image') request.abort();
	else request.continue();
});
*/

(async () => {
	const browser = new Browser('x', false, 600, 200);
	await browser.launch();
	await browser.newPages(4);

	const pages = await browser.assignPages(['https://edition.cnn.com/2020/12/02/politics/mark-kelly-swearing-in-arizona-senator/index.html', 'https://cnn.com'])
	const fpages = pages.filter(p => p.url.length > 0);

	const promisses = [];
	for (const key in fpages) {
		promisses.push(new Promise(async (resolve) => {
			const extract = await readability.main(fpages[key]);

			console.log(extract);

			await browser.close(fpages[key].page);
			await browser.newPages(1);
		}));
  }

  setTimeout(async () => {
	  Promise.all(promisses);
	}, 8000);

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
