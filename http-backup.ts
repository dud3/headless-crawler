//
// note: NOT used, do NOT remove
//

import { fullLists, PuppeteerBlocker, Request } from '@cliqz/adblocker-puppeteer';
import fetch from 'node-fetch';
import * as puppeteer from 'puppeteer';
import * as socketio from "socket.io";
import { promises as fs } from 'fs';
import * as path from "path";

const express = require('express')
const app = express()
const port = 3002

app.set("port", port);

let http = require("http").Server(app);
let io = require("socket.io")(http);

app.get("/", (req: any, res: any) => {
  res.sendFile(path.resolve("./client/index.html"));
});

const server = http.listen(port, function() {
  console.log("listening on *:" + port);
});

function getUrlToLoad(purl: string): string {
  let url = purl;
  if (process.argv[process.argv.length - 1].endsWith('.ts') === false) {
    url = process.argv[process.argv.length - 1];
  }

  return url;
}

(async () => {
  const browser = await puppeteer.launch({
    defaultViewport: null,
    headless: true
  });

  io.on("connection", async function(socket: any) {
    console.log("Socket connection set...");

    socket.on("send-url", async (url: any) => {
      const blocker = await PuppeteerBlocker.fromLists(fetch, fullLists, {
        enableCompression: true,
      }, {
        path: 'engine.bin',
        read: fs.readFile,
        write: fs.writeFile,
      });

      const page = await browser.newPage();
      await blocker.enableBlockingInPage(page);

      console.log("url: " + url);

      blocker.on('request-blocked', (request: Request) => {
        // type: request.type -> xhr, script, dom...
        // console.log(request.type);
        socket.emit("extract", request.url);
      });

      blocker.on('request-redirected', (request: Request) => {
        socket.emit("extract-request-redirected", request.url);
      });

      blocker.on('request-whitelisted', (request: Request) => {
        socket.emit("extract-whitelisted-redirected", request.url);
      });

      blocker.on('csp-injected', (request: Request) => {
        socket.emit("extract-csp-injected", request.url);
      });

      blocker.on('script-injected', (script: string, url: string) => {
        socket.emit("extract-script-injected", url);
      });

      blocker.on('style-injected', (style: string, url: string) => {
        socket.emit("extract-style-injected", url);
      });

      try {
        await page.goto(getUrlToLoad(url));
      } catch (e) {
        console.log(e);
      } finally {
        setTimeout(async () => {
          console.warn("browser tab closed: " + url);
          await page.close();
        }, 18000);
      }
    });
  });
})();
