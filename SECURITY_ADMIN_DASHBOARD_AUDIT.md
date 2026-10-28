# Kaenatchi Admin Dashboard Security Audit

Status: review-only plan. No application code, live Apps Script deployment, bot token, Script Properties, or spreadsheet data has been changed.

## Locked architecture
- Keep the customer Mini App and customer bot unchanged.
- Keep Google Apps Script + Google Sheets as the backend/data store.
- Use the separate bot @KaenatChiAdminBot for the graphical admin dashboard.
- Authorized numeric Telegram user ID: 6230119080.
- Never commit or paste bot tokens into GitHub source or chat.

## Findings from repository source review
1. Central CMS (code.gs, Central.html / Admin.html)
   - The current web entry point can serve admin UI without an explicit identity check in the reviewed source.
   - The admin UI calls server functions such as getCMSData and mutation helpers through google.script.run.
   - Guarding only the page URL is insufficient: every server-side read/write entry point needs authorization.
   - getMiniAppData is a public-content path and must be kept separate from broad admin data.

2. VIP admin (kaenatchi-admin, Admin.html)
   - The admin HTML invokes customer/token/connection-code/settings operations directly through google.script.run.
   - Admin reads and mutations need server-side authorization checks.
   - Preserve the customer-facing doPost/API and its Telegram initData validation; do not conflate customer identity with admin permission.

3. Booking backend (KaenatChi-Booking-Backend-v2, Code.gs)
   - Booking approval/rejection routes and Telegram callbacks need actor-level admin verification, not a caller-supplied admin label alone.
   - Existing public booking, payment submission, slot reads, and date rules must remain unchanged.
   - Existing notification/rejection-retry PRs are separate work and must not be merged or deployed as part of this security task without a separate review.

## Low-risk implementation sequence
1. Build a server-side authorization helper using a private Script Property for the admin user ID and a separate private token/property for the admin bot. Fail closed when configuration is missing.
2. Authenticate the Telegram webhook using its secret, verify the actual callback actor ID, and have the bot issue a short-lived, one-time dashboard launch credential.
3. Verify the launch credential server-side before rendering admin-only content; re-check authorization on every sensitive server function. Do not trust URL parameters, client-side flags, usernames, or localStorage.
4. Keep public CMS content endpoints allowlisted and data-minimized. Do not expose broad getCMSData through a public route.
5. Add authorization checks to VIP admin functions without changing the customer-facing API.
6. Protect booking approval/rejection routes and callback actors, while explicitly preserving customer booking/payment operations.
7. Test in isolated staging: authorized admin, wrong Telegram user, direct function calls, missing/expired/replayed credential, missing config, and regression of public booking/VIP/customer flows.
8. Review diffs and test evidence, then request owner approval before any production deployment. Keep rollback instructions and the current live deployment intact.

## Important deployment caveat
Source review does not reveal the access settings of the currently deployed Apps Script web apps. Those settings must be checked in Apps Script by the owner before concluding whether a deployed URL is currently accessible to everyone. No live deployment has been changed by this audit.

## Function inventory from the current default-branch source

### CMS (`Kaenatchi-CMS/code.gs`)
- Admin-sensitive reads: `getCMSData`, `getDashboardStats`, `getBookingClosures`.
- Admin-sensitive writes: `saveBookingSchedule`, `addItem`, `updateItem`, `deleteItem`, `toggleItem`, `addBookingClosure`, `toggleBookingClosure`, `deleteBookingClosure`, `uploadDailyContentImage`, `seedDailyContentStarterPack`.
- Routing concern: `doGet` serves `Central`/`Admin` and public `getMiniAppData`; `getMiniAppData` currently calls broad `getCMSData`, so public response construction should be refactored to read only allowlisted public sheets/fields rather than invoking admin-wide data aggregation.
- Internal helper functions should not be exposed as public admin RPCs unless explicitly intended. Google Apps Script `google.script.run` can call server-side functions that are not private-suffixed, so the allowlist and guards must account for all client-callable names.

### VIP (`kaenatchi-admin/code.gs`)
- Admin-sensitive reads: `getAdminInitialData`, `getVIPTokens`, `getVIPCustomers`, `getVIPConnectionCodes`, `getVIPSettings`.
- Admin-sensitive writes: `createVIPToken`, `addVIPCustomer`, `setVIPStatus`, `generateVIPConnectionCode`, `revokeVIPConnectionCode`, `saveVIPSettings`.
- Mixed/customer functions requiring careful classification: `getVIPData`, `activateToken`, `validateVIPToken`, `useVIPToken`, `calculateVIPDiscount`, `connectTelegramToVIP`, `doPost`. Preserve customer-facing operations and add authorization only to admin-only operations; do not blanket-block the customer API.
- `validateTelegramInitData_` exists in source, but each admin request still needs a verified admin identity/session. Do not treat a valid customer `initData` signature as admin permission.

### Booking backend (`KaenatChi-Booking-Backend-v2/Code.gs`)
- Sensitive routes to review: `routeRequest_`, `approveBooking_`, `rejectBooking_`, `cancelBooking_`, `releaseExpiredHolds_`, and `handleTelegramCallbackQuery_`.
- Telegram callback handling must validate the callback actor's numeric Telegram user ID as well as the expected admin chat/webhook secret; checking only the message chat is insufficient for group scenarios.
- Caller-supplied `admin`/`adminId` values are audit labels, not credentials.
- Do not add blanket authorization to shared helpers or public actions until call sites are mapped. Keep public service/catalog, slot/date, booking creation, payment submission, and customer status paths working.

## Verification still required before implementation
- Inspect each deployment's actual Apps Script 'Execute as' and 'Who has access' settings in the owner account; repository source cannot establish live deployment exposure.
- Map all `google.script.run` calls in both admin HTML files to the exact server functions before adding guards.
- Compare repository source to the deployed Apps Script versions. The repository default branch may not equal the active deployed source; do not overwrite live code based only on `main`.
- The current PR is documentation-only and deliberately remains Draft.

## Client-to-server call mapping (source-level, default branches)
- Central CMS `Admin.html` calls `getCMSData`, `addItem`, `updateItem`, `toggleItem`, and `deleteItem` through `google.script.run`. The admin UI therefore needs guards on each callable server method, not only on `doGet`.
- CMS `Central.html` uses a wrapper around `google.script.run` for backend operations. Before implementation, enumerate its operation names from the wrapper and confirm which are intentionally public versus admin-only; do not assume every call from Central is public.
- VIP `Admin.html` calls `getAdminInitialData`, `saveVIPSettings`, `addVIPCustomer`, `getVIPCustomers`, `setVIPStatus`, `createVIPToken`, `getVIPTokens`, `generateVIPConnectionCode`, `getVIPConnectionCodes`, and `revokeVIPConnectionCode`. These admin-only calls should each validate the authenticated admin session server-side.
- VIP customer `index.html` separately calls customer-facing methods including `getVIPData`, `activateToken`, and `getVIPSettings`; classify `getVIPSettings` carefully because it may be shared between customer UI and admin UI. Do not simply protect or expose it without checking the exact returned fields and callers.

## Hosting decision: keep it reversible
- Do not migrate the existing customer-facing CMS page in place. The graphical admin dashboard should be a separate front-end entry point, linked only from the separate admin bot after server-issued, short-lived launch authorization.
- A static host such as GitHub Pages can serve the dashboard assets, but it cannot enforce authorization itself. Every read/write must pass through an Apps Script or other already-approved backend endpoint that verifies the launch credential and current admin identity.
- Before choosing the final host, verify Telegram Mini App launch compatibility, origin/CORS behavior for the chosen backend transport, and whether the existing Apps Script deployment can safely support the needed authenticated calls. No hosting or deployment change has been made.

## Owner-provided live CMS deployment reference (2026-10-28)
- The owner identified the currently healthy/live CMS deployment as Version 46, dated 9 Oct 2026 at 19:27.
- Deployment ID: `AKfycbzgocb54x4FDoQl3C8-o2WnipZuQYkM1j1juV-ZZKHoieN7DbrybTj3WyXbJe5I2nMhXw`.
- Web App URL: `https://script.google.com/macros/s/AKfycbzgocb54x4FDoQl3C8-o2WnipZuQYkM1j1juV-ZZKHoieN7DbrybTj3WyXbJe5I2nMhXw/exec`.
- Treat this as the live reference deployment; do not edit, redeploy, or replace it during the audit.
- Still required from owner: read-only confirmation of the deployment's 'Execute as' and 'Who has access' values, plus a source comparison between deployed Version 46 and the repository source. The deployment ID/version alone does not establish access scope or source parity.

## Confirmed live deployment access settings (owner checked, 2026-10-28)
- Execute as: `Me`.
- Who has access: `Anyone`.
- Risk assessment: because this public web app executes as the owner, any exposed server entry point must be treated as potentially callable by unauthenticated visitors. Reviewed source includes admin pages and callable read/write functions without explicit server-side authorization; this is a high-priority security risk until the deployed source and all routes are verified.
- This setting alone does not prove exploitation or data access. Do not change the live deployment's access setting as an emergency quick fix, because it may break the public Mini App/CMS integration. Keep the current deployment unchanged while preparing a staged, route-separated authorization fix and a regression/rollback plan.
- Immediate containment options to assess (not execute without owner approval): rotate/revoke any accidentally exposed secrets; review Apps Script executions/audit logs and spreadsheet sharing; separate public allowlisted content API from admin-only operations; test the protected admin app on a separate staging deployment before production rollout.

## Critical concrete exposure found in current CMS source review
- `doGet(e)` serves `Admin.html` for any `page` value other than `central`; there is no server-side admin identity gate before serving it.
- The CMS `Admin.html` client directly invokes `getCMSData`, `addItem`, `updateItem`, `toggleItem`, and `deleteItem` through `google.script.run`.
- `getCMSData()` returns `bookings`, `customers`, `payments`, `schedule`, `blockedDates`, `blockedSlots`, and `bookingLogs` in addition to content and settings. Thus the admin page is not merely a hidden URL: if the deployed Version 46 contains this same source and its `Anyone` access applies as reported, unauthenticated visitors may be able to load the admin UI and invoke owner-executed server functions. This must be treated as a potentially severe exposure, but source parity with Version 46 has not yet been confirmed.
- `getMiniAppData()` currently calls `getCMSData()` and then filters its output for the public payload. Even though the returned object is filtered, this unnecessarily reads sensitive booking/customer/payment/log data into the execution. Replace with a public-only reader that never fetches those collections.
- Existing draft PR #8 (`public-api/Code.gs`) is a promising isolated public-read scaffold because it avoids `getCMSData()` and excludes booking/customer/payment/schedule/log collections. It is NOT deployed and still requires staging runtime, payload-compatibility, public-settings allowlist, and latency tests; do not merge/deploy it as a quick fix without completing those tests.

## Priority and containment guidance
1. Treat CMS admin RPCs and broad data reads as P0 to verify against deployed Version 46.
2. Do not change Version 46 access settings abruptly: it may break the Mini App's public CMS reads and the existing admin workflow.
3. The owner should review Apps Script Executions for unfamiliar invocations and review Google Sheet sharing. Do not share secrets or bot tokens in chat.
4. Prepare a separate staging deployment with an allowlisted public API and server-side admin authorization, then regression-test the Mini App and admin functions before any production switch.
5. If Version 46 source confirms the same unauthenticated admin functions, discuss a carefully staged containment plan before any live change; this audit itself makes no code or deployment changes.