# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Красим кнопки** — a React/Vite tool for building Telegram/MAX inline keyboards, Bot API/MAX API requests, formatted message text, JSON, and LEADTEH API calls. It runs as both a regular website and a Telegram Mini App from the same build. A separate Node backend (`server/`) provides voice-dictation AI and usage analytics; it deploys independently to its own VPS.

## Commands

All commands run from the repo root.

```bash
npm run dev            # Vite dev server with HMR
npm run build           # tsc -b (typecheck) + vite build — run this before considering any change done
npm run build:web       # build with --base=/ (plain website)
npm run build:miniapp   # build with --base=/color_butten/ (what GitHub Pages/Telegram Mini App needs)
npm run lint            # eslint .
npm run preview         # serve the production build locally
npm run deploy          # build:miniapp + publish dist/ to the gh-pages branch — the ONLY thing users of the Mini App see
```

There is no test runner configured (no Jest/Vitest, no test script). Verify changes with `npm run build` (catches type errors) and by exercising the feature in `npm run dev` — for anything UI-visible, actually look at it in a browser before calling a change done.

### Deploy — read this before pushing

Production for the Mini App is **GitHub Pages**, not Vercel, even though a Vercel deployment also exists. This has bitten past sessions: pushing and running `vercel --prod` updates Vercel but leaves the Mini App on stale code, because Telegram opens the GitHub Pages URL. The only correct sequence:

```bash
git add <files>
git commit -m "Описание на русском"
git push origin main    # Vercel redeploys itself from GitHub — do not run vercel --prod
npm run deploy           # builds with --base=/color_butten/ and publishes to gh-pages — this is what users see
```

Commit messages: Russian only, describe the change's substance, not a file listing.

The `server/` backend is a **separate deploy target** (its own VPS, its own process manager) — a `git push` to this repo does not update it. See "Backend (server/)" below.

## Architecture

### Single source of truth, tabs via `hidden`

All app state lives in `App.tsx` (`useState`/`useMemo`/`useCallback`); every tab component receives data through props, not context or a store. Tabs are switched by toggling the `hidden` attribute — every tab's component tree stays mounted at all times, which matters if you're debugging why something in an "inactive" tab is still running effects or holding state.

```
App.tsx (activeTab, keyboardPlatform, buttons[], showValidation, isAdminMode)
  ├── [tab: keyboard]  «Кнопки» — platform sub-switcher 'telegram' | 'max'
  │     ├── telegram → GridConstructor (7×7) → ButtonCard[] → Preview → JsonOutput
  │     └── max      → MaxKeyboardTab (fully self-contained)
  ├── [tab: requests] «Запросы» — RequestBuilder, own internal platform switcher
  │     └── platform: max → MaxRequestBuilder
  ├── [tab: formatter] «Текст» — TextFormatter
  ├── [tab: json]      «Форматор» — JsonFormatter
  ├── [tab: leadteh]   «API LEADTEH» — LeadtehRequestBuilder (self-contained)
  └── [tab: analytics] «Аналитика» — hidden, not in the visible tab list;
        unlocked by triple-clicking the version string in the footer within 1.5s
        (ADMIN_UNLOCK_CLICKS/ADMIN_UNLOCK_WINDOW_MS in App.tsx) — deliberately not a
        URL param, because typing `?admin=1` by hand inside a Telegram Mini App is awkward
```

Tab labels must stay short: they've overflowed the mobile nav width before (`'JSON-форматор'` was shortened to `'Форматор'`). Check 320px width when adding or renaming a tab.

### The "self-contained component" pattern

`MaxKeyboardTab.tsx` and `LeadtehRequestBuilder.tsx` each hold their own types, state, and JSON-building logic entirely inside one file, deliberately not sharing the equivalent Telegram-side utilities (`generateJson.ts`, `types/index.ts`). A parallel `generateMaxJson.ts` exists but `MaxKeyboardTab` does not use it — don't assume it's dead code to delete, and don't assume changing `generateJson.ts` affects the MAX/LEADTEH tabs. When extending MAX or LEADTEH support, follow this same self-contained shape rather than trying to unify it with the Telegram path.

`RequestBuilder.tsx` is the one exception that *does* split by platform into separate files: `request-builder/TelegramRequestBuilder.tsx` (~70 Bot API methods, current through Bot API 10.1) and `MaxRequestBuilder.tsx` (14 MAX API methods). Config lives in `src/constants/requestBuilder.ts`, types in `src/types/requestBuilder.ts`, validation/building logic in `src/utils/requestBuilder.ts`.

### Telegram keyboard domain rules

- `generateJson.ts` emits a full `SendMessageBody` (`chat_id: "{{telegram_id}}"`, `text`, `parse_mode`, `reply_markup`), not just the keyboard markup.
- Grid is 7×7 (`MAX_GRID_ROWS`/`MAX_GRID_COLS` in `src/constants/index.ts`). Same `row` = buttons sit side by side; different `row` = stacked. Buttons sort by `col` within a row, rows sort by `row` (`groupByRow` in `src/utils/helpers.ts`).
- Validation is lazy — errors only render after the first "Скопировать" click (`showValidation`), not on every keystroke.
- `switch_inline_query` / `switch_inline_query_current_chat` are the only action types allowed an empty `actionValue` (an empty inline query is meaningful); every other action type requires non-empty.
- AI-dictation results for keyboards (`applyAiTelegramButtons`/`applyAiButtons`) fully replace `buttons[]`; when the model returns duplicate `row:col` pairs, the last one wins (deduped through a `Map`).

### Rich messages (Bot API 10.1) and TextFormatter

`TextFormatter.tsx` has four editor modes: `html`, `markdown` (plain `parse_mode` messages, logic in `src/utils/textFormatting.ts`, clipboard copy joins lines with `%0a`) and `rich-html`/`rich-markdown` (Bot API 10.1 `rich_message`, GitHub-style markdown for the markdown variant). In rich mode the plain-mode toolbar, emoji picker, paste-conversion and `%0a` output are all hidden — they'd produce MarkdownV2 syntax that's incompatible with rich markdown. Rich-mode copy goes out verbatim (no `%0a`, no `normalizeTelegramRichHtml`); `validateTelegramRichHtmlCompatibility` only produces soft warnings, never blocks copying. Unlike plain HTML mode, rich HTML **allows** `<table>`/`<pre>`/code blocks — don't reintroduce a block for those.

The rich-markup help reference (`request-builder/RichMarkupHelp.tsx`) must only document tags confirmed in the official `/bots/api#rich-message-formatting-options` doc — same rule as premium emoji IDs below: don't invent syntax.

The AI-dictation panel on this tab can either generate text from scratch (empty field) or apply formatting instructions to text already in the field (`existingText` prop, threaded through `useAiDictation` → `generateFromText` → `POST /api/generate`) — see "AI dictation" below for how the backend tells these two scenarios apart. The panel shows a badge with the currently selected mode so it's unambiguous which syntax the result will use. The visual order of blocks on this tab (input, toolbar, AI panel, collapsed help, preview, copy/share) has been rearranged several times by direct request — don't assume the current order is architecturally meaningful, just match whatever's currently there.

### Premium emoji

Syntax: `<tg-emoji emoji-id="ID">FALLBACK</tg-emoji>` (HTML) / `![FALLBACK](tg://emoji?id=ID)` (MarkdownV2). Data lives in `src/constants/premiumEmojiData.ts` (150 entries, deduped by fallback character, real IDs pulled via `getForumTopicIconStickers` + `getStickerSet?name=TgPremiumIcon`). Regenerate with `node scripts/fetch-premium-emoji.mjs BOT_TOKEN` — **never invent an ID**; Telegram silently strips an invalid `<tg-emoji>` tag and the message text comes out empty.

### AI dictation (voice → keyboard layout / formatted text)

`AiDictationPanel.tsx` + `useAiDictation.ts` power the mic button on the «Кнопки» (both platforms) and «Текст» tabs: record with `MediaRecorder` → base64 → `POST /api/transcribe` (speech-to-text) → editable transcript → `POST /api/generate` (generation) → result applied via the tab's `onResult` callback, which **fully replaces** the tab's current content (buttons array or text) rather than merging.

- Provider is OpenRouter for both steps: `openai/whisper-large-v3` for transcription, `anthropic/claude-sonnet-4.5` for generation. `GenerateMode` (`src/utils/aiClient.ts`) has six values: `telegram-keyboard`, `max-keyboard`, `text-html`, `text-markdown`, `text-rich-html`, `text-rich-markdown` — the backend picks its system prompt by this key.
- The request body can optionally carry `existingText` (only meaningful for the four `text-*` modes) — when present, the backend wraps it between `===EXISTING_TEXT_START/END===` markers plus an `===INSTRUCTION===` marker around the transcript, and every text-mode system prompt is told to preserve that content verbatim and apply only formatting. Those marker strings were chosen because they can't collide with real HTML/Markdown/rich-markdown syntax the user's text might contain (unlike triple backticks or quotes). `AiDictationPanel`'s `existingText`/`modeLabel` props are optional specifically so the two keyboard-building call sites (`App.tsx`, `MaxKeyboardTab.tsx`) don't need to pass them and keep working unchanged.
- `max_tokens` is 4000 for the four text modes, 2000 for the two keyboard modes — text mode needs headroom to echo back a whole existing message plus added markup.
- Recording is capped at 90s (`MAX_RECORDING_MS`) to keep the base64 body under nginx's `client_max_body_size 8m` and stop runaway monologues.
- CORS on the backend is not a security boundary — it only stops browser-originated cross-site calls; direct API abuse is bounded only by the OpenRouter budget cap the key owner sets in their OpenRouter account.

## Backend (`server/`)

Self-contained Node process (`node:http`, no framework — see `server/index.js`), deployed to its own VPS (`server-main`, not Vercel, not the same host as the frontend), behind nginx/TLS, run under PM2 as `knopki-ai-api`. Full endpoint list and env var requirements are in `server/README.md` — read it before touching this code. Key points that aren't obvious from the frontend:

- The frontend always calls the **absolute** URL `https://knopki.assaru.space/api/...` (`src/utils/aiClient.ts`), never a relative path, because the frontend's own host (GitHub Pages) serves static files only and can't proxy.
- Deploy is `ssh server-main` → `git pull --ff-only` in `/opt/knopki-ai` → `pm2 restart knopki-ai-api` — never hand-edit files on the server; `.env` there is not in git and untouched by pull.
- `OPENROUTER_API_KEY` missing → every AI endpoint returns 500. `ANALYTICS_ADMIN_TOKEN` missing → `/api/analytics/stats` always 401.
- Analytics storage is `node:sqlite` (built into Node 22.5+) deliberately instead of `better-sqlite3`, which has no prebuilt binary for recent Node and fails to compile without Visual Studio Build Tools.

## Visual theme

Current theme is **Clean Dark Tool**: dark background, one restrained indigo/blue-violet accent (`--accent: #5E6AD2` in `src/styles/global.css`), Geist for UI text, Share Tech Mono for monospace/code. This replaced an earlier cyberpunk/neon look (cyan glows, Orbitron, scanlines) — that migration is already done in the code; `.impeccable.md` is the design brief that drove it and is worth reading for the underlying principles (function over atmosphere, one accent only, hierarchy through space not glow, mobile-first, a non-technical user should understand any given screen in ~10 seconds) even though its "current vs. new" framing is now stale. There is currently no in-UI theme toggle — light-mode CSS variables exist (`[data-theme="light"]`) but nothing in the app sets `data-theme` other than the inline bootstrap script in `index.html` reading a stale `localStorage` key from before the toggle was removed.

### Telegram Mini App WebView CSS caching

Telegram's WebView caches CSS aggressively and can ignore cache-control headers, so CSS-variable changes to text colors (`--text-muted`, `--text-dim`) sometimes don't reach users after a deploy. Rule: hard-code critical, always-visible text colors (placeholders, hints, labels) as literal hex values in module CSS files rather than `var(--text-muted)`, and duplicate the most critical ones inline in `index.html`'s `<style>` block, since that loads with the HTML and isn't cached separately. Minimum font size for any visible label, including emoji-picker labels, is 11px.

## Constraints

- No `any` in TypeScript.
- No `console.log`/`console.error`.
- No UI libraries (MUI, shadcn, etc.) — CSS Modules only.
- Responsive from 320px width; touch targets ≥44×44px.
- Interface language and commit messages: Russian. Technical identifiers (API fields, variable names) stay as-is.

## Historical reference

`CLAUDE-keyboard-constructor.md` is the original spec — its color scheme and component list are outdated (predates the Clean Dark Tool migration and several component renames); useful only as historical context on original intent, not as current fact.
