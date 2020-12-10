import puppeteer, { LoadEvent, Page, EmulateOptions } from "puppeteer";
import { fullLists, PuppeteerBlocker, Request } from '@cliqz/adblocker-puppeteer';
import { promises as fs } from 'fs';
import fetch from 'node-fetch';

export class Npage {
  index: Number;
  page: Page;
  blocker?: PuppeteerBlocker;
  url: string;
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
  pages: Array<Promise<Npage>> = [];
  rpages: Array<Npage> = [];
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

  async newPages (amount) {
      const promisses = [];
      for (let i = 0; i < amount; i++) {
          promisses.push(new Promise<Npage>(async (resolve) => {
              const instance: Npage = new Npage();
              const page = await this.browser.newPage();

              page.setDefaultTimeout(0);
              page.emulate(this.device);

              if (this.blocker) {
                instance.blocker = await this.getBlocker();
                await instance.blocker.enableBlockingInPage(page);

                await (this.block.map(e => { instance.blocker[e](); }));
              }

              instance.index = i;
              instance.page = page;
              instance.url = '';

              resolve(instance);
          }));
      }

      const pages = await Promise.all(promisses);

      pages.map(p => { this.rpages.push(p); });
  }

  async assignPages (urls) {
      for (let i = 0; i < urls.length; i++) { this.rpages[i].url = urls[i]; }

      return this.rpages;
  }

  get () {
      return this.browser;
  }

  async close (page) {
      this.rpages.splice(0, 1);
      await page.close();
  }

  exit () {
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
}

export default Browser;
