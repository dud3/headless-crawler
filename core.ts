import { fullLists, PuppeteerBlocker, Request } from '@cliqz/adblocker-puppeteer';
import fetch from 'node-fetch';
import * as puppeteer from 'puppeteer';
import { promises as fs, readFileSync } from 'fs';
import * as path from "path";
import * as url from "url";

// Use the js str to pass it to the puppeteer evaluation scope

const readabilityStr = readFileSync('node_modules/@mozilla/readability/Readability.js', {encoding: 'utf-8'})
const { Readability } = require('@mozilla/readability');

// Extensions

import { getLogger } from "./logger"; // note: not used yet
import { setupSessionRecordingInspector } from "./session-recording";

function getUrlToLoad(purl: string): string {
  let url = purl;
  if (process.argv[process.argv.length - 1].endsWith('.ts') === false) {
    url = process.argv[process.argv.length - 1];
  }

  return url;
}

function rexecutor() {
  return new Readability({}, document).parse();
}

// Array of functions
// callBacks = {'request-blocked': (reuest) => {...}, }

async function main (url: string, callBacks: Record<string, any>, timeout?: number, headless?: boolean) {
  return new Promise(async (resolve, reject) => {
    timeout = timeout || 4000;
    headless = headless == undefined ? true : headless

    const _callBacks: Record<string, any> = {
      'request-blocked': () => {},
      'request-redirected': () => {},
      'request-whitelisted': () => {},
      'csp-injected': () => {},
      'script-injected': () => {},
      'style-injected': () =>  {},
      'browser-tab-closed': () => {},
      'browser-extract-data': () => {}
    }

    console.log(`>>> Url: ${url}`);
    console.log(`>>> Timeout (tab will be closed in): ${timeout}ms`);

    for (const key in callBacks) if (typeof callBacks[key] === 'function') _callBacks[key] = callBacks[key]

    const browser = await puppeteer.launch({
      defaultViewport: null,
      headless: headless
    });

    const blocker = await PuppeteerBlocker.fromLists(fetch, fullLists, {
      enableCompression: true,
    }, {
      path: 'engine.bin',
      read: fs.readFile,
      write: fs.writeFile,
    });

    const page = await browser.newPage();
    await blocker.enableBlockingInPage(page);

    for (const key in callBacks) {
      if (typeof callBacks[key] === 'function') {
          _callBacks[key] = callBacks[key]
      }

      switch (key) {
        case 'request-blocked':
        case 'request-redirected':
        case 'request-whitelisted':
        case 'csp-injected':
          blocker.on(key, (request: Request) => {
            _callBacks[key](request);
          })
        break;

        case 'script-injected':
        case 'style-injected':
            blocker.on(key, (script: string, url: string) => {
              /*
                if (style) {
                  // Style is of the form:
                  //
                  // <STYLESHEET 1>
                  //
                  // <STYLESHEET 2>
                  //
                  // ...
                  //
                  // Where each stylesheet has the format:
                  //
                  // selector1,
                  // selector2,
                  // selector3,
                  // ...
                  // selectorN { <Some CSS> }
                  //
                  // To get individual selectors we first split each stylesheet individually.
                  // Then we split the stylesheet into its individual selectors.
                  for (const stylesheet of style.split('}\n\n')) {
                    const selectors = stylesheet.split(',\n');

                    // Strip the '{ <Some CSS> }' part from last line.
                    if (selectors.length !== 0) {
                      const lastSelector = selectors[selectors.length - 1];
                      const endOfLastSelector = lastSelector.lastIndexOf('{');
                      if (endOfLastSelector !== -1) {
                        selectors[selectors.length - 1] = lastSelector.slice(0, endOfLastSelector).trim();
                      }
                    }

                    // Check each selector against the page.
                    for (const selector of selectors) {
                      if ((await page.$(selector)) !== null) {
                        console.log('Got a matching selector:', selector);
                      }
                    }
                  }
                }
              */
              _callBacks[key](script, url);
            })
        break;
      }
    }

    const extract = {
      title: '',
      dimensions: {},
      timing: {
        loadTime: {} as any,
        metrics: {} as any,
      },
      pageSize: 0,
      requests: {
        data: [] as any,
        amount: 0
      },
      network: {
        requets: [] as any,
        amount: 0
      },
      inspectors: {},
      content: {
        readability: {} as any,
        keywords: {
          newsletter: false
        }
      }
    }

    try {
      console.info(`>>> Started Puppeteer with pid ${browser.process().pid}`);

      // All requests

      page.on('response', (response) => { extract.requests.data.push(response.url()); });

      await setupSessionRecordingInspector(page, event => {
        extract.inspectors = event
      });

      await page.goto(url);

      extract.requests.amount = extract.requests.data.length;

      // Timing

      extract.timing.loadTime = await page.evaluate(_ => {
        const { loadEventEnd, navigationStart } = performance.timing;
        return loadEventEnd - navigationStart
      })

      // All page content

      const outerhtml = await page.evaluate(() => document.querySelector('*')?.outerHTML);

      fs.writeFile('outerhtml.txt', outerhtml || ''); // debug

      // ...
    } catch (e) {
      throw new Error(e);
    } finally {
      setTimeout(async () => {
        extract.title = await page.title(); // page._frameManager._mainFrame.evaluate(() => document.title)
        extract.timing.metrics = await page.metrics(); // https://github.com/puppeteer/puppeteer/blob/main/docs/api.md#pagemetrics

        extract.network.requets = JSON.parse(
          await page.evaluate(() => JSON.stringify(performance.getEntries()))
        );

        extract.network.amount = extract.network.requets.length
        const xs = extract.network.requets.filter((r: any) => r.transferSize !== undefined).map((r: any) => r.transferSize).reduce((x: number, y: number) => x + y)
        const ys = extract.network.requets.filter((r: any) => r.encodedBodySize !== undefined).map((r: any) => r.encodedBodySize).reduce((x: number, y: number) => x + y);
        const zs = extract.network.requets.filter((r: any) => r.decodedBodySize !== undefined).map((r: any) => r.decodedBodySize).reduce((x: number, y: number) => x + y);

        extract.pageSize = xs + ys + zs;

        extract.content.readability = await page.evaluate(`
          (function(){
            ${readabilityStr}
            ${rexecutor}
            return rexecutor();
          }())
        `);

        extract.content.keywords.newsletter = extract.content.readability.content == undefined ? false : extract.content.readability.content.toLowerCase().indexOf('newsletter') > -1

        await page.close();
        await browser.close();

        console.log(">>> Browser tab closed: " + url);

        _callBacks['browser-tab-closed']();
        _callBacks['browser-extract-data'](extract);

        resolve(1);
      }, timeout);
    }
  });
}

export default {
  main
}
