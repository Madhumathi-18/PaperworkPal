# Paperwork Pal

Upload or paste a confusing official letter (government notice, bank or insurance letter, tax notice, rental agreement, scheme form) and get a **plain-language explanation, a short action checklist and the deadline, in your own language, with voice support**.

Built for people who struggle with jargon-heavy paperwork because of language, literacy or disability: citizens with limited English, elderly users, people with low vision, and anyone overwhelmed by formal documents.

> Paperwork Pal explains documents. It does **not** give legal, tax or financial advice, and it always says so.

|               |                                                                                                           |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| **Live demo** | [paperwork-pal-three.vercel.app](https://paperwork-pal-three.vercel.app/) (see [Deployment](#deployment)) |
| **Hackathon** | PromptWars x Echo Engineer's AI Vibeathon 2026                                                            |

## Features

- **Input:** photo or PDF (JPG, PNG, WEBP, PDF) or pasted text. Text can be dictated with the microphone.
- **AI analysis (Gemini):** document type, plain summary, who sent it and what they want, key facts (reference numbers masked), **deadline**, **3 to 7 step checklist**, **risk level** (icon + text) and questions to ask the sender.
- **8 output languages:** English, Hindi, Tamil, Telugu, Kannada, Malayalam, Bengali, Marathi. The result screen (headings, risk label, deadline wording, checklist counter, chat and calendar buttons) is shown in the chosen language too, not only the explanation.
- **Clean scripts:** if Gemini's answer mixes in letters from another Indian script (for example Malayalam letters inside Tamil), the app asks once more with a stricter instruction (`src/lib/scripts.ts`).
- **Read aloud** (pause, resume, stop) using the browser's speech synthesis, with a voice matched to the language.
- **Follow-up chat** that answers from this document only, and says "I can't tell from this document" otherwise.
- **Deadline helpers:** "Add to Google Calendar" link and `.ics` download. No sign-in needed.
- **Accessibility controls:** text size (A-, A, A+), high contrast, full keyboard use, screen-reader announcements.
- **3 built-in sample documents** (all fake) so anyone can try it with one click and no upload.
- **One document at a time:** adding a file clears pasted text, and typing or clicking a sample removes a chosen file, so an old sample can never be explained in place of an upload.
- **Privacy first:** personal numbers are hidden before text reaches the AI, nothing is stored.

## Chosen vertical, approach and assumptions

### Vertical and persona

**Everyday citizen help, with accessibility at the centre:** an assistant that turns official paperwork into something a person can act on. The persona is someone who receives a government, bank, tax, insurance or rental letter and cannot easily read it because of language, literacy, age, low vision or plain stress. They need three answers: _what is this, what must I do, and by when?_

### Approach and logic

The assistant makes decisions from the user's context (their document, chosen language and follow-up questions) rather than returning a generic summary:

1. **Protect first.** Personal numbers (Aadhaar, PAN, phone, email, bank account, card, IFSC) are masked before any text goes to the AI.
2. **Understand with structure.** Gemini must answer in a fixed JSON shape (document type, summary, sender, what they want, key facts, deadline, steps, risk, questions). The app checks the answer with a schema and asks once more if it is malformed.
3. **Decide what matters.** The deadline is turned into a plain statement against today's date ("in 5 days", "yesterday"). The **risk level** (low, medium, high) is shown with an icon and words, with a short reason, so urgency is clear without relying on colour.
4. **Act.** Each document gets a 3 to 7 step checklist with a progress bar, a calendar reminder for the deadline, and questions to ask the sender.
5. **Stay grounded.** Follow-up questions are answered from this document only. If the answer is not in it, the assistant says it can't tell.
6. **Reach the person.** The explanation and the result screen are in the chosen language, can be read aloud, and the text size and contrast can be changed. If the model mixes in letters from another script, the answer is requested again.

### How it works (user view)

Pick a language, then upload a photo or PDF, paste text, dictate, or try a sample. Press **Explain my document**. The result shows the summary, risk, deadline, checklist and key facts. Then ask follow-up questions or listen to the answer. Nothing is saved. The technical flow is in [Architecture](#architecture).

### Assumptions

- Documents are mostly Indian official paperwork (the redaction patterns and the eight languages reflect this), though other letters usually work.
- The user is explained to, not advised: the app never gives legal, tax or financial advice, and important decisions should be confirmed with the sender or a professional.
- Deadlines are read from the document and compared with the date on the user's device, so they are only as reliable as the date the document states and the device's clock.
- Photos and PDFs cannot be masked before upload, so users are asked for consent first and shown the privacy note.
- A free Gemini API key is enough for demo traffic. Rate limits are per instance and best-effort.

## How this meets the evaluation criteria

### Code Quality

- Clear structure: UI in `src/components`, all logic in `src/lib` (no business logic inside components), state in small hooks under `src/hooks`, thin API routes under `src/app/api`.
- TypeScript `strict` (plus `noUncheckedIndexedAccess`), no `any` (enforced by ESLint), named exports with explicit types, JSDoc on non-trivial functions.
- One place for limits and tunables: `src/lib/constants.ts`. Languages in `src/lib/languages.ts`. Server settings from env in `src/lib/config.ts`.
- One small error type (`AppError` in `src/lib/errors.ts`) turns every failure into `{ "error": { "code", "message" } }` with the right status.
- One source of truth for AI output: the zod schema in `src/lib/gemini/schema.ts` validates the model's answer **and** generates the JSON schema sent to Gemini.
- ESLint (`eslint-config-next`), Prettier, and a CI workflow (`.github/workflows/ci.yml`) that runs everything on each push.

### Security

| Concern                  | What we do                                                                                                                                                                                                                                      | Where                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Secrets                  | `GEMINI_API_KEY` is read on the server only. `.env*` is git-ignored (except `.env.example`). The built client assets are free of the key and of any Gemini URL.                                                                                 | `src/lib/config.ts`, `.gitignore`                        |
| PII redaction            | Aadhaar, PAN, Indian mobile, email, bank account, card (Luhn-checked) and IFSC are replaced with tags like `[PAN]` **before** anything is sent to Gemini. Chat questions are redacted too. Dates and amounts are not touched (tested).          | `src/lib/security/redact.ts`                             |
| Output PII               | The model's answer is redacted again, and long reference numbers are masked (`•••••5678`), which matters for photos and PDFs that cannot be redacted before upload.                                                                             | `src/lib/gemini/analyze.ts` (`finalizeAnalysis`)         |
| Upload validation        | Declared MIME type **and** magic bytes must match; size limit (413) and type (415) are enforced; body size is checked from `Content-Length` before reading.                                                                                     | `src/lib/security/validate.ts`                           |
| Prompt injection         | Document text is fenced in `<document>` tags and any fake closing tag inside it is neutralised. The system prompt calls the document untrusted data. Output is schema-constrained, then zod-validated, then redacted. Injection tests exist.    | `src/lib/gemini/prompts.ts`, `tests/api.analyze.test.ts` |
| Safe output              | All AI text is rendered as plain React text (no `dangerouslySetInnerHTML`). Calendar link parts go through `encodeURIComponent`; `.ics` text is escaped.                                                                                        | `src/lib/calendar.ts`, tests                             |
| Abuse resistance         | Per-IP, per-route rate limit (`RATE_LIMIT_PER_MIN`, with `Retry-After`), input length caps (20,000 characters, 500-character questions, 10 history items), size limits. The in-memory limiter is best-effort on serverless (noted in the code). | `src/lib/security/rateLimit.ts`, `src/lib/api/http.ts`   |
| Headers                  | Content-Security-Policy, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, HSTS, and a restrictive `Permissions-Policy` that allows the microphone for this origin only.          | `src/lib/securityHeaders.ts`, `next.config.ts`           |
| No persistence / logging | Nothing is stored. Logs contain only request id, route, status and timing, never document text. Errors never leak stack traces or raw model messages.                                                                                           | `src/lib/api/http.ts`                                    |
| Dependencies             | Few, pinned to exact versions, `npm audit` reports 0 vulnerabilities.                                                                                                                                                                           | `package.json`                                           |

### Efficiency

- **Cache:** identical requests (hash of _redacted_ content + language) are served from an in-memory LRU (50 entries, 30-minute TTL), so a repeat costs no Gemini call. The cache never holds raw PII. `src/lib/cache.ts`
- **Fast, cheap model:** a Flash-Lite model by default, with a fallback model. Both set by env var.
- **Small payloads:** photos are resized in the browser to at most 1600 px and re-encoded as JPEG (quality 0.8) before upload. `src/lib/client/files.ts`
- **No duplicate calls:** the submit button is disabled while loading, a new request aborts the one in flight, and Cancel aborts it.
- **Lean client:** the result screen is lazy-loaded; fonts come from `next/font` (self-hosted, per-script so only the scripts on screen download); no UI library, no zod on the client.
- Lighthouse on a local production build (mobile defaults): Performance 100, Accessibility 100, Best Practices 96 before the favicon was added (the only failure was a missing `favicon.ico`).

### Testing

Run everything with one command: `npm test` (277 tests in 22 files, about 30 seconds). `npm run test:coverage` reports about 98% line coverage of `src/lib`.

| Area                | Tests                                                                                                                                                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit                | `tests/redact.test.ts` (every pattern, false positives, Luhn), `validate`, `schema`, `calendar`, `cache`, `rateLimit`, `config`, `speech`, client helpers                                                                     |
| Languages           | `tests/labels.test.ts` (all 8 languages have every label, none is empty, and none mixes in letters from another script), `tests/scripts.test.ts` (script checker)                                                             |
| Gemini layer        | `tests/gemini.client.test.ts` (backoff, 429/503 retry, fallback model, auth errors, no logging of content), `gemini.prompts`, `gemini.analyze` (including the mixed-script retry)                                             |
| API (Gemini mocked) | `tests/api.analyze.test.ts`, `api.chat.test.ts`: success, validation (400/413/415), cache hit, rate limit (429), malformed AI output, **prompt injection**, no-PII-in-logs                                                    |
| Resilience          | `tests/api.resilience.test.ts` drives the real client with a mocked SDK: **429 retries, then falls back, then a friendly 503**                                                                                                |
| Components and a11y | `tests/a11y.test.tsx` runs **jest-axe** on every main component and state, and checks labels, roles, keyboard use, focus, `lang`; `tests/flow.test.tsx` covers the whole user flow, including the one-document-at-a-time rule |
| Security headers    | `tests/securityHeaders.test.ts`                                                                                                                                                                                               |

### Accessibility

- **WCAG 2.2 AA** targets: one `h1`, logical heading order, landmarks (`header`, `nav`, `main`, `footer`, labelled `section`s), a skip link, a visible 3 px focus ring, every field has a `label`, and nothing traps the keyboard.
- **Announcements:** an `aria-live="polite"` region says "Analyzing your document…", "Result ready…" or the error text. Focus moves to the result heading when the analysis finishes. After a follow-up answer, focus returns to the question box.
- **Not colour alone:** risk is shown as a distinct icon shape plus words ("High risk"). Colour pairs are at least 4.5:1, and there is a **high-contrast mode** (`src/app/globals.css`).
- **Text size** A-, A, A+ and high contrast are remembered in `localStorage` (wrapped in try/catch). `prefers-reduced-motion` and `prefers-color-scheme` are respected.
- **Touch targets** are at least 44 px; the layout was checked at 320 px wide with the largest text (no horizontal scroll).
- **Voice:** read aloud with pause/resume/stop and a language-matched voice (`src/hooks/useReadAloud.ts`, `src/lib/speech.ts`), and dictation with the microphone. Both detect support and show a plain message when unavailable or when the device has no voice for the language.
- The result container carries `lang` for the output language, and its fixed headings and buttons are translated, so screen readers pronounce everything correctly. The few English-only notes inside it are marked `lang="en"`.
- Plain-language copy for every label and error. Automated: `jest-axe` tests plus Lighthouse Accessibility 100.

### Google Services

| Service                               | How we use it                                                                                                                                            | Cost                    |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| **Gemini API** (`@google/genai`)      | Document understanding (text and photos/PDFs), explanation, translation to 8 languages, follow-up chat. Structured JSON output via `responseJsonSchema`. | Free tier, rate limited |
| **Google AI Studio**                  | Issues the free API key used by the Gemini API (no Google Cloud project or billing needed)                                                               | Free                    |
| **Google Calendar**                   | Template link `https://calendar.google.com/calendar/render?action=TEMPLATE&…` plus an `.ics` fallback (no OAuth)                                         | Free                    |
| **Google Fonts** (`next/font/google`) | Noto Sans plus Devanagari, Tamil, Telugu, Kannada, Malayalam and Bengali, self-hosted at build time                                                      | Free                    |

Hosting is on **Vercel** (not a Google service). The app does not depend on Google Cloud: the same `Dockerfile` also runs on Cloud Run or any container host if you prefer.

## Architecture

```mermaid
flowchart LR
  subgraph Browser
    UI[React UI<br/>PaperworkApp] --> Img[Resize photos<br/>canvas]
    UI --> Voice[Web Speech API<br/>dictation + read aloud]
  end
  UI -- multipart/JSON --> A[/api/analyze/]
  UI -- JSON --> C[/api/chat/]
  subgraph Server[Next.js API routes on Vercel]
    A --> RL[Rate limit] --> V[Validate<br/>MIME + magic bytes + size] --> R[Redact PII] --> K{LRU cache}
    K -- miss --> G[Gemini client<br/>timeout, retry, fallback]
    C --> RL
    G --> S[zod validate] --> F[Final redaction + masking]
  end
  G <--> Gemini[(Gemini API)]
```

Request flow for `/api/analyze`: rate limit → body size check → parse → zod fields → file validation → text redaction → cache lookup → Gemini (structured output) → zod validation (one re-ask on failure) → output redaction → zod-validated response.

## Setup

Prerequisites: Node.js 20.9 or newer, and a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).

```bash
npm install
cp .env.example .env.local      # then put your key in GEMINI_API_KEY
npm run dev                     # http://localhost:3300
npm test                        # run all tests
```

| Variable                | Default                 | Purpose                               |
| ----------------------- | ----------------------- | ------------------------------------- |
| `GEMINI_API_KEY`        | (required)              | Server-side only                      |
| `GEMINI_MODEL`          | `gemini-3.5-flash-lite` | Primary model                         |
| `GEMINI_FALLBACK_MODEL` | `gemini-3.1-flash-lite` | Used after the primary keeps failing  |
| `MAX_UPLOAD_MB`         | `5`                     | Largest upload                        |
| `RATE_LIMIT_PER_MIN`    | `10`                    | Requests per IP per minute, per route |

Scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `format`, `format:check`, `test`, `test:coverage`, and `check` (typecheck + lint + format check + tests).

## Deployment

The app must be reachable at a public URL with no login.

### Vercel (used for this project)

1. Create a free API key at [Google AI Studio](https://aistudio.google.com/apikey).
2. Push the repository to GitHub, then open [vercel.com/new](https://vercel.com/new) and **import** it. Vercel detects Next.js, so leave the build settings alone.
3. Before the first deploy, open **Environment Variables** and add `GEMINI_API_KEY` (mark it **Sensitive**). The other variables in the table above are optional.
4. Click **Deploy**. Every later push to `main` redeploys automatically.

Good to know:

- **Changing a variable:** edit it under Project, Settings, Environment Variables, then **Redeploy** (new values only apply to new deployments). Nothing in the code needs to change.
- **Function time limit:** Gemini can take 10 to 30 seconds, so `/api/analyze` and `/api/chat` set `maxDuration = 60` (`src/app/api/*/route.ts`).
- **No billing needed:** the Hobby plan is free for personal, non-commercial use, and a key from AI Studio does not need a billing account either.
- **Secrets:** the key is only ever read on the server. Never put it in `.env.example`, the README or the browser.

### Other hosts (Docker)

The included `Dockerfile` (multi-stage, non-root, listens on `$PORT`, default 8080) runs on Render, Railway, Fly.io, Cloud Run or any container host. Set `GEMINI_API_KEY` in the host's environment settings, never in the image.

```bash
docker build -t paperwork-pal .
docker run -p 8080:8080 -e GEMINI_API_KEY=your-key paperwork-pal
```

### After deploying

1. `GET /api/health` returns `{"status":"ok"}`.
2. Check headers: `curl -I https://paperwork-pal-three.vercel.app/` shows the CSP, `X-Frame-Options`, and the others.
3. Open the URL in a private window and on a phone, try a sample document, and try read aloud in English and Hindi.
4. Run Lighthouse (mobile) on the live URL.

## Privacy and data handling

- **Nothing is stored.** There is no database, no accounts, and no file is written to disk. Results live in a short-lived in-memory cache keyed by a hash of the redacted text.
- **Text is redacted first.** Aadhaar, PAN, phone, email, bank account, card and IFSC values are replaced with tags before the text is sent to Gemini.
- **Photos and PDFs cannot be redacted on the server.** The app shows a consent checkbox before sending a file, recommends sample documents for demos, and masks sensitive values in the answer.
- **Free-tier note:** on the free Gemini API tier, Google may use submitted content to improve its products (see the Gemini API terms). Use the sample documents, not real personal papers, for demos.
- **Voice typing** is performed by your browser's speech service, which may send audio to its vendor.
- Logs hold only request ids, status codes and timings.

## Decisions and deviations from the spec

- **Default model:** the spec suggests `gemini-2.5-flash`, but Google's docs say it is deprecated and is rerouted to `gemini-3.5-flash-lite` on 2026-12-01. We default to `gemini-3.5-flash-lite` (fallback `gemini-3.1-flash-lite`). Both are set by env vars. Sampling parameters such as `temperature` are not sent, because the 3.5 migration notes say they were removed.
- **CSP and scripts:** `script-src` allows `'unsafe-inline'` because Next.js injects small inline bootstrap scripts; a per-request nonce would make every page dynamic. Everything else is locked to our own origin.
- **Client-side checks use a fixed 5 MB limit,** while the server enforces `MAX_UPLOAD_MB`. The server's message is shown if they differ.
- **Rate-limit IP:** the last `x-forwarded-for` entry is used, because Vercel and most hosting proxies append the real client address.
- **Hosting:** Vercel instead of Google Cloud Run, to avoid needing a billing account. The `Dockerfile` is kept so the app stays portable.
- **Reference numbers:** because the spec asks to redact 9 to 18 digit numbers as bank accounts, long reference numbers in pasted text also become `[ACCOUNT]`.

## Limitations and future work

- The rate limiter and cache are per instance, so they are best-effort when several instances run.
- Photos and PDFs go to Gemini unredacted. Planned: client-side OCR (Tesseract.js) with redaction before upload.
- Output quality in each language depends on the Gemini model. Results should be checked by a person for important decisions.
- The page header, the input form and the privacy notice are in English. The result screen (headings, buttons, risk label) and the explanation are translated. The result-screen translations were written by the developer and should be reviewed by native speakers.
- Small models can still produce the odd wrong word in Indian languages. The script check catches mixed-up letters, not every wording problem. If quality matters, set `GEMINI_MODEL` to a full Flash model instead of a Lite one.
- Not yet built: shareable or print-friendly summary, explicit light/dark theme switch (it already follows the system setting).
- The automated tests mock Gemini (real SDK, real request shape), so they never spend quota. The app has also been tried by hand with a real key (samples, Tamil, file upload). Model names change over time: if the default models stop working for your key, set `GEMINI_MODEL` and `GEMINI_FALLBACK_MODEL`.
