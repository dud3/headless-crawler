import fetch from 'node-fetch';
import { writeFileSync } from "fs";
import sampleSize from "lodash.samplesize";

import puppeteer, { Browser, LoadEvent, Page } from "puppeteer";
import { fullLists, PuppeteerBlocker, Request } from '@cliqz/adblocker-puppeteer';

import { promises as fs, readFileSync } from 'fs';
import * as path from "path";
import * as url from "url";
import os from "os";

import { getDomain, getSubdomain, parse } from "tldts";

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
import { clearDir, clearFile } from "./utils";

const readabilityStr = readFileSync('node_modules/@mozilla/readability/Readability.js', {encoding: 'utf-8'});
const { Readability } = require('@mozilla/readability');

function rexecutor() {
  return new Readability({}, document).parse();
}
export default async (blocker: PuppeteerBlocker, page: Page, url: string, timeout: number = 0, waitFor: number = 0, numPages: number = 3) => {
  const defaultWaitUntil = "domcontentloaded"; // networkidle2, networkidle0, load, domcontentloaded

  const extract = {
    url: '',
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
    blocked: [],
    readability: {} as any,
    reports: {
      canvas_fingerprinters: {
        fingerprinters: []
      },
      key_logging: {},
      session_recorders: {}
    } as any,
    goto: {
      start: 0,
      end: 0
    }
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

  let didBrowserDisconnect = false;

  let REDIRECTED_FIRST_PARTY = parse(url);
  const FIRST_PARTY = parse(url);

  const outDir = path.join(process.cwd(), "extract-dir");
  const outFilePath = path.join(outDir, FIRST_PARTY.domainWithoutSuffix) + ".ndjson";
  const logger = getLogger({ outDir, outFile: FIRST_PARTY.domainWithoutSuffix + ".ndjson", quiet: true });

  blocker.on('request-blocked', (request: Request) => {
    extract.blocked.push(request.url);
  });

  blocker.on('request-redirected', (request: Request) => {
    extract.blocked.push(request.url);
  });

  blocker.on('request-whitelisted', (request: Request) => {
    extract.blocked.push(request.url);
  });

  blocker.on('csp-injected', (request: Request) => {
    extract.blocked.push(request.url);
  });

  /*
  blocker.on('style-injected', async (style: string, url: string) => {
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
  });
  */

  // Page size

  async function addResponseSize(response) {
    const url = response.url();
    extract.requests.data.push(url);
    extract.requests.amount++;
    try {
        const buffer = await response.buffer();
        extract.pageSize += buffer.length;
    } catch {
        // Error: Response body is unavailable for redirect responses
        // TODO: other errors possible ?
    }
  }
  await page.on("response", addResponseSize);

  // Requests
  extract.requests.amount = extract.requests.data.length;

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

  // await setupBlacklightInspector(page, (event) => logger.warn(event));
  await setupSessionRecordingInspector(page, event => logger.warn(event));
  // await setupKeyLoggingInspector(page, event => logger.warn(event));
  // await setupThirdpartyTrackersInspector(page, event => logger.warn(event), false, /* enableAdBlock */);
  // await setupHttpCookieCapture(page, event => logger.warn(event));

  // Page response

  console.log(url);

  extract.goto.start = Date.now();

  try {
    await page.goto(url, {
      timeout: timeout,
      waitUntil: defaultWaitUntil
    });

    await autoScroll(page);
    await page.waitForTimeout(waitFor);
  } catch (e) {
    throw new Error(e);
  }

  extract.goto.end = Date.now();

  // Url

  extract.url = await page.url();
  extract.title = await page.title(); // page._frameManager._mainFrame.evaluate(() => document.title)
  extract.timing.metrics = await page.metrics(); // https://github.com/puppeteer/puppeteer/blob/main/docs/api.md#pagemetrics

  // Timing

  try {
    extract.timing.loadTime = await page.evaluate(_ => {
      return Date.now() - window.performance.timing.navigationStart;
    });
  } catch (e) {
    throw new Error(e);
  }

  // Readability

  try {
    extract.readability = await page.evaluate(`
      (function(){
        ${readabilityStr}
        ${rexecutor}
        return rexecutor();
      }())
    `);
  } catch (e) {
    throw new Error(e);
  }

  // Off events

  // note: causes page to be loaded forever
  // await page.removeAllListeners('response');
  // await page.removeAllListeners('request');

  // Internal and external links

  /*
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

  // Gets n random elements at unique keys from collection up to the size of collection.

  const browse_links = sampleSize(subDomainLinks, numPages);
  output.browsing_history = [output.uri_dest].concat(browse_links.map(l => l.href));

  for (const link of output.browsing_history.slice(1)) {
    logger.log("info", `browsing now to ${link}`, { type: "Browser" });
    if (didBrowserDisconnect) {
      // reject(0);
    }
    await page.goto(link, {
      timeout: timeout,
      waitUntil: "networkidle2",
    });

    await fillForms(page);
    await page.waitForTimeout(800);
    duplicatedLinks = duplicatedLinks.concat(await getLinks(page));
    await autoScroll(page);
  }
  */

  // Reset of logged event data

  let event_data_all = [];

  return await new Promise(done => {
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
      // reject("Couldnt load event data");
    }
    if (event_data_all.length < 1) {
      // reject("Couldnt load event data");
    }

    const event_data = event_data_all.filter(event => {
      return !!event.message.type;
    });

    const blTests = [
      "canvas_fingerprinters",
      "canvas_font_fingerprinters",
      "key_logging",
      "session_recorders",
      "behaviour_event_listeners"
    ];

    const reports: any = blTests.reduce((acc, cur) => {
      acc[cur] = generateReport(
        cur,
        event_data,
        outDir,
        REDIRECTED_FIRST_PARTY.domain,
      );
      return acc;
    }, {});

    extract.reports = reports;

    return extract;
  }).catch(() => {
    throw new Error('File reading failed');
  })
}
