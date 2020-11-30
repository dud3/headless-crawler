import core from "./core";
import readability from "./readability";

let fun: string = process.argv.length > 2 ? process.argv[2] : 'readability';

import Browser from './Browser';

(async () => {
	const browser = new Browser(false);
	await browser.launch();

	await browser.goto(['https://google.com', 'https://google.com', 'https://google.com', 'https://google.com', 'https://google.com']);

	// const tabs = await browser.tabs();
	// console.log(tabs.length);

	if (fun == 'extract') {
		let url: string = process.argv.length > 3 ? process.argv[3] : '';
		if (url.length == 0) { console.log('The url param is missing, usage: yarn shell https://example.com'); process.exit(); }

		let blocked: Array<any> = [];
		let thextract: any = {};

		const cbs: Record<string, any> = {
		    'request-blocked': (request: any) => { blocked.push(request); },
		    'script-injected': (script: string, url: string) => { console.log(script, url); },
		    'browser-extract-data': (extract: any) => { thextract = extract; }
		}

		await core.main([url], cbs, 8000, false);

		thextract.blocked = {} as any;
		thextract.blocked.data = blocked.map(b => { return { tabId: b.tabId, type: b.type, url: b.url } });
		thextract.blocked.amount = thextract.blocked.data.length;

		console.log(thextract);
	} else {
		const arr = [
			'https://google.com', 'https://google.com', 'https://google.com', 'https://google.com', 'https://google.com',
			// 'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com',
			// 'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com',
			// 'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com',
			// 'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com',
			// 'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com',
			// 'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com',
			// 'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com',
			// 'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com',
			// 'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com',
			// 'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com',

			//'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com',
			//'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com',
			//'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com',
			//'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com',
			//'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com',
			//'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com',
			//'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com',
			//'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com',
			//'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com',
			//'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com',

			//'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com',
			//'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com',
			//'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com',
			//'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com',
			//'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com',
			//'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com',
			//'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com',
			//'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com',
			//'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com',
			//'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com'

			// 'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com',
			// 'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com',
			// 'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com',
			// 'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com',
			// 'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com',
			// 'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com',
			// 'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com',
			// 'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com',
			// 'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com',
			// 'https://google.com', 'https://gamasutra.com', 'https://cnn.com', 'https://amazon.com', 'https://digitalocean.com'
		];
		await readability.main(arr, false).then((extracts) => {
			console.log(extracts);
		});
	}
})();
