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
      'style-injected': () =>  {}
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
              _callBacks[key](script, url);
            })
        break;
      }
    }

    try {
      await page.goto(url);
    } catch (e) {
      console.log(e);
    } finally {
      setTimeout(async () => {
        await page.close();
        console.log(">>> Browser tab closed: " + url);
        resolve(1);
      }, timeout);
    }
  });
}

export default {
  main
}
