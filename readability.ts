import { readFileSync } from 'fs';
import { promises as fs } from 'fs';
import fetch from 'node-fetch';

import puppeteer, { Browser, LoadEvent, Page } from "puppeteer";
import { fullLists, PuppeteerBlocker, Request } from '@cliqz/adblocker-puppeteer';

const readabilityStr = readFileSync('node_modules/@mozilla/readability/Readability.js', {encoding: 'utf-8'})
const { Readability } = require('@mozilla/readability');

/*
const puppeteer = require('puppeteer');

puppeteer.launch().then(async browser => {
  const promises=[];
  for(let i = 0; i < 10; i++){
    console.log('Page ID Spawned', i)
    promises.push(browser.newPage().then(async page => {
      await page.goto('https://www.example.com/');
      await page.screenshot({path: '../images/result' + i + '.png'});
    }))
  }
  await Promise.all(promises)
  browser.close();
});
*/

function rexecutor() {
  return new Readability({}, document).parse();
}

const _callBacks: Record<string, any> = {
  'browser-tab-closed': () => {},
  'browser-extract-data': () => {}
}

async function main (urls: Array<string>, headless: boolean, callBacks?: Record<string, any>) {
  for (const key in callBacks) if (typeof callBacks[key] === 'function') _callBacks[key] = callBacks[key]

  return new Promise(async (resolve, reject) => {
     const blocker = await PuppeteerBlocker.fromLists(
      fetch,
      fullLists,
      {
        enableCompression: true,
      },
      {
        path: 'engine.bin',
        read: fs.readFile,
        write: fs.writeFile,
      },
    );

    console.log(urls);

    const extracts = [];

    // const deviceOptions = puppeteer.devices['iPhone X'];

    await puppeteer.launch({
      args: [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-setuid-sandbox",
        "--ignore-certificate-errors",
        "--autoplay-policy=no-user-gesture-required",
      ],
      defaultViewport: null,
      headless,
    }).then(async browser => {
      const promises = [];

      // page.emulate(deviceOptions);

      for (const key in urls) {
        promises.push(browser.newPage().then(async page => {
          await blocker.enableBlockingInPage(page);
          await page.goto(urls[key], { timeout: 0 });

          const read = await page.evaluate(`
            (function(){
              ${readabilityStr}
              ${rexecutor}
              return rexecutor();
            }())
          `);

          extracts.push(read);

          await page.close();
          console.log(">>> Browser tab closed: " + urls[key]);
        }));
      }

      await Promise.all(promises);
      await browser.close();
    });

    resolve(extracts);
  });
}

export default {
  main
}
