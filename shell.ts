import core from "./core";

// console.log(process.argv)

(async () => {
	let blocked: Array<any> = [];

	const cbs: Record<string, any> = {
	    'request-blocked': (request: any) => { blocked.push(request.url); console.log(request.url); },
	    'script-injected': (script: string, url: string) => { console.log(script, url); }
	}

	await core.main('https://cnn.com', cbs, 8000, true);

	console.log(blocked);
})();
