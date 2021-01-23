import { readFileSync } from 'fs';
import { promises as fs } from 'fs';

import Browser, { Npage, Url, Extract } from './Browser';

const readabilityStr = readFileSync('node_modules/@mozilla/readability/Readability.js', {encoding: 'utf-8'});
const { Readability } = require('@mozilla/readability');

function rexecutor() {
  return new Readability({}, document).parse();
}

async function main (npage: Npage) {
  await npage.page.goto(npage.url.url, { timeout: 0, waitUntil: 'domcontentloaded' });

  const read = await npage.page.evaluate(`
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
