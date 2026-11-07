// Runs inside the webpage. Stage 1: respond to a ping only.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "PING_PAGE") {
    sendResponse({ ok: true, title: document.title, url: location.href });
  }
  // No async response needed, so we do not return true.
});
