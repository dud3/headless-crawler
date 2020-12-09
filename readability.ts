import { readFileSync } from 'fs';
import { promises as fs } from 'fs';

import { Page } from "puppeteer";

const readabilityStr = readFileSync('node_modules/@mozilla/readability/Readability.js', {encoding: 'utf-8'});
const { Readability } = require('@mozilla/readability');

function rexecutor() {
  return new Readability({}, document).parse();
}

async function main (page: { page: Page, url: string }) {
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
