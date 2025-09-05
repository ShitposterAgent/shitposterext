# WXT Porting TODO

This checklist drives the complete migration from the legacy codebase to WXT. Use it as a source of truth and update checkmarks as you progress.

## Phase 0 — Repo Setup

- [x] Scaffold WXT project (background, content, popup stubs)
- [ ] Configure TypeScript paths/aliases (`@` → `rewrite_wxt/src`)
- [ ] Add ESLint/Prettier config aligned with repo
- [ ] Ensure Node 20+ and WXT pinned versions match CI

## Phase 1 — Manifest & Build

- [ ] Convert `src/manifest.yml` to WXT manifest (MV3 by default)
  - [ ] Map `browser_action` → `action` (popup page)
  - [ ] Commands/shortcuts parity
  - [ ] Host permissions (`<all_urls>`, `cookies`, `webRequest`, `webRequestBlocking`)
  - [ ] Optional origins for sync providers as needed
- [ ] Vite/WXT `wxt.config.ts`
  - [ ] Define aliases
  - [ ] Inject global defines used in code (`IS_FIREFOX`, `extensionOrigin`, `ICON_PREFIX`, etc.)
  - [ ] Add manifest hook(s) if needed for dynamic keys

## Phase 2 — Common Layer (shared utilities)

- [ ] Port `src/common/consts.js` → `rewrite_wxt/src/common/consts.ts`
- [ ] Port `src/common/index.js` and helpers (sendCmd, sendTabCmd)
  - [ ] Implement `sendCmdDirectly` to fall back to `sendCmd` in MV3
- [ ] Port `util`, `object`, `events`, `date`, `download`, `tld`, `zip` (as needed for features)
- [ ] Port `options.ts` foreground wrapper (ready/hook/get/set)
- [ ] Set up type definitions for `VMScript`, `VMInjection`, `VMReq`

## Phase 3 — Background Core

- [ ] `background/init.ts` (commands map, addPublicCommands/addOwnCommands)
- [ ] `background/options.ts` (GetAllOptions/SetOptions + defaults)
- [ ] `background/storage.ts` (StorageArea + prefixes)
- [ ] `background/storage-cache.ts` (cached API, watchers, undo import)
- [ ] `background/db.ts`
  - [ ] Initial load (getStorageKeys fallback), patch-db equivalent if needed
  - [ ] parseMeta/parseScript, infer props, pathMap, fetchResources
  - [ ] getScriptsByURL, sizes, getData, remove/move/update
  - [ ] vacuum + report
- [ ] `background/requests-core.ts` (webRequest header injector, VM-Verify)
- [ ] `background/requests.ts` (GM_xmlhttpRequest lifecycle + events)
- [ ] `background/preinject.ts` (onSendHeaders/onHeadersReceived, CSP triage, FF fast register)
- [ ] `background/tabs.ts` (open/focus/close, editor window, prerender IDs)
- [ ] `background/icon.ts` (badge/icon, context menus)
- [ ] `background/notifications.ts`
- [ ] `background/popup-tracker.ts`
- [ ] `background/ua.ts`

## Phase 4 — Injection Runtime

- [ ] `injected/content/index.ts` bootstrap
  - [ ] Request injection bag (GetInjected)
  - [ ] Inject content-realm code; request page-realm injection
  - [ ] Wire UpdatedValues/Run/Notification events
- [ ] `injected/content/*` ports (bridge, inject, requests, tabs, notifications, clipboard, gm-api-content)
- [ ] `injected/web/*` ports (bridge, gm-api, gm-api-wrapper, store, tabs, notifications)
- [ ] Page-realm injection path
  - [ ] Firefox `contentScripts.register` fast path (feature-probed)
  - [ ] Chromium executeScript path with CSP/nonce handling

## Phase 5 — UI Surfaces

- Popup (React)
  - [ ] Replace stub with real popup using store and handlers
  - [ ] Implement SetPopup/Run flow and UpdatedValues
- Options/Dashboard/Editor (React)
  - [ ] Dashboard lists/filters/sizes; editor (CodeMirror v5 or Monaco); settings tabs
  - [ ] Router and unload sentry
- Confirm installer
  - [ ] Port special Firefox `file:` installer logic

## Phase 6 — i18n & Resources

- [ ] Build step to convert `_locales/*/messages.yml` → Chrome `_locales/*/messages.json`
- [ ] Ensure resource paths (icons/images) mapped and preloaded

## Phase 7 — Sync Providers

- [ ] Port `background/sync/base.ts` and services
- [ ] OAuth flows (Dropbox/Google/OneDrive) via tab interception; WebDAV basic auth
- [ ] Wire options UI and background commands (SyncAuthorize/SyncStart/...)

## Phase 8 — Testing & QA

- [ ] Configure Vitest and migrate key Jest tests
- [ ] Unit tests: db matching, requests, options, value propagation
- [ ] Manual QA matrix: Chromium/Firefox, CSP‑strict sites, prerender/BFCache, incognito, file scheme

## Phase 9 — Packaging & CI

- [ ] `wxt build` for chromium/firefox
- [ ] `wxt zip` artifacts
- [ ] CI workflows for release (edge/beta/stable channels as desired)

---

## Work Log / Progress

Use this section to tick off granular deliverables.

### Bootstrap

- [x] Create WXT scaffold with React popup
- [ ] Add `rewrite_wxt/src` with common/background/injected skeletons
- [ ] Wire background entry to import subsystems
- [ ] Wire content entry to injected bootstrap

### Common

- [ ] consts.ts (ported)
- [ ] messaging.ts (ported)
- [ ] options.ts (ported)
- [ ] util/object/events/download/date/tld (ported as needed)

### Background Core

- [ ] init.ts
- [ ] options.ts
- [ ] storage.ts
- [ ] storage-cache.ts
- [ ] db.ts (incl. vacuum, sizes)
- [ ] requests-core.ts
- [ ] requests.ts
- [ ] preinject.ts
- [ ] tabs.ts
- [ ] icon.ts
- [ ] notifications.ts
- [ ] popup-tracker.ts
- [ ] ua.ts

### Injection

- [ ] injected/content/index.ts
- [ ] injected/content bridge + modules
- [ ] injected/web bridge + modules

### UI

- [ ] popup React feature parity
- [ ] options/dashboard/editor React parity
- [ ] confirm installer

### i18n

- [ ] YAML → JSON converter in build step

### Sync

- [ ] base.ts
- [ ] dropbox.ts
- [ ] googledrive.ts
- [ ] onedrive.ts
- [ ] webdav.ts

### Tests

- [ ] Port essential Jest tests to Vitest

---

## MV3‑Specific Notes (Action Items)

- [ ] Replace `sendCmdDirectly` usage with plain `sendCmd` or a fast‑path shim that no‑ops under MV3.
- [ ] Confirm `webRequest` blocking permissions and register listeners only when necessary.
- [ ] For `tabs.executeScript`, switch to `chrome.scripting.executeScript` in MV3 background.
- [ ] Service worker lifetime: chunk long tasks (vacuum/sync) and avoid direct DOM operations in background.

## Open Questions / Follow‑ups

- [ ] Do we keep Vue for options UI or fully move to React? (current scaffold is React; plan assumes React.)
- [ ] Any features to deprecate (e.g., editor window behavior on non‑Firefox)?
- [ ] Decide on CodeMirror vs Monaco for editor port.
