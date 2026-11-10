import { useState } from "react";
import { MSG } from "../shared/messages.js";
import { sendToActiveTab } from "./chromeApi.js";
import ElementList from "./ElementList.jsx";

const UNREACHABLE =
  "Could not reach the page. Reload the tab and try again. " +
  "Note: extensions cannot run on chrome:// pages or the Chrome Web Store.";

export default function App() {
  const [busy, setBusy] = useState(false);
  const [ping, setPing] = useState(null);
  const [scan, setScan] = useState(null);
  const [error, setError] = useState(null);

    async function run(type, onSuccess) {
      setBusy(true);
      setError(null);
      setPing(null); // clear previous results so old output never lingers
      setScan(null);
      try {
        const res = await sendToActiveTab({ type });
        if (!res?.ok) {
          setError(`Request failed: ${res?.error ?? "no response from page"}`);
          return;
        }
        onSuccess(res);
      } catch (e) {
        console.error(e);
        setError(UNREACHABLE);
      } finally {
        setBusy(false);
      }
    }

  const pingPage = () => run(MSG.PING_PAGE, (res) => setPing(res));
  const scanPage = () => run(MSG.SCAN_PAGE, (res) => setScan(res.data));

  const btn =
    "rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50";

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-800">
      <h1 className="text-lg font-semibold">AI Website Guide</h1>
      <p className="mt-1 text-sm text-slate-500">Stage 2: DOM inspection</p>

      <div className="mt-4 flex gap-2">
        <button onClick={pingPage} disabled={busy} className={btn}>
          Ping page
        </button>
        <button onClick={scanPage} disabled={busy} className={btn}>
          {busy ? "Working..." : "Scan page"}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {ping && (
        <p className="mt-3 break-all text-xs text-green-700">
          Ping OK: {ping.title}
        </p>
      )}

      {scan && (
        <div className="mt-4">
          <p className="text-sm">
            <span className="font-medium">{scan.elements.length}</span> elements
            sent of {scan.totalFound} found
            {scan.truncated && (
              <span className="ml-1 text-amber-700">(truncated)</span>
            )}
            , scan #{scan.scanId}
          </p>
          <p className="break-all text-xs text-slate-500">{scan.url}</p>

          {scan.headings.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs text-slate-600">
              {scan.headings.map((h, i) => (
                <li key={i}>
                  h{h.level}: {h.text}
                </li>
              ))}
            </ul>
          )}

          <ElementList elements={scan.elements} />

          <details className="mt-3 text-xs">
            <summary className="cursor-pointer text-slate-500">
              Raw JSON (what the AI would receive)
            </summary>
            <pre className="mt-2 max-h-64 overflow-auto rounded bg-slate-900 p-2 text-green-200">
              {JSON.stringify(scan, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
