import { fullLists, PuppeteerBlocker, Request } from '@cliqz/adblocker-puppeteer';
import fetch from 'node-fetch';
import puppeteer, { Browser, LoadEvent, Page } from "puppeteer";
import { promises as fs, readFileSync } from 'fs';
import * as path from "path";
import * as url from "url";
import os from "os";
import { getDomain, getSubdomain, parse } from "tldts";

// Use the js str to pass it to the puppeteer evaluation scope

const readabilityStr = readFileSync('node_modules/@mozilla/readability/Readability.js', {encoding: 'utf-8'})
const { Readability } = require('@mozilla/readability');

// Extensions

import { autoScroll, fillForms } from "./pptr-utils/interaction-utils";
import { dedupLinks, getLinks, getSocialLinks } from "./pptr-utils/get-links";
import { getLogger } from "./logger"; // note: not used yet
import { setupSessionRecordingInspector } from "./session-recording";
import { setupKeyLoggingInspector } from "./key-logging";

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
      headless: headless,
      devtools: true
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
      inspectors: {},
      keyLoggers: {},
      content: {
        readability: {} as any,
        keywords: {
          newsletter: false
        }
      },
      browser: {}
    }

    try {
      console.info(`>>> Started Puppeteer with pid ${browser.process().pid}`);

      // All requests

      page.on('response', (response) => {
        const url = response.url();
        extract.requests.data.push(url);
      });

      // Page size

      async function addResponseSize(response) {
        try {
            const buffer = await response.buffer();
            extract.pageSize += buffer.length;
        } catch {
            // Error: Response body is unavailable for redirect responses
            // TODO: other errors possible ?
        }
      }
      page.on('response', addResponseSize);

      // Extensions

      await setupSessionRecordingInspector(page, event => {
        extract.inspectors = event
      });

      await setupKeyLoggingInspector(page, event => {
        extract.keyLoggers = event;
      });

      // Page response

      let pageResponse = null;
      pageResponse = await page.goto(url, { waitUntil: 'networkidle2' });

      // Off event listeners

      page.off('response', addResponseSize);

      // Requests

      extract.requests.amount = extract.requests.data.length;

      // Browser

      extract.browser = {
        name: "Chromium",
        version: await browser.version(),
        user_agent: await browser.userAgent(),
        platform: {
          name: os.type(),
          version: os.release(),
        },
      };

      // Timing

      extract.timing.loadTime = await page.evaluate(_ => {
        const { loadEventEnd, navigationStart } = performance.timing;
        return loadEventEnd - navigationStart
      });

      // All page content

      const outerhtml = await page.evaluate(() => document.querySelector('*')?.outerHTML);

      fs.writeFile('outerhtml.txt', outerhtml || ''); // debug

      let duplicatedLinks = [];
      const outputLinks = {
        first_party: [],
        third_party: [],
      }

      // Log network requests and page links
      // note: not used yet

      const hosts = {
        requests: {
          first_party: new Set(),
          third_party: new Set(),
        },
        links: {
          first_party: new Set(),
          third_party: new Set(),
        },
      };

      let REDIRECTED_FIRST_PARTY = parse(url);

      for (const link of dedupLinks(duplicatedLinks)) {
        const l = parse(link.href);

        if (REDIRECTED_FIRST_PARTY.domain === l.domain) {
          outputLinks.first_party.push(link);
          hosts.links.first_party.add(l.hostname);
        } else {
          if (l.hostname && l.hostname !== "data") {
            outputLinks.third_party.push(link);
            hosts.links.third_party.add(l.hostname);
          }
        }
      }
      duplicatedLinks = await getLinks(page);

      // Fill the form to be able to check for keyloggers from setupKeyLoggingInspector

      await fillForms(page);
      // ...
    } catch (e) {
      throw new Error(e);
    } finally {
      setTimeout(async () => {
        try {
        extract.title = await page.title(); // page._frameManager._mainFrame.evaluate(() => document.title)
          extract.timing.metrics = await page.metrics(); // https://github.com/puppeteer/puppeteer/blob/main/docs/api.md#pagemetrics

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

          // ...
        } catch (e) {
          throw new Error(e);
        }
      }, timeout);
    }
  });
}

export default {
  main
}
