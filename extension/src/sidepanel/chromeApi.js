// Sends a message to the active tab's content script.
// If the script isn't there (tab opened before the extension loaded or was
// reloaded), inject it once and retry.
export async function sendToActiveTab(message) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab found.");

  try {
    return await chrome.tabs.sendMessage(tab.id, message);
  } catch (e) {
    const missing =
      /Receiving end does not exist|Could not establish connection/i;
    if (!missing.test(e.message)) throw e;

    // Throws on restricted pages (chrome://, Web Store), which the UI reports.
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content-script.js"],
    });
    return await chrome.tabs.sendMessage(tab.id, message);
  }
}
