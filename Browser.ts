import puppeteer, { LoadEvent, Page } from "puppeteer";
import { fullLists, PuppeteerBlocker, Request } from '@cliqz/adblocker-puppeteer';
import { promises as fs } from 'fs';
import fetch from 'node-fetch';

class Npage {
    index: number;
    page: Page;
    url: string;
}

class Browser {
    id: String;
    browser: puppeteer.Browser;
    device: Object;
    blocker: PuppeteerBlocker;
    headless: boolean;
    pages: Array<Promise<Npage>> = [];
    rpages: Array<Npage> = [];
    width: Number;
    height: Number;

    constructor (id, headless, width, height) {
        this.id = id;
        this.headless = headless;
        this.width = width;
        this.height = height;

        // this.device = puppeteer.devices['iPhone X'];
        // page.emulate(deviceOptions);
    }

    async launch () {
        this.blocker = await PuppeteerBlocker.fromLists(
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

        this.browser = await puppeteer.launch({
          args: [
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--ignore-certificate-errors",
            "--autoplay-policy=no-user-gesture-required",
            "--disable-extensions-except=/home/dud3/Downloads/bypass-paywalls-chrome-clean-master",
            "--load-extension=/home/dud3/Downloads/bypass-paywalls-chrome-clean-master",
            `--window-size=${this.width},${this.height}`
          ],
          defaultViewport: null,
          headless: this.headless
        });
    }

    async newPages (amount) {
        const promisses = [];
        for (let i = 0; i < amount; i++) {
            promisses.push(new Promise<Npage>(async (resolve) => {
                const page = await this.browser.newPage();
                await this.blocker.enableBlockingInPage(page);
                await this.blocker.blockMedias().blockImages().blockStyles().blockFonts();

                resolve({ index: i, page, url: '' });
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
}

export default Browser;
