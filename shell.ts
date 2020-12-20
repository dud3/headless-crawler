import { sparseInt } from "./utils";
const { addSlashes, stripSlashes } = require('slashes')

import constants from './constants'

import puppeteer, { LoadEvent, Page, EmulateOptions } from "puppeteer";
import core from "./core";

import Browser, { Npage } from './Browser';
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
      v: "" as any, // epte,oe
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

		  const sqlExtract = async (extract, fpage) => {

		  	try {
			  	const sql = `
						insert into extracts set
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
			      loadSpeed = ${extract.loadSpeed}
			     `

					await dbSql.query(sql, (err) => { if (err) console.log(err); });
		   	} catch (e) {
		   		throw new Error(e);
		   	}
		  }

		  const sqlUrls = async (take): Promise<Array<string>> => {
		  	return new Promise((resolve) => {

		  		let condition = "(crawled = 0 and length(error) = 0)";

					argv['--syncerrors'].v.map((c) => {
						switch (c) {
							case "epte":
								condition += " OR (`error` LIKE '%Error: Protocol error%') ";
							break;

							case "eoe":	 
								condition += " "; // todo: ...
							break;
						}
					});

          if(argv['--synctimeouts'].v) condition += " OR `error` LIKE '%TimeoutError%' ";

          const sql = `select * from sites where ${condition} and (locked = 0) order by id asc limit ${take}`
          if (argv['--debug'].v) console.log(sql);

			  	dbSql.query(sql, async (err, rows) => {
			  		const ids = rows.map(r => r.id).join(',');
			  		if (ids.length > 0) {
			  			const idsql = `update sites set locked = 1 where id in(${ids})`;
			  		
				  		dbSql.query(idsql, async (err) => {
				   			resolve(rows.map(row => row.url) || []);
				   		});
			  		} else {
			  			resolve([]);
			  		}
			  	});
		   	});
		  }

		  const extractPromise = (npage: Npage): Promise<Npage> => {
		  	return new Promise(async (resolve, reject) => {
          let theExtract: any = {
          	title: '',
            blockedRequests: 0,
            totalRequests: 0,
            canvasFingerprint: 0,
            keyLogging: 0,
            sessionRecording: 0,
            totalSize: 0,
            contentSize: 0,
            contentReaderable: 1,
            loadSpeed: 0,
            goto: {
            	start: 0,
            	end: 0
            }
          };

          try {
          	// Extraction
            const extract = await core(npage.blocker, npage.page, "https://" + npage.url, argv["--timeout"].v, argv["--waitfor"].v);

						theExtract = {
							url: extract.url,
	          	title: extract.title || '',
	            blockedRequests: extract.blocked.length,
	            totalRequests: extract.requests.amount,
	            canvasFingerprint: 0,
	            keyLogging: Object.keys(extract.reports.key_logging).length,
	            sessionRecording: Object.keys(extract.reports.session_recorders).length,
	            totalSize: extract.pageSize,
	            contentSize: extract.readability.length || 0,
	            contentReaderable: 1, // extract.readability == null ? '' : extract.readability,
	            loadSpeed: extract.timing.loadTime,
	            goto: {
	            	start: extract.goto.start,
	            	end: extract.goto.end
	            }
	          };

	          npage.extract = theExtract;

						try {
							await sqlExtract(theExtract, npage);
							dbSql.query(`update sites set crawled = 1, error = '' where url = "${npage.url}"`);

							if (argv['--closetab'].v) {
								await browser.closePage(npage);
					  		npage = await browser.newPage(npage.url, npage.index);
					  	}

              await resolve(npage);
						} catch (e) {
							console.log(e);
						}

          } catch (err) {
          	npage.error = err.message;

          	dbSql.query(`update sites set crawled = 0, error="${addSlashes(err.message)}" where url = "${npage.url}"`);

						if (argv['--closetab'].v) {
							await browser.closePage(npage);
					  	npage = await browser.newPage(npage.url, npage.index);
				  	}
				  	
            await reject(npage);
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
			let urls: Array<string> = await sqlUrls(take);
			const pages: Array<Npage> = await browser.newPages(urls.splice(0, tabs));
			const cstime = Date.now();

			const promisses: Array<Promise<Npage>> = [];
			pages.map(npage => { promisses.push(extractPromise(npage)); });

			const scheduleTabs = async (npage: Npage) => {
				console.log('scheduleTabs');
				if (urls.length > 0) {
		  		const surl = urls.splice(0, 1);
	  			console.log(`Swapping tabs(${processed}) - ${npage.url} -> ${surl[0]}`);
		  		npage.url = surl[0];

					// promisses.slice(0, 1);
		  		promisses.push(extractPromise(npage));
		  	}
			};

			const recurse = async () => {
				if (promisses.length > 0) {
					promisses[processed]
					.then(async npage => {
						success++;
						console.log(`Resolved(${success}): ${npage.url}` +
	          	` - goto time: ${npage.extract.goto.end - npage.extract.goto.start}` +
	          	` - dequeue time: ${Date.now() - npage.extract.goto.start}`);

						await scheduleTabs(npage);
					})
					.catch(async npage => {
						failed++;
						console.log(`Failed(${failed}): ${npage.url} - ${npage.message}`);
						await scheduleTabs(npage);
					})
					.finally(async () => {
						processed++;

						console.log("finally");

						if(urls.length <= tabs) (await sqlUrls(1)).map(r => { urls.push(r) });

						if (urls.length == 0 || processed >= sites) {
							console.log(`Waiting for last promisses... seconds elapsed = ${Math.floor((Date.now() - cstime) / 1000)} (${Date.now() - cstime}ms)`);
						}

						if (urls.length > 0) await recurse(); 						
					})
				}
			}

			recurse();
		});
	}
});

launch(argv['--instances'].v); instances.map((i) => i());
