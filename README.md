# AI Website Guide

An AI-powered Chrome extension that helps people find their way around unfamiliar or complicated websites. The user describes a goal in plain language ("Where can I change my password?"). The extension reads the current page, asks an AI model what to do next, and shows a single, specific instruction that points at a real element on the page.

The user always performs the actions themselves. The extension never clicks or types for them.

> **Project status: Phase 1 of the minor project.** See [What is implemented](#what-is-implemented-and-what-is-not) for exactly what works today and what is planned.

---

## What is implemented, and what is not

| Capability | Status |
|---|---|
| Chrome Manifest V3 extension with a React side panel | Implemented |
| DOM inspection: finds visible buttons, links, inputs, etc. and describes them as structured data | Implemented |
| Privacy filtering: no typed values are read, query strings are stripped, sensitive fields are flagged | Implemented |
| Express backend with request validation | Implemented |
| Gemini integration returning structured JSON guidance | Implemented |
| Backend rejects AI answers that reference elements not on the page | Implemented |
| Guidance card in the side panel (step, question, done, can't help) | Implemented |
| Highlighting the target element on the page | **Planned (phase 2)** |
| Step verification (did the action work?) | **Planned (phase 2)** |
| Recovery when a step fails or the page changes | **Planned (phase 2)** |
| Multi-step task memory | **Planned (phase 2)** |

---

## How it works

```
 User types a task in the side panel
            │
            ▼
 Content script scans the page ──► structured list of elements (el_1, el_2, ...)
            │
            ▼
 Side panel sends { task, page } to the backend
            │
            ▼
 Backend validates the request ──► calls the Gemini API (structured JSON output)
            │
            ▼
 Backend validates the AI answer:
   - the target must be an element from the scan
   - the target must not be disabled
   - non-step answers must not name a target
            │
            ▼
 Side panel shows the guidance card
```

Key design points:

- **The AI never sees raw HTML or selectors.** It receives a filtered, capped list of elements (maximum 150, visible ones first) with temporary IDs such as `el_12`.
- **The AI can only choose an ID.** It cannot run code or act on the page, so the worst a bad answer can do is point at the wrong element, and the backend blocks IDs that do not exist.
- **Page text is treated as untrusted.** The system prompt tells the model to ignore instructions found inside page content (prompt-injection defence).
- **The API key lives only on the backend**, in an environment variable.

---

## Tech stack

| Part | Technology |
|---|---|
| Extension UI | React, Vite, Tailwind CSS |
| Extension platform | Chrome Manifest V3, Side Panel API, content scripts, scripting API, runtime messaging |
| Backend | Node.js, Express, zod (validation) |
| AI | Google Gemini API (`@google/genai`) |

No database is used in this version.

---

## Project structure

```
ai-website-guide/
├── extension/
│   ├── public/manifest.json
│   ├── sidepanel.html
│   ├── vite.config.js            # builds side panel + service worker
│   ├── vite.content.config.js    # builds the content script as one classic script (IIFE)
│   └── src/
│       ├── sidepanel/            # React UI: App, GuidanceCard, ElementList, api.js, chromeApi.js
│       ├── background/           # service-worker.js (opens the side panel)
│       ├── content/              # content-script.js, inspector.js (DOM inspection)
│       └── shared/               # messages.js (message types), config.js (backend URL)
├── backend/
│   └── src/
│       ├── server.js             # Express app and /api/guide route
│       ├── ai.js                 # Gemini call, system prompt, error mapping
│       ├── schema.js             # request schema + AI answer validation
│       ├── config.js             # environment variables
│       └── errors.js             # consistent error type
└── docs/
```

---

## Setup

### Requirements

- Node.js 18.11 or newer
- Google Chrome
- A Gemini API key (create one in Google AI Studio)

### 1. Backend

```bash
cd backend
npm install
```

Create `backend/.env` (never commit this file):

```
PORT=3001
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=exact-model-id-from-ai-studio
AI_TIMEOUT_MS=20000
```

Choose a Flash or Flash-Lite model that lists a free tier, and copy its ID exactly (lowercase, hyphenated, no quotes).

```bash
npm run dev
```

Expected output: `Backend running on http://localhost:3001 (model: ...)`. Check `http://localhost:3001/health` returns `{"status":"ok"}`.

After editing `.env`, stop the server and start it again. It does not reload `.env` automatically.

### 2. Extension

```bash
cd extension
npm install
npm run build
```

Then in Chrome:

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select the `extension/dist` folder.
4. Open a normal website and click the extension icon to open the side panel.

After every rebuild, click the reload icon on the extension card. Tabs opened before the extension was loaded are handled automatically (the script is injected on first use).

The backend address is set in `extension/src/shared/config.js`.

---

## Using it

1. Start the backend.
2. Open a public website.
3. Open the side panel and type what you want to do, for example *"How do I search for something?"*.
4. Click **Guide me**. The panel reads the page, asks the AI, and shows a card:
   - **Next step**: what to click, with the target element's text and kind
   - **Question**: the AI needs you to clarify
   - **Done**: the page already shows what you asked for
   - **Can't help**: nothing on this page leads toward your goal

The **Developer view** at the bottom shows the scanned elements and the exact JSON sent to the AI.

---

## API contract

### `POST /api/guide`

Request:

```json
{
  "task": "Open my account settings",
  "page": {
    "scanId": 1,
    "url": "https://example.com/dashboard",
    "title": "Dashboard",
    "headings": [{ "level": 1, "text": "Dashboard" }],
    "elements": [
      { "id": "el_2", "kind": "link", "text": "Account settings", "href": "/settings",
        "inputType": null, "disabled": false, "sensitive": false, "inViewport": true }
    ],
    "totalFound": 1,
    "truncated": false
  }
}
```

Success response:

```json
{
  "status": "ok",
  "scanId": 1,
  "guidance": {
    "type": "step",
    "message": "Click \"Account settings\" to open your account options.",
    "targetElementId": "el_2",
    "expectedOutcome": { "type": "url_change", "hint": "Navigates to the settings page." },
    "confidence": "high"
  },
  "meta": { "model": "…", "latencyMs": 3647 }
}
```

- `guidance.type` is one of `step`, `clarify`, `complete`, `cannot_help`.
- `targetElementId` is set only for `step`; otherwise `null`.
- `scanId` is added by the backend, not the AI.

Error response (the HTTP status varies, the shape is fixed):

```json
{ "status": "error", "error": { "code": "AI_TIMEOUT", "message": "The AI took too long to respond." } }
```

Error codes: `INVALID_REQUEST`, `INVALID_AI_RESPONSE`, `AI_TIMEOUT`, `AI_AUTH`, `AI_CONFIG`, `AI_RATE_LIMITED`, `AI_FAILURE`, `AI_REFUSED`, `INTERNAL`.

---

## Security and privacy

What the design does:

- The API key is never in the extension. It is only in `backend/.env`.
- Values typed into inputs, selects, textareas and editable areas are never read. Only labels and placeholders are.
- Password and payment fields are flagged `sensitive` and the AI is told never to ask the user to share them.
- Link query strings and fragments are removed before sending.
- Request size and element count are capped. The backend validates every incoming field.
- The backend never logs request bodies.
- Nothing is clicked or typed automatically. The user stays in control.

What to be aware of:

- **Free-tier Gemini:** Google's terms for unpaid usage allow prompts and responses to be used to improve its products, and not to submit sensitive or personal information. **Use only public pages or test accounts while on the free tier.** A deployed version should use a paid tier.
- The extension requests access to all `http(s)` pages so it can inspect the active tab on demand. It only reads a page when the user clicks **Guide me**. Narrowing this is a planned hardening step.
- The backend currently has no authentication or rate limiting, since it is designed for local use in this phase.

---

## Known limitations

- **Clickable elements without semantic markup** (for example a `<div>` with a JavaScript click handler and no role) are not detected. Older or custom-built sites are affected most.
- **Shadow DOM and iframes** are not scanned.
- Elements with no visible text or label appear without a description, which makes them hard for the AI to reason about.
- The scanner cannot tell when an element is covered by a pop-up or overlay.
- Pages with more than 150 interactive elements are truncated (elements in the current viewport are kept first).
- Guidance is a single step at a time with no memory of earlier steps.
- The AI can be wrong. Low-confidence answers are labelled in the panel. Always check that a suggestion makes sense before acting.
- Free-tier model limits: occasional overload (`503`) and rate limits (`429`). The backend retries once on temporary failures.

---

## Testing and results

Test cases, the recording template and the metric calculations are in the test workbook (`AI_Website_Guide_Test_Sheet.xlsx`). Metrics measured in phase 1: element identification accuracy, instruction correctness and response time.

| Metric | Result |
|---|---|
| Test cases run | _fill in from the workbook's Summary sheet_ |
| Element identification accuracy | _fill in_ |
| Instruction correctness | _fill in_ |
| Average / slowest AI response time | _fill in_ |

Task completion rate, verification accuracy and recovery success rate are **not measured** in this phase because the features they depend on are not implemented yet.

---

## Roadmap

**Phase 2 (planned)**

1. Highlight the target element on the page (target resolver and highlighting engine).
2. Verify whether a step succeeded (URL change, new heading or section, success or validation messages).
3. Recover from failures: rescan, ask the AI for revised guidance, ask the user when the target is ambiguous.
4. Multi-step guidance with task history.
5. Hardening: narrower extension permissions, backend authentication and rate limiting.
6. Full evaluation across representative websites.

**Major project (future scope)**

Screenshot and vision-based understanding, adaptive handling of dynamic sites, multi-page task planning, personalization, and stronger safety confirmations for sensitive actions.

---

## Disclaimer

The user is responsible for every action they take on a website. AI-generated guidance can be incorrect.
