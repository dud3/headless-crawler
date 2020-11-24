import core from "./core";

let url: string = process.argv.length > 2 ? process.argv[2] : '';

if (url.length == 0) { console.log('The url param is missing, usage: yarn shell https://example.com'); process.exit(); }

(async () => {
	let blocked: Array<any> = [];

	const cbs: Record<string, any> = {
	    'request-blocked': (request: any) => { blocked.push(request); console.log(request.url); },
	    'script-injected': (script: string, url: string) => { console.log(script, url); }
	}

	await core.main(url, cbs, 8000, true);

	blocked.map(b => {
		console.log({
			tabId: b.tabId,
			type: b.type,
			url: b.url
		})
	})
})();
