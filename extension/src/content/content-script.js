import { MSG } from "../shared/messages.js";
import { scanPage } from "./inspector.js";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message?.type) {
    case MSG.PING_PAGE:
      sendResponse({ ok: true, title: document.title, url: location.href });
      break;

    case MSG.SCAN_PAGE:
      try {
        sendResponse({ ok: true, data: scanPage() });
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
      break;
  }
  // Synchronous responses only, so we do not return true.
});
