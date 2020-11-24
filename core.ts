import { fullLists, PuppeteerBlocker, Request } from '@cliqz/adblocker-puppeteer';
import fetch from 'node-fetch';
import * as puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import * as path from "path";

function getUrlToLoad(purl: string): string {
  let url = purl;
  if (process.argv[process.argv.length - 1].endsWith('.ts') === false) {
    url = process.argv[process.argv.length - 1];
  }

  return url;
}

// Array of functions
// callBacks = {'request-blocked': (reuest) => {...}, }

async function main (url: string, callBacks: Record<string, any>, timeout?: number, headless?: boolean) {
  return new Promise(async (resolve, reject) => {
    timeout = timeout || 4000;
    headless = headless || true

    const _callBacks: Record<string, any> = {
      'request-blocked': () => {},
      'request-redirected': () => {},
      'request-whitelisted': () => {},
      'csp-injected': () => {},
      'script-injected': () => {},
      'style-injected': () =>  {},
      'browser-tab-closed': () => {},
      'browser-page-data': () => {}
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
      dimensions: {}
    }

    try {
      await page.goto(url);

      extract.title = await page.title(); // page._frameManager._mainFrame.evaluate(() => document.title)

      // Get the "viewport" of the page, as reported by the page.
      extract.dimensions = await page.evaluate(() => {
        return {
          width: document.documentElement.clientWidth,
          height: document.documentElement.clientHeight,
          deviceScaleFactor: window.devicePixelRatio
        };
      });
    } catch (e) {
      throw new Error(e);
    } finally {
      setTimeout(async () => {
        await page.close();
        await browser.close();
        console.log(">>> Browser tab closed: " + url);

        _callBacks['browser-tab-closed']();
        _callBacks['browser-page-data'](extract);

        resolve(1);
      }, timeout);
    }
  });
}

export default {
  main
}
