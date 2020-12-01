import puppeteer, { LoadEvent, Page } from "puppeteer";
import { fullLists, PuppeteerBlocker, Request } from '@cliqz/adblocker-puppeteer';
import { promises as fs } from 'fs';
import fetch from 'node-fetch';

class Browser {
    browser: puppeteer.Browser;
    device: Object;
    blocker: PuppeteerBlocker;
    headless: boolean;
    tabs: Array<Promise<any>> = [];

    constructor (headless) {
        this.headless = headless;

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
          ],
          defaultViewport: null,
          headless: this.headless,
        });

        return this;
    }

    async goto (urls) {
        urls.map((url) => {
            this.tabs.push(this.browser.newPage().then(async (page) => {
                await this.blocker.enableBlockingInPage(page);
                await page.goto(url);
            }));
        })
    }

    async invokeTabs () {
        await Promise.all(this.tabs)
    }

    getTabs () {
        return this.tabs
    }

    close () {
        this.browser.close();
    }
}

export default Browser;
