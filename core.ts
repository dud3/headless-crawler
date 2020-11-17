import { fullLists, PuppeteerBlocker, Request } from '@cliqz/adblocker-puppeteer';
import fetch from 'node-fetch';
import { writeFileSync } from "fs";
import sampleSize from "lodash.samplesize";
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
import {
  captureBrowserCookies,
  clearCookiesCache,
  setupHttpCookieCapture,
} from "./cookie-collector";
import { setupThirdpartyTrackersInspector } from "./third-party-trackers";
import { autoScroll, fillForms } from "./pptr-utils/interaction-utils";
import { dedupLinks, getLinks, getSocialLinks } from "./pptr-utils/get-links";
import { getLogger } from "./logger";
import { generateReport } from "./parser";
import { setupBlacklightInspector } from "./inspector";
import { setupSessionRecordingInspector } from "./session-recording";
import { setupKeyLoggingInspector } from "./key-logging";
import { clearDir } from "./utils";

function rexecutor() {
  return new Readability({}, document).parse();
}

// Array of functions
// callBacks = {'request-blocked': (reuest) => {...}, }

async function main (url: string, callBacks: Record<string, any>, timeout?: number, headless?: boolean, numPages?: number) {
  return new Promise(async (resolve, reject) => {
    timeout = timeout || 4000;
    headless = headless == undefined ? true : headless;
    numPages = numPages || 3;

    let REDIRECTED_FIRST_PARTY = parse(url);
    const FIRST_PARTY = parse(url);

    const defaultWaitUntil = "networkidle2";

    const outDir = path.join(process.cwd(), "extract-dir");
    clearDir(outDir);
    const logger = getLogger({ outDir, quiet: true });

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
      browser: {},
      reports: {}
    };

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

    const output: any = {
      uri_ins: url,
      uri_dest: null,
      uri_redirects: null,
      secure_connection: {},
      browsing_history: null
    };

    // ...

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

    let didBrowserDisconnect = false;
    const browser = await puppeteer.launch({
      args: [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--ignore-certificate-errors",
        "--autoplay-policy=no-user-gesture-required",
      ],
      defaultViewport: null,
      headless,
    });

    browser.on("disconnected", () => {
      didBrowserDisconnect = true;
    });
    if (didBrowserDisconnect) {
      reject("Chrome crashed");
    }

    const blocker = await PuppeteerBlocker.fromLists(fetch, fullLists, {
      enableCompression: true,
    }, {
      path: 'engine.bin',
      read: fs.readFile,
      write: fs.writeFile,
    });

    const page = await browser.newPage();
    const deviceOptions = puppeteer.devices['iPhone X'];
    page.emulate(deviceOptions);

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

    try {
      logger.info(`Started Puppeteer with pid ${browser.process().pid}`);

      let pageIndex = 0;

      // All requests
      // Page size

      async function addResponseSize(response) {
        const url = response.url();
        extract.requests.data.push(url);

        try {
            const buffer = await response.buffer();
            extract.pageSize += buffer.length;
        } catch {
            // Error: Response body is unavailable for redirect responses
            // TODO: other errors possible ?
        }
      }
      page.on('response', addResponseSize);

      await page.on("request", request => {
        const l = parse(request.url());
        // note that hosts may appear as first and third party depending on the path
        if (FIRST_PARTY.domain === l.domain) {
          hosts.requests.first_party.add(l.hostname);
        } else {
          if (request.url().indexOf("data://") < 1 && !!l.hostname) {
            hosts.requests.third_party.add(l.hostname);
          }
        }
      });

      // Extensions

      await setupBlacklightInspector(page, event => logger.warn(event));

      await setupSessionRecordingInspector(page, event => {
        extract.inspectors = event;
        logger.warn(event);
      });

      await setupKeyLoggingInspector(page, event => {
        extract.keyLoggers = event;
        logger.warn(event);
      });

      await setupThirdpartyTrackersInspector(
        page,
        event => logger.warn(event),
        false,
      );

      await setupHttpCookieCapture(page, event => logger.warn(event));

      // Page response

      let pageResponse = null;
      pageResponse = await page.goto(url, {
        timeout: timeout,
        waitUntil: defaultWaitUntil as LoadEvent
      });
      pageIndex++;

      /*
        const page2 = await browser.newPage();
        await page2.goto('https://cnn.com', { waitUntil: 'networkidle2' });
        await page2.bringToFront();
        await page2.close();
      */

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

      // --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---

      let duplicatedLinks = [];
      const outputLinks = {
        first_party: [],
        third_party: [],
      }

      output.uri_dest = page.url();
      duplicatedLinks = await getLinks(page);
      REDIRECTED_FIRST_PARTY = parse(output.uri_dest);

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

      // Fill the form to be able to check for keyloggers from setupKeyLoggingInspector

      await fillForms(page);

      let subDomainLinks = [];
      if (getSubdomain(output.uri_dest) !== "www") {
        subDomainLinks = outputLinks.first_party.filter(f => {
          return getSubdomain(f.href) === getSubdomain(output.uri_dest);
        });
      } else {
        subDomainLinks = outputLinks.first_party;
      }
      const browse_links = sampleSize(subDomainLinks, numPages);
      output.browsing_history = [output.uri_dest].concat(
        browse_links.map(l => l.href),
      );

      for (const link of output.browsing_history.slice(1)) {
        logger.log("info", `browsing now to ${link}`, { type: "Browser" });
        if (didBrowserDisconnect) {
          reject(0);
        }
        await page.goto(link, {
          timeout: timeout,
          waitUntil: "networkidle2",
        });

        await fillForms(page);
        await page.waitFor(800);
        pageIndex++;
        duplicatedLinks = duplicatedLinks.concat(await getLinks(page));
        await autoScroll(page);
      }

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

          // Reset of logged event data

          let event_data_all = [];

          await new Promise(done => {
            logger.query(
              {
                start: 0,
                order: "desc",
                limit: Infinity,
                fields: ["message"],
              },
              (err, results) => {
                if (err) {
                  // tslint:disable-next-line:no-console
                  console.log(`Couldnt load event data ${JSON.stringify(err)}`);
                  return done([]);
                }

                return done(results.file);
              },
            );
          }).then((r: any) => {
            event_data_all = r;

            if (!Array.isArray(event_data_all)) {
              reject("Couldnt load event data");
            }
            if (event_data_all.length < 1) {
              reject("Couldnt load event data");
            }

            const event_data = event_data_all.filter(event => {
              return !!event.message.type;
            });

            const blTests = [
              "behaviour_event_listeners",
              "canvas_fingerprinters",
              "canvas_font_fingerprinters"
            ];

            console.log(REDIRECTED_FIRST_PARTY.domain);

            const reports = blTests.reduce((acc, cur) => {
              acc[cur] = generateReport(
                cur,
                event_data,
                '',
                REDIRECTED_FIRST_PARTY.domain,
              );
              return acc;
            }, {});

            extract.reports = reports;

            const json_dump = JSON.stringify({ reports }, null, 2);
            writeFileSync(path.join(outDir, "inspection.json"), json_dump);

            _callBacks['browser-extract-data'](extract);
          });

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
