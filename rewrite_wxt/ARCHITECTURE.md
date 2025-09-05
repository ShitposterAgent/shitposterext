# WXT Rewrite: Architecture and Mapping

This document explains how the existing extension is structured today and how we will port each subsystem to WXT. It’s written to enable a new engineer to continue and complete the port with confidence.

## Goals

- Preserve behavior and feature parity with the existing extension.
- Modernize build/runtime using WXT (Vite) and TypeScript.
- Maintain cross‑browser support (Chromium + Firefox). Where APIs differ, document the strategy and tradeoffs.
- Keep the code modular: background, content (isolated world), page (main world), shared common modules, and UIs (popup/options/confirm).

## High‑Level Runtime Model

- Background (persistent page in MV2, service worker in MV3): orchestrates data, storage, permissions, webRequest hooks, sync, messaging, icon/badge, and all commands.
- Content (isolated world): loads early in pages, requests an “injection bag” of scripts and resources from background, injects page‑realm code where needed, bridges messages.
- Page (main world): runs user scripts with GM APIs via a bridge. Isolated from extension internals.
- UI surfaces: popup, options/dashboard/editor, confirm installer.
- Storage model: versioned keyspace with prefixes for code, scripts, values, require/resources, and metadata.
- Messaging: lightweight command bus. Background owns handlers; content/page call via sendCmd and bridge.

## Source Overview (current project)

The legacy code under `src/` is well factored into subsystems we’ll port:

- Background core
  - `src/background/index.js`: message entrypoint; registers command bus; hotkeys; imports all background utils.
  - `src/background/utils/*`: options, db (scripts), storage/storage-cache, requests/requests-core (GM_xhr), tabs, icon/badge, notifications, popup-tracker, ua, preinject, patch-db, init.
  - `src/background/sync/*`: OneDrive/Dropbox/GoogleDrive/WebDAV services and sync orchestration.
- Common utilities
  - `src/common/*`: constants, messaging helpers (sendCmd/sendCmdDirectly/sendTabCmd), i18n helpers, URL utils, router for UIs, small data utilities.
- Injected runtime
  - `src/injected/content/*`: content-world bootstrap, bridge to page, tab/clipboard/notifications shims, command runner.
  - `src/injected/web/*`: page‑world bridge, GM API wrappers, store for values and requests, notifications, tabs.
  - `src/injected/index.js`: special installer path for `file:` in Firefox.
- UIs
  - Popup: `src/popup/*` (Vue app)
  - Options/Dashboard/Editor: `src/options/*` (Vue app)
  - Confirm installer: `src/confirm/*` (Vue app)
- Manifest and locales
  - `src/manifest.yml` (MV2), `_locales/*` (YAML), resources and icons.

## Data Model

- Script entity (VMScript):
  - `meta`: parsed metablock (name, namespace, version, grant, @require, @resource…)
  - `custom`: user preferences (icon, pathMap, tags, from, lastInstallURL…)
  - `config`: enabled/removed/shouldUpdate and flags
  - `props`: id, uri, position, lastModified/Updated, uuid
- Storage areas/prefixes (see `background/utils/storage.js`):
  - `base` (no prefix): options, misc
  - `S_SCRIPT` `scr:`: script JSON
  - `S_CODE` `code:`: source code
  - `S_VALUE` `val:`: GM_value store per script
  - `S_REQUIRE` `req:`: downloaded @require contents
  - `S_CACHE` `cac:`: resources/images and misc cache
  - `S_MOD` `mod:`: last-modified/etag tracking per URL
- Cached sizes live in `scriptSizes` for UI reporting.

## Messaging & Command Bus

- Background registers command handlers in `init.js`, exports `commands` and helpers `addPublicCommands`, `addOwnCommands`.
- Foreground calls via:
  - `sendCmd(cmd, data)` (async `browser.runtime.sendMessage`)
  - `sendCmdDirectly(cmd, data, opts, fakeSrc)` — fast path in MV2 by directly calling background page functions (not possible in MV3 service worker; must degrade to `sendCmd`).
  - `sendTabCmd(tabId, cmd, data, frameOpts)` to target specific tab/frame.
- Content/page bridges (see `injected/content/bridge.js` and `injected/web/bridge.js`) multiplex messages and callback responses, and in pre-rendered pages maintain a reify promise.

## Injection Flow

1. Content loads early and asks background `GetInjected { url, forceContent?, done }`.
2. Background `db.getScriptsByURL(url, isTop, errorsPrev?)` computes matches, runAt, dependencies (@require, @resource), values, and creates an “injection bag”.
3. CSP and realm triage:
   - If page CSP forbids inline scripts, mark `FORCE_CONTENT` and/or set `nonce`.
   - Partition scripts into content vs page realm; page realm is injected via `tabs.executeScript` (MV2) or `chrome.scripting.executeScript` (MV3 from background).
   - For Firefox, may pre-register via `browser.contentScripts.register` for speed and CSP workarounds.
4. Content receives bag, injects content-realm immediately; requests background to inject page-realm, then bridges GM APIs.
5. `InjectionFeedback` may request more scripts for late runAt or frames.

## GM APIs and XHR

- GM_value APIs proxy to background storage with a value opener per tab/frame and broadcast updates back to running scripts.
- GM_xmlhttpRequest:
  - Background owns XHR lifecycles and events, chunking large payloads; routes cookies via `browser.cookies` when needed; injects/filters headers via `webRequest` using a per-request `VM-Verify` header and header maps.
  - Response and progress events streamed to content via `sendTabCmd` targeting a frame.

## Icon/Badge/Popup Tracking

- Badge counters: total and unique script counts per tab with per-frame aggregation.
- Title and icon state reflect blacklist, disabled, CSP/realm failures.
- Context menus on action icon for toggles and quick actions.
- Popup attaches to the current tab and shows scripts/commands; background caches SetPopup payloads for speed.

## Sync Subsystem

- `background/sync/base.js` defines a service base class with OAuth helpers, rate limiting, progress reporting, and a small event emitter.
- Services (Dropbox/GoogleDrive/OneDrive/WebDAV) implement list/get/put/remove and auth flows; sync chooses winner based on timestamps and merges positions and enabled flags according to options.

## Options and Defaults

- Options live in `options-defaults.js` with many UI/editor defaults and feature flags.
- Background initializes options and exposes `GetAllOptions`, `SetOptions`; foreground `options.ts` wrapper provides `ready`, `hook`, `get`, `set`.

## i18n

- Uses `_locales/*/messages.yml` for messages; currently non-standard format for Chrome; needs conversion to Chrome JSON in WXT.

---

# Porting to WXT: Architecture & Directory Plan

We’ll structure the WXT rewrite like this (TypeScript everywhere):

```
rewrite_wxt/
  entrypoints/
    background.ts               # defineBackground – orchestrates all background subsystems
    content.ts                  # defineContentScript – isolated world bootstrap
    content-page.ts             # defineContentScript({ world: 'MAIN' }) for page world glue (optional)
    popup/
      main.tsx                  # React entry, renders PopupApp
      App.tsx                   # Popup UI
    options/
      main.tsx                  # React/Vue entry (we're using React here)
      App.tsx                   # Options/Dashboard UI shell
    confirm/
      main.tsx                  # Script installer UI
  src/
    common/
      consts.ts                 # Port of src/common/consts.js
      env.ts                    # WXT/Vite env flags and browser checks (IS_FIREFOX, CHROME)
      messaging.ts              # sendCmd, sendTabCmd, (sendCmdDirectly degrades to sendCmd in MV3)
      options.ts                # foreground options wrapper (ready/hook/get/set)
      util.ts, object.ts, events.ts, date.ts, download.ts, etc.
    background/
      init.ts                   # command bus and init barrier
      options.ts                # options storage & hooks
      storage.ts                # StorageArea, prefixes, forKey
      storage-cache.ts          # Cached storage API + watchers
      db.ts                     # scripts store: parse/install/update/remove/sizes/vacuum
      requests-core.ts          # VM-Verify, webRequest bridge (see MV3 notes)
      requests.ts               # GM_xmlhttpRequest lifecycle/events
      tabs.ts                   # tab helpers, open/focus, per-frame docId logic
      icon.ts                   # badge/icon/contextMenus
      notifications.ts          # notifications + click routing
      popup-tracker.ts          # popup port and SetPopup cache
      preinject.ts              # onSendHeaders/onHeadersReceived triage (FF fast-inject)
      ua.ts                     # UA probe and platform info
      sync/
        base.ts, dropbox.ts, googledrive.ts, onedrive.ts, webdav.ts
    injected/
      content/
        index.ts                # current content bootstrap (from src/injected/content/index.js)
        bridge.ts               # content bridge
        inject.ts, tabs.ts, notifications.ts, requests.ts, gm-api-content.ts, clipboard.ts...
      web/
        index.ts                # page-world bridge
        bridge.ts, gm-api.ts, gm-api-wrapper.ts, store.ts, tabs.ts, notifications.ts...
    ui/
      popup/...
      options/...
      confirm/...
  wxt.config.ts                 # WXT config (modules, alias, manifest hooks)
```

Notes:

- Keep the shared modules in `src/common` and import via `@` alias.
- WXT entrypoints only import the minimal bootstrap code; heavy modules live under `src/`.

## WXT and Manifest Considerations

- WXT defaults to MV3. Some behavior in the legacy code depends on MV2 background pages:
  - `sendCmdDirectly` that calls `getBgPage()` is not available in MV3 service worker. Degrade to `sendCmd` transparently. Keep fast path behind a feature flag for Firefox (which still supports event/background pages).
  - `webRequest` with `blocking` and header modification: Chromium MV3 allows `webRequest` (including blocking) for onHeadersReceived/onBeforeSendHeaders, but long-term Chrome pushes `declarativeNetRequest` (DNR). We will:
    - Implement baseline using `webRequest` like legacy for Firefox + Chromium where allowed.
    - Add a feature flag and fallback path for environments that restrict blocking listeners (degrade cookie/header routing in GM_xhr to best-effort; document in TODO).
- CSP workarounds and `contentScripts.register` exist only in Firefox; gate by `IS_FIREFOX` at runtime.
- Manifest keys mapping:
  - `browser_action` -> `action` in MV3
  - permissions: `tabs`, `<all_urls>`, `webRequest`, `webRequestBlocking`, `notifications`, `contextMenus`, `storage`, `unlimitedStorage`, `cookies`, `clipboardWrite`
  - `commands` retained; popup page becomes WXT HTML.
- Locales: convert YAML to Chrome JSON under `_locales/<lang>/messages.json` at build time (scripted via node or Vite plugin). WXT expects standard Chrome locales.

## Build/Config in WXT

- Aliases: set `@` -> `rewrite_wxt/src` in `wxt.config.ts` via Vite `resolve.alias`.
- Define globals/macros used in legacy code with Vite `define`:
  - `IS_FIREFOX`, `CHROME`, `FIREFOX`, `extensionRoot`, `extensionOrigin`, `ICON_PREFIX`, `INIT_FUNC_NAME`, `VM_UUID`, `VIOLENTMONKEY`, etc. Start minimal and add as needed.
- Use `@wxt-dev/module-react` (already present) for popup/options/confirm. If porting the UI from Vue to React, reimplement views with near-identical props/state.

## Detailed Subsystem Mapping

### background/init

- Port as `background/init.ts`. Keep `commands` map, `addPublicCommands`, `addOwnCommands`, and `init` Promise with dependency aggregation.

### background/options

- Port `GetAllOptions`, `SetOptions`, `hookOptionsInit`, `getOption`, `setOption`.
- Persist to `storage.base` under `options` and `version` keys. Migrate defaults from `src/common/options-defaults.js`.

### background/storage & storage-cache

- Port `StorageArea` + `storage` object and prefixes; `storage.forKey` helper.
- Port cached API wrapper with TTLs, write batching for values, and `onStorageChanged` hook.
- Implement `window[WATCH_STORAGE]` equivalent and `runtime.onConnect` watch/undo ports.

### background/db

- Port script registry and lifecycle: initial scan (using `getStorageKeys` in Chromium 130+ where available), `parseMeta`, `parseScript`, `fetchResources`, pathMap building, vacuuming, sizing, `getData` (for dashboard and popup), `getScriptsByURL` (core matching), `getSizes`, remove/move/update.

### background/requests-core & requests

- Port VM-Verify, headers merging, cookie routing, and header injection toggling via `browser.webRequest`.
- For MV3 Chromium, keep the implementation (still supported as of 2025) with proper host permissions. Add feature flag to optionally fall back to non-blocking fetch semantics if an environment forbids it.

### background/preinject (CSP triage)

- Port onSendHeaders + onHeadersReceived detectors, CSP parsing, nonce detection, triageRealms, FF fast-inject via `contentScripts.register`.

### background/tabs

- Port open/focus/close helpers, editor window support for FF, per-frame documentId mapping for prerender/BFCache.

### background/icon & notifications & popup-tracker

- Maintain badge counters and SetPopup caching/ports, context menus.
- Notifications: opener handling and tab routing.

### injected/content and injected/web

- Content bootstrap (`init` flow), request injection bag, apply page/content realm division, post ‘Run’, wire clipboard/notifications/requests/tabs shims, REIFY logic for prerendered pages.
- Page bridge: GM API wrapper, callbacks, console logging forwarding (Chrome workaround), planting scripts by dynamic function install.

### common layer

- Port constants, utilities, messaging helpers, router for UI.

### UI (Popup/Options/Confirm)

- Popup: show script list + commands; handle SetPopup/Run/UpdatedValues messages; render icons via background cache.
- Options: dashboard/editor, filters, settings pages; reuse existing logic in `src/options/utils` and views as a guide while re-implementing in React.
- Confirm: script installer (FF `file:` path and general installer).

## Types and Shared Contracts

Define and use these types across TS:

- `VMScript`, `VMScript.Meta`, `VMScript.Custom`, `VMScript.Config`, `VMScript.Props`
- `VMInjection` bag: `{ scripts, injectInto, more?, cache, ids, info:{ ua }, errors, nonce? }`
- `VMReq` (GM_xhr messages) and events

## Cross‑Browser Strategy

- Feature detection is already present in UA module; keep it and branch at runtime.
- Prefer `browser.*` and feature probe `browser.contentScripts` for FF fast inject.
- MV3 service worker: ensure long‑running ops (sync, vacuum) don’t rely on DOM; use alarms/idle where needed (WXT handles life-cycle but keep operations chunked and resumable).

## Testing and Tooling

- Unit tests currently use Jest. For WXT we’ll switch to Vitest to align with Vite. Keep semantics similar.
- E2E can be added later using Playwright+CRX glue if needed; not required to finish parity.

## Known Risk/Delta Areas

- `sendCmdDirectly` optimization not possible in MV3; performance should still be acceptable.
- `webRequest` blocking longevity in MV3; monitor and prepare DNR fallback for header injection (reduced capabilities).
- UI port from Vue to React implies component parity work; feature gating may be needed to ship incrementally.
- `_locales` YAML → Chrome JSON conversion is required.

---

# Entry Points in WXT Today

- `entrypoints/background.ts`: stubbed `defineBackground` – will import `src/background/init.ts` and the rest.
- `entrypoints/content.ts`: stubbed `defineContentScript` – will import `src/injected/content/index.ts`.
- `entrypoints/popup/*`: React stub – will be replaced by real popup UI.

Wire-up plan:

- Background entry to import: `env`, `init`, `options`, `storage-cache`, `storage`, `db`, `requests-core`, `requests`, `tabs`, `icon`, `notifications`, `popup-tracker`, `sync/*`, `preinject`, `ua`.
- Content entry to import: `injected/content/index`.
- Optional page-world content entry if WXT supports `world: 'MAIN'` registration at build time; otherwise inject from background as today.

This is the target architecture for the port. See TODO.md for an execution plan with granular tasks and checkboxes.
