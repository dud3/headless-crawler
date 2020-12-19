import puppeteer, { LoadEvent, Page, EmulateOptions } from "puppeteer";
import { fullLists, PuppeteerBlocker, Request } from '@cliqz/adblocker-puppeteer';
import { promises as fs } from 'fs';
import fetch from 'node-fetch';

export class Npage {
  index: number;
  page: Page;
  blocker?: PuppeteerBlocker;
  url: string;
  urlid: number;
}

export class Config {
  id: string;
  device: EmulateOptions;
  headless: boolean;
  width: Number;
  height: Number;
  extensions: Array<string>;
}

class Browser {
  id: string;
  browser: puppeteer.Browser;
  device: EmulateOptions;
  headless: boolean;
  pages: Array<Npage> = [];
  width: Number;
  height: Number;
  blocker: Boolean;
  block: Array<"blockMedias" | "blockImages" | "blockStyles" | "blockFonts"> = [];
  chromeArgs: Array<string> = [];

  constructor ({
    id = 'x',
    device = puppeteer.devices["iPhone X"],
    headless = false,
    width = 1200,
    height = 600,
    blocker = false,
    block = [],
    chromeArgs = []
  }) {
    this.id = id;
    this.headless = headless;
    this.width = width;
    this.height = height;

    this.device = device;
    this.chromeArgs = chromeArgs;
    this.blocker = blocker;
  }

  async launch () {
    const args = [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--ignore-certificate-errors",
      "--autoplay-policy=no-user-gesture-required",
      // "--enable-resource-load-scheduler=false",
      `--window-size=${this.width},${this.height}`
    ];

    this.chromeArgs.map(e => { args.push(e) });

    this.browser = await puppeteer.launch({
      args,
      defaultViewport: null,
      headless: this.headless
    });
  }

  get () {
    return this.browser;
  }

  close () {
    this.browser.close();
  }

  async getBlocker () {
    return await PuppeteerBlocker.fromLists(
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
  }

  async newPage (url, i = 0) {
    const npage: Npage = new Npage();
    const page = await this.browser.newPage();

    // page.setDefaultTimeout(0);
    // page.emulate(this.device);

    if (this.blocker) {
      npage.blocker = await this.getBlocker();
      await npage.blocker.enableBlockingInPage(page);

      await (this.block.map(e => { npage.blocker[e](); }));
    }

    npage.index = i;
    npage.page = page;
    npage.url = url;

    return npage;
  }

  async newPages (urls) {
    const promisses = [];
    for (let i = 0; i < urls.length; i++) {
      promisses.push(new Promise<Npage>(async (resolve) => {
        resolve(await this.newPage(urls[i], i));
      }));
    }

    return this.pages = (await Promise.all(promisses)).map(p => p);
  }

  pushNewPage (page: Npage) {
    this.pages.push(page);
  }

  findPage (page) {
    return this.pages.filter(p => p.index == page.index)
  }

  async closePage (page) {
    this.pages.splice(page.i, 0);
    await page.page.close();
  }
}

export default Browser;
