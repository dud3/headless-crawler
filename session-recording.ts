import { Page } from "puppeteer";
import * as url from "url";
import { ExtractorEvent, SESSION_RECORDERS_LIST } from "./types";

export const setupSessionRecordingInspector = async (
  page: Page,
  eventDataHandler: (event: ExtractorEvent) => void,
) => {
  page.on("request", async request => {
    const parsedUrl = url.parse(request.url());
    const cleanUrl = `${parsedUrl.hostname}${parsedUrl.pathname}`;
    const stack = [
      {
        fileName: request.frame() ? request.frame()!.url() : "",
      },
    ];
    const matches = SESSION_RECORDERS_LIST.filter(s => cleanUrl.includes(s));

    if (matches.length > 0) {
      eventDataHandler({
        matches,
        stack,
        type: "SessionRecording",
        url: cleanUrl,
      });
    }
  });
};
