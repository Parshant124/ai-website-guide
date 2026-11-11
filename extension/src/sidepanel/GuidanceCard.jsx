const TYPE_STYLES = {
  step: {
    label: "Next step",
    box: "border-blue-300 bg-blue-50",
    badge: "bg-blue-600",
  },
  clarify: {
    label: "Question",
    box: "border-amber-300 bg-amber-50",
    badge: "bg-amber-500",
  },
  complete: {
    label: "Done",
    box: "border-green-300 bg-green-50",
    badge: "bg-green-600",
  },
  cannot_help: {
    label: "Can't help on this page",
    box: "border-slate-300 bg-slate-100",
    badge: "bg-slate-500",
  },
};

export default function GuidanceCard({ guidance }) {
  const style = TYPE_STYLES[guidance.type] ?? TYPE_STYLES.cannot_help;
  const target = guidance.targetElement;

  return (
    <div className={`mt-4 rounded-md border p-3 text-sm ${style.box}`}>
      <div className="flex items-center justify-between">
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium text-white ${style.badge}`}
        >
          {style.label}
        </span>
        <span className="text-xs text-slate-500">
          confidence: {guidance.confidence} ·{" "}
          {(guidance.latencyMs / 1000).toFixed(1)}s
        </span>
      </div>

      <p className="mt-2 text-base">{guidance.message}</p>

      {target && (
        <p className="mt-2 text-xs text-slate-600">
          Target: <span className="font-medium">{target.kind}</span> "
          {target.text || "(no text)"}"
        </p>
      )}

      {guidance.expectedOutcome?.type !== "none" &&
        guidance.expectedOutcome?.hint && (
          <p className="mt-1 text-xs text-slate-500">
            Expected: {guidance.expectedOutcome.hint}
          </p>
        )}

      {guidance.confidence === "low" && (
        <p className="mt-2 text-xs text-amber-700">
          I'm not very sure about this one. Check it makes sense before
          clicking.
        </p>
      )}
    </div>
  );
}
