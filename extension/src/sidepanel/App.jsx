import { useState } from "react";
import { MSG } from "../shared/messages.js";

export default function App() {
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function pingPage() {
    setStatus("loading");
    setError(null);
    setResult(null);
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) throw new Error("No active tab found.");

      // Content scripts are not injected into some pages (chrome://, Web Store)
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: MSG.PING_PAGE,
      });
      setResult(response);
      setStatus("done");
    } catch (e) {
      setError(
        "Could not reach the page. Reload the tab and try again. " +
          "Note: extensions cannot run on chrome:// pages or the Chrome Web Store.",
      );
      console.error(e);
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-800">
      <h1 className="text-lg font-semibold">AI Website Guide</h1>
      <p className="mt-1 text-sm text-slate-500">
        Stage 1: extension foundation
      </p>

      <button
        onClick={pingPage}
        disabled={status === "loading"}
        className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {status === "loading" ? "Pinging..." : "Ping page"}
      </button>

      {result && (
        <div className="mt-4 rounded-md border border-green-300 bg-green-50 p-3 text-sm">
          <p className="font-medium text-green-800">Content script responded</p>
          <p className="mt-1 break-all">Title: {result.title}</p>
          <p className="break-all">URL: {result.url}</p>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}
    </div>
  );
}
