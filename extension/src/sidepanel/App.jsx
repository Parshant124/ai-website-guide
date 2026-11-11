import { useState } from "react";
import { MSG } from "../shared/messages.js";
import { sendToActiveTab } from "./chromeApi.js";
import { requestGuidance } from "./api.js";
import GuidanceCard from "./GuidanceCard.jsx";
import ElementList from "./ElementList.jsx";

const UNREACHABLE =
  "Could not reach the page. Reload the tab and try again. " +
  "Note: extensions cannot run on chrome:// pages or the Chrome Web Store.";

export default function App() {
  const [task, setTask] = useState("");
  const [phase, setPhase] = useState("idle"); // idle | scanning | thinking
  const [guidance, setGuidance] = useState(null);
  const [scan, setScan] = useState(null);
  const [error, setError] = useState(null);

  const busy = phase !== "idle";

  // Asks the content script to scan the active tab.
  async function scanActivePage() {
    let res;
    try {
      res = await sendToActiveTab({ type: MSG.SCAN_PAGE });
    } catch (e) {
      console.error(e);
      throw new Error(UNREACHABLE);
    }
    if (!res?.ok) {
      throw new Error(
        `Page scan failed: ${res?.error ?? "no response from page"}`,
      );
    }
    return res.data;
  }

  async function askGuide() {
    const trimmed = task.trim();
    if (trimmed.length < 3) {
      setError("Please describe what you want to do (at least 3 characters).");
      return;
    }

    // Clear previous results so old output never lingers.
    setError(null);
    setGuidance(null);
    setScan(null);

    try {
      setPhase("scanning");
      const page = await scanActivePage();
      setScan(page);

      setPhase("thinking");
      const result = await requestGuidance(trimmed, page);

      setGuidance({
        ...result.guidance,
        latencyMs: result.meta.latencyMs,
        targetElement:
          page.elements.find((e) => e.id === result.guidance.targetElementId) ??
          null,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setPhase("idle");
    }
  }

  async function scanOnly() {
    setError(null);
    setGuidance(null);
    setScan(null);
    setPhase("scanning");
    try {
      setScan(await scanActivePage());
    } catch (e) {
      setError(e.message);
    } finally {
      setPhase("idle");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-800">
      <h1 className="text-lg font-semibold">AI Website Guide</h1>
      <p className="mt-1 text-sm text-slate-500">
        Tell me what you want to do on this page.
      </p>

      <textarea
        value={task}
        onChange={(e) => setTask(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !busy) {
            e.preventDefault();
            askGuide();
          }
        }}
        rows={2}
        placeholder='e.g. "How do I search for something?"'
        className="mt-3 w-full rounded-md border border-slate-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
      />

      <button
        onClick={askGuide}
        disabled={busy}
        className="mt-2 w-full rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {phase === "scanning" && "Reading the page..."}
        {phase === "thinking" && "Thinking..."}
        {phase === "idle" && "Guide me"}
      </button>

      {error && (
        <div className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {guidance && <GuidanceCard guidance={guidance} />}

      <p className="mt-4 text-xs text-slate-400">
        Page text (button and link labels) is sent to an AI service to generate
        guidance. Passwords and typed values are never read. Use on public pages
        while testing. You stay in control: nothing is clicked for you.
      </p>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-slate-500">
          Developer view
        </summary>
        <button
          onClick={scanOnly}
          disabled={busy}
          className="mt-2 rounded-md bg-slate-600 px-3 py-1.5 text-xs text-white hover:bg-slate-700 disabled:opacity-50"
        >
          Scan page only
        </button>

        {scan && (
          <div className="mt-3">
            <p className="text-xs">
              {scan.elements.length} elements sent of {scan.totalFound} found
              {scan.truncated && (
                <span className="ml-1 text-amber-700">(truncated)</span>
              )}
              , scan #{scan.scanId}
            </p>
            <ElementList elements={scan.elements} />
            <details className="mt-3 text-xs">
              <summary className="cursor-pointer text-slate-500">
                Raw JSON sent to the AI
              </summary>
              <pre className="mt-2 max-h-64 overflow-auto rounded bg-slate-900 p-2 text-green-200">
                {JSON.stringify(scan, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </details>
    </div>
  );
}
