// DOM Inspector: finds interactive elements on the page and describes them
// as plain data. Real DOM nodes stay in `registry` and never leave this file.

const MAX_ELEMENTS = 150;
const MAX_TEXT = 80;
const MAX_HEADINGS = 20;

const CANDIDATE_SELECTOR = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
  "[contenteditable='true']",
  "[role='button']",
  "[role='link']",
  "[role='tab']",
  "[role='menuitem']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='switch']",
  "[role='combobox']",
].join(",");

const SENSITIVE_AUTOCOMPLETE =
  /(^|\s)(cc-[\w-]+|current-password|new-password|one-time-code)/;

// id -> real element. Rebuilt on every scan.
const registry = new Map();
let scanCounter = 0;

function clean(text) {
  return (text || "").replace(/\s+/g, " ").trim().slice(0, MAX_TEXT);
}

function isVisible(el) {
  if (!el.isConnected) return false;
  if (el.closest("[aria-hidden='true'], [inert]")) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return false;
  if (typeof el.checkVisibility === "function") {
    return el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
  }
  const style = getComputedStyle(el);
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    parseFloat(style.opacity) !== 0
  );
}

function isInViewport(el) {
  const r = el.getBoundingClientRect();
  return (
    r.bottom > 0 &&
    r.right > 0 &&
    r.top < window.innerHeight &&
    r.left < window.innerWidth
  );
}

function getKind(el) {
  const tag = el.tagName.toLowerCase();
  const role = el.getAttribute("role");
  if (tag === "a") return "link";
  if (tag === "button" || tag === "summary" || role === "button")
    return "button";
  if (tag === "input") {
    const type = (el.getAttribute("type") || "text").toLowerCase();
    if (["button", "submit", "reset", "image"].includes(type)) return "button";
    if (type === "checkbox" || type === "radio") return type;
    return "input";
  }
  if (tag === "select") return "select";
  if (tag === "textarea") return "textarea";
  if (el.isContentEditable) return "input";
  return role || tag;
}

// Label text that comes from markup, never from what the user typed.
function getLabelText(el) {
  const aria = el.getAttribute("aria-label");
  if (clean(aria)) return clean(aria);

  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent || "")
      .join(" ");
    if (clean(text)) return clean(text);
  }

  if (el.labels && el.labels.length) {
    const text = Array.from(el.labels)
      .map((l) => l.textContent)
      .join(" ");
    if (clean(text)) return clean(text);
  }
  return "";
}

function getText(el, kind) {
  const tag = el.tagName.toLowerCase();
  const label = getLabelText(el);

  if (tag === "input") {
    const type = (el.getAttribute("type") || "text").toLowerCase();
    // Button captions are UI text, not user data. Everything else: no .value.
    if (["button", "submit", "reset"].includes(type)) {
      return clean(el.value) || label;
    }
    return label || clean(el.placeholder) || clean(el.name);
  }

  // Never read text from fields the user types into.
  if (tag === "select" || tag === "textarea" || el.isContentEditable) {
    return label || clean(el.getAttribute("placeholder")) || clean(el.name);
  }

  if (label) return label;
  const visible = clean(el.innerText || el.textContent);
  if (visible) return visible;
  return (
    clean(el.getAttribute("title")) || clean(el.querySelector("img[alt]")?.alt)
  );
}

function isSensitive(el) {
  if (el.tagName.toLowerCase() !== "input") return false;
  const type = (el.getAttribute("type") || "text").toLowerCase();
  if (type === "password") return true;
  return SENSITIVE_AUTOCOMPLETE.test(el.getAttribute("autocomplete") || "");
}

// Path only for same-origin links; origin + path for external. No query/hash.
function safeHref(el) {
  if (el.tagName.toLowerCase() !== "a") return null;
  try {
    const url = new URL(el.href, location.href);
    if (!/^https?:$/.test(url.protocol)) return null;
    return url.origin === location.origin
      ? url.pathname
      : url.origin + url.pathname;
  } catch {
    return null;
  }
}

function describe(el, id) {
  const kind = getKind(el);
  return {
    id,
    kind,
    text: getText(el, kind),
    href: safeHref(el),
    inputType:
      el.tagName.toLowerCase() === "input"
        ? (el.getAttribute("type") || "text").toLowerCase()
        : null,
    disabled:
      Boolean(el.disabled) || el.getAttribute("aria-disabled") === "true",
    sensitive: isSensitive(el),
    inViewport: isInViewport(el),
  };
}

function collectHeadings() {
  return Array.from(document.querySelectorAll("h1, h2, h3"))
    .filter(isVisible)
    .map((h) => ({ level: Number(h.tagName[1]), text: clean(h.textContent) }))
    .filter((h) => h.text)
    .slice(0, MAX_HEADINGS);
}

export function scanPage() {
  registry.clear();
  scanCounter += 1;

  const usable = Array.from(
    document.querySelectorAll(CANDIDATE_SELECTOR),
  ).filter(isVisible);

  // Over the cap: keep what the user can currently see first.
  const chosen =
    usable.length > MAX_ELEMENTS
      ? [
          ...usable.filter(isInViewport),
          ...usable.filter((el) => !isInViewport(el)),
        ].slice(0, MAX_ELEMENTS)
      : usable;

  const elements = chosen.map((el, i) => {
    const id = `el_${i + 1}`;
    registry.set(id, el);
    return describe(el, id);
  });

  return {
    scanId: scanCounter,
    url: location.origin + location.pathname,
    title: clean(document.title),
    headings: collectHeadings(),
    elements,
    totalFound: usable.length,
    truncated: usable.length > MAX_ELEMENTS,
  };
}

// Used by the target resolver in Stage 5. Returns null if the node is gone.
export function getElementById(id) {
  const el = registry.get(id);
  return el && el.isConnected ? el : null;
}
