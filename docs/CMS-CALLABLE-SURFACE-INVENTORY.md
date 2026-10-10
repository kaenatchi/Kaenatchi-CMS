# CMS callable-surface inventory

Status: read-only source inventory, prepared on `security/cms-public-private-split`. No runtime code or deployment settings changed.

## Scope checked
- `code.gs`
- `Central.html`
- `Admin.html`
- `TelegramVIP.gs`
- `VIPConnection.gs`
- `index.html`
- `admin/index.html` (present in repository; not treated as proof of deployed behavior)

## 1. Entry points and public-facing routes

### `code.gs`
- `doGet(e)`:
  - `?action=getMiniAppData` returns JSON from `getMiniAppData()`.
  - Other requests serve `Central.html` by default, or `Admin.html` when `page` is not `central`.
  - The HTML response uses `ALLOWALL` framing.
- No `doPost(e)` exists in `code.gs`.
- `getMiniAppData()` calls `getCMSData()`, then returns a subset. The returned object excludes booking/customer/payment collections, but the internal call still loads those collections before filtering the response.
- `getCMSData()` includes public content and private operational collections: bookings, customers, payments, schedule, blocked dates/slots, booking logs and booking settings.
- `getDashboardStats()` calls `getCMSData()` although the dashboard only needs content counts.

### `TelegramVIP.gs`
- Defines a separate `doPost(e)` for Telegram Mini App VIP dashboard/connect actions.
- The inspected implementation calls `validateTelegramInitData_(initData)` before resolving the Telegram identity and handling `load` or `connect`.
- Keep this route and the VIP architecture unchanged in this phase. Review its validation/configuration separately before any release; source inspection alone does not confirm deployed configuration.

### `VIPConnection.gs`
- Contains connection-code operations such as `generateVIPConnectionCode`, `getVIPConnectionCodes`, and `revokeVIPConnectionCode`.
- These are globally named server functions and need an explicit decision about whether they are intended to be callable from browser clients. No changes made.

## 2. Browser-to-server call inventory

### `Central.html` calls through dynamic `runServer(name, args)`
Observed names:
- Content/data: `getCMSData`, `getBookingSchedule`, `getDashboardStats`
- Content mutations: `addItem`, `updateItem`, `deleteItem`, `toggleItem`
- Schedule: `saveBookingSchedule`
- Closures: `getBookingClosures`, `addBookingClosure`, `toggleBookingClosure`, `deleteBookingClosure`
- Daily content: `seedDailyContentStarterPack`, `uploadDailyContentImage`

The exact call set must be checked against the full UI before implementation because some UI sections use shared/dynamic helpers.

### `Admin.html`
- Calls `getCMSData`, `addItem`, `updateItem`, `deleteItem`, and `toggleItem` through `google.script.run`.

## 3. Server functions requiring access decisions

### High priority: private reads
- `getCMSData`: returns the full CMS payload, including booking/customer/payment records and operational configuration.
- `getDashboardStats`: currently obtains the full payload as an implementation side effect.
- `getBookingClosures`: reads booking closures through the backend proxy.
- `getBookingSchedule`: reads schedule information through configured backend/transport URLs.
- `getVIPConnectionCodes`: lists VIP account connection codes.
- Any dashboard/list/detail function that returns customer contact information, payment proof metadata, internal IDs, or logs.

### High priority: writes
- `addItem`, `updateItem`, `deleteItem`, `toggleItem`
- `saveBookingSchedule`
- `addBookingClosure`, `toggleBookingClosure`, `deleteBookingClosure`
- `uploadDailyContentImage` (writes to Drive and sets the uploaded image to anyone-with-link viewing)
- `seedDailyContentStarterPack` (writes CMS content)
- `generateVIPConnectionCode`, `revokeVIPConnectionCode`
- All further callable functions found in the full `.gs` project must be classified before implementation.

### Internal/helper functions
Names ending in underscore are conventionally internal, but that naming convention alone is not an authorization boundary. Review direct client callability and every call path rather than relying on the underscore.

## 4. Confirmed observations vs. unknowns

Confirmed in the reviewed source:
- `code.gs` has no `doPost`; the VIP file does.
- `getCMSData()` assembles private operational data.
- Content CRUD and several admin operations do not show an explicit authorization guard in their function bodies.
- The public content endpoint internally calls the broad data loader.

Not established by this source review:
- Which exact commit is currently deployed to Apps Script.
- The actual current deployment access settings and whether old deployments remain active.
- Whether any private endpoint was accessed by an unauthorized party.
- Whether other Apps Script projects/deployments expose the same spreadsheet or data.

## 5. Required next implementation decision
Do not add a quick `Session.getActiveUser()` guard to the current public deployment without proving that it reliably identifies the owner in the actual execution context. With an “Execute as: Me / Anyone” deployment, identity behavior can differ from what a developer expects, and a mistaken guard can break the CMS or public content loading.

Before runtime edits:
1. Finish the callable-function inventory across all `.gs` files and UI files, including the rest of the project and the VIP connection surface.
2. Decide the supported authentication model for the private admin surface.
3. Design a content-only public data loader that reads only public sheets/fields; do not reuse `getCMSData()`.
4. Add fail-closed server-side authorization to admin endpoints in a separate private surface.
5. Test public payload shape and confirm it contains no customer, booking, payment, log, closure or internal configuration data.
6. Keep Worker, booking, VIP behavior, payment flow, and production deployments untouched until explicit owner approval.

## Release gate
This inventory is documentation only. No runtime code was changed, no PR was opened, no merge or deployment occurred, and no production setting was altered.
