import { readFileSync } from 'fs';
import { promises as fs } from 'fs';

import Browser, { Npage, Url, Extract } from './Browser';

async function main (npage: Npage, loadJs: boolean = false) {
  await npage.page.goto(npage.url.url, { timeout: 0, waitUntil: 'load' });

  const fullContent: string = await npage.page.evaluate(() => document.querySelector('*').outerHTML);

  return fullContent;
}

export default {
  main
}
