import { readFileSync } from 'fs';
import { promises as fs } from 'fs';

import { Page } from "puppeteer";

const readabilityStr = readFileSync('node_modules/@mozilla/readability/Readability.js', {encoding: 'utf-8'})
const { Readability } = require('@mozilla/readability');

function rexecutor() {
  return new Readability({}, document).parse();
}

async function main (page: { page: Page; url: string }) {
  /*
    await page.removeAllListeners('request');
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (request.resourceType() == 'media'
        || request.resourceType() == 'image'
        || request.resourceType() == 'stylesheet'
        || request.resourceType() == 'font') {
          request.abort();
      } else {
          request.continue();
      }
  });
  */

  await page.page.goto(page.url, { timeout: 0, waitUntil: 'domcontentloaded' });

  const read = await page.page.evaluate(`
    (function(){
      ${readabilityStr}
      ${rexecutor}
      return rexecutor();
    }())
  `);

  return read;
}

export default {
  main
}
