import { useMemo, useState } from "react";

export default function ElementList({ elements }) {
  const [filter, setFilter] = useState("all");

  const kinds = useMemo(
    () => ["all", ...new Set(elements.map((e) => e.kind))],
    [elements],
  );
  const shown =
    filter === "all" ? elements : elements.filter((e) => e.kind === filter);

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-1">
        {kinds.map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`rounded-full border px-2 py-0.5 text-xs ${
              filter === k
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-300 bg-white text-slate-600"
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      <ul className="mt-2 divide-y divide-slate-200 rounded-md border border-slate-200 bg-white text-sm">
        {shown.map((e) => (
          <li key={e.id} className="p-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate-400">{e.id}</span>
              <span className="rounded bg-slate-100 px-1.5 text-xs">
                {e.kind}
              </span>
              {e.sensitive && (
                <span className="rounded bg-amber-100 px-1.5 text-xs text-amber-800">
                  sensitive
                </span>
              )}
              {e.disabled && (
                <span className="rounded bg-slate-200 px-1.5 text-xs">
                  disabled
                </span>
              )}
              {!e.inViewport && (
                <span className="text-xs text-slate-400">off-screen</span>
              )}
            </div>
            <p className="mt-1 wrap-break-word">
              {e.text || <em className="text-slate-400">(no text)</em>}
            </p>
            {e.href && (
              <p className="break-all text-xs text-slate-400">{e.href}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
