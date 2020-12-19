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
		  const sqlExtract = async (theExtract, extract, fpage) => {

		  	try {
			  	const sql = `
						insert into extracts set
			      url = '${extract.url}',
			      title = '${addSlashes(extract.title).slice(0, 200)}',
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

		  const doEextract = async (fpages: Array<Npage>) => {
	      const promisses = [];

	      if (urls.length == 0 || processed >= sites) return;

	      for (const key in fpages) {
					promisses.push(() => {
						new Promise(async (resolve) => {

            	// The page
            	let npage = fpages[key];

	            const theExtract: any = {
                canvas_fingerprinters: {},
                key_logging: {}
	            };

              try {
              	// Extraction
                const extract = await core(npage.blocker, npage.page, "https://" + npage.url, argv["--timeout"].v, argv["--waitfor"].v);

								theExtract.canvas_fingerprinters = extract.reports.canvas_fingerprinters.fingerprinters.length;
								// theExtract.canvas_font_fingerprinters = Object.keys(extract.reports.canvas_font_fingerprinters.canvas_font).length;
								theExtract.key_logging = Object.keys(extract.reports.key_logging).length;
								theExtract.session_recorders = Object.keys(extract.reports.session_recorders).length;
								theExtract.blocked_amount = extract.blocked.length;
								extract.readability = extract.readability == null ? '' : extract.readability;
								extract.title = extract.title || '';

								try {
									await sqlExtract(theExtract, extract, npage);
									dbSql.query(`update sites set crawled = 1, error = '' where url = "${npage.url}"`);

									if (argv['--closetab'].v) {
										await browser.closePage(npage);
							  		npage = await browser.newPage(npage.url, npage.index);
							  	}

									processed++;
	                await swapTab(
	                	npage,
	                	urls[0],
	                	`Resolved(${processed}): ${npage.url}` +
	                	` - goto time: ${extract.goto.end - extract.goto.start}` +
	                	` - dequeue time: ${Date.now() - extract.goto.start}`
	                );
	                await resolve();
									await doEextract([npage]);
								} catch (e) {
									console.log(e);
								}

              } catch (err) {
              	dbSql.query(`update sites set crawled = 0, error="${addSlashes(err.message)}" where url = "${npage.url}"`);
								if (argv['--closetab'].v) {
									await browser.closePage(npage);
							  	npage = await browser.newPage(npage.url, npage.index);
						  	}
						  	
						  	failed++;
                await swapTab(npage, urls[0], `Failed(${failed}): ${npage.url} - ${err.message}`);
                await resolve();
								await doEextract([npage]);
              }
						})
					});
	      }

	      await Promise.all(promisses.map(p => p()));
		  }

		  const swapTab = async (fpage, url, message = "") => {
				if(urls.length <= tabs) {
					(await sqlUrls(take)).map(r => { urls.push(r) });
				}

				if (urls.length == 0 || processed >= sites) {
					console.log("Keep alive for final promisses...");
					console.log(`Crawl ended: seconds elapsed = ${Math.floor((Date.now() - cstime) / 1000)} (${Date.now() - cstime}ms)`);
					// browser.close();
					// process.exit();
				}

		  	console.log(`Instance(${i}) - ${message} \n`);

		  	if (urls.length > 0) {
		  		urls.splice(0, 1);
		  		fpage.url = url;
		  	}
		  }

		  const browser = new Browser({ id: "ys", blocker: true, headless: argv['--headless'].v });
		  await browser.launch();

			let tabs: number = argv['--tabs'].v;
			let sites: number = argv['--sites'].v / c;

			let take: number = sites > argv['--tabs'].v ? argv['--tabs'].v : sites;
			let skip: number = i * take;
			let processed: number = 0;
			let failed: number = 0;
			let urls: Array<string> = await sqlUrls(take); // ['alexcheuk.com'];
			const pages: Array<Npage> = await browser.newPages(urls.slice(0, tabs));
			const cstime = Date.now(); // after pages have been assigned but not processed

			take = 1;

			await doEextract(pages);
		});
	}
});

launch(argv['--instances'].v); instances.map((i) => i());
