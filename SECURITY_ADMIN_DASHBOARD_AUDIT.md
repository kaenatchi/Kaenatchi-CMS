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

## Public API scaffold review (PR #8 source inspection, not runtime-tested)
- The scaffold includes `testPublicPayloadSafety()`, which checks the top-level response shape, absence of private collections (`bookings`, `customers`, `payments`, `schedule`, `blockedDates`, `blockedSlots`, `bookingLogs`, `bookingSettings`), field allowlisting, settings-key allowlisting, active-row filtering compatibility, and records elapsed time/batched request count. The test performs no spreadsheet writes.
- The test is a useful starting point but has not been executed in an isolated Apps Script project; code inspection is not a substitute for runtime evidence.
- Public Settings aliases currently allow business hours, social/contact links, channel links, and booking payment details. Before staging, compare these keys against the actual Mini App settings consumed in `src/App.tsx` and inspect the real Settings sheet for sensitive keys. Only public values should be exposed.
- The scaffold uses the Advanced Google Sheets service (`Sheets.Spreadsheets...`), so the staging project must enable the Advanced Sheets service and its required API. Verify that before measuring performance.
- CMS and VIP HTML files use `google.script.run` directly for admin actions. The UI call inventory must be captured reliably by parsing all chained call patterns; a simple regex did not produce a complete method list, so no guards should be added based on an incomplete list.

## Current gate
- PR #8: open Draft, source scaffold only; no test run and no deployment. Do not merge until staging compatibility/security/performance checks are documented.
- PR #9: open Draft documentation-only; GitHub currently reports `mergeable=false`, so inspect/rebase conflicts before any eventual merge. Do not force merge.
- Live CMS Version 46 source parity is still unknown. No application code or live settings were changed in this review.

## Next implementation design gate (read-only review, 2026-10-28)

### Separate admin dashboard request flow
1. The separate bot `@KaenatChiAdminBot` should accept only the configured numeric administrator ID (`6230119080` as owner-provided ID); usernames and a typed password alone are not identity proof.
2. The bot webhook must validate Telegram's webhook secret and verify `callback_query.from.id` / `message.from.id` against the configured administrator ID before issuing a launch credential.
3. Issue a random, one-time, short-lived launch credential server-side. Store only a digest with expiry and used/revoked state in a server-side store; never put a bot token or long-lived credential in a URL. The dashboard redeems the credential once and receives a short-lived session token.
4. Every privileged Apps Script operation must validate the session server-side, expiry, admin ID, and operation allowlist. Do not trust client-provided `adminId`, query parameters, UI visibility, localStorage, or Telegram username.
5. If Apps Script Web App cannot safely set/validate browser session cookies or protect cross-origin calls in the chosen static-host setup, use an explicit signed short-lived bearer token and strict origin/CORS handling; do not treat CORS as authorization. Confirm the actual Apps Script redirect/content-service behavior in staging before selecting the final transport.
6. Keep the public CMS API read-only and schema-allowlisted. Do not route public reads through `getCMSData()`, and do not return booking/customer/payment/log collections.
7. Add independent guards to VIP admin RPCs and booking approve/reject actions. Preserve customer-facing VIP `doPost` verification and public booking/payment flows. Booking Telegram callback authorization must verify the actual callback actor ID, not only the message chat ID.
8. A password may be an additional factor, but it must be checked server-side, stored as a salted hash if persisted, rate-limited, and never shipped in frontend code. Given the sole admin ID, Telegram identity verification plus a one-time credential is the primary gate.

### Staging acceptance tests before any production deployment
- Authorized owner can open the dashboard and perform each explicitly allowed action.
- Wrong Telegram user, missing configuration, malformed/expired/replayed launch credential, expired session, and direct calls to every admin RPC are denied.
- Public Mini App can still load its exact required public payload; private settings and private collections are absent from responses and are not read by the public payload builder.
- Customer VIP data/token activation and ordinary booking/payment paths continue to work.
- Booking approve/reject only works for the authorized callback actor; customer-originated calls cannot approve/reject or release holds.
- Repeat the read-only public payload test, compare field-for-field with the current Mini App expectations, and record at least three latency measurements.
- Capture test evidence and a rollback plan; get explicit owner approval before changing any live deployment.

### Current decision
- Continue source review and staging design only. No application code, Script Properties, bot token, Sheet, or deployment was changed by this review.


## Server-call inventory from current checked-in UI (2026-10-28)

### CMS Central page
- Dynamic `runServer(name, ...args)` calls are present. The literal call inventory found in the checked-in Central page is: `getCMSData`, `seedDailyContentStarterPack`, `getBookingSchedule`, `saveBookingSchedule`, `updateItem`, `addItem`, `getBookingClosures`, `addBookingClosure`, `toggleBookingClosure`, `deleteBookingClosure`, `uploadDailyContentImage`, `toggleItem`, `deleteItem`.
- Because the UI calls server methods dynamically, guard coverage must be validated against the complete set of values passed to `runServer`, plus all server functions that remain externally reachable. Do not rely only on visible buttons or static grep.

### CMS Admin page
- Client calls include `getCMSData`, `addItem`, `updateItem`, `toggleItem`, and `deleteItem`. Each requires server-side access checks if it returns private data or mutates the CMS. The current checked-in server functions do not show an authorization check at their entry points.

### VIP Admin page versus VIP customer page
- Admin UI invokes `getAdminInitialData`, `saveVIPSettings`, `addVIPCustomer`, `getVIPCustomers`, `setVIPStatus`, `createVIPToken`, `getVIPTokens`, `generateVIPConnectionCode`, `getVIPConnectionCodes`, and `revokeVIPConnectionCode`.
- Customer UI has its own calls and must be kept separate. In particular, do not lock down shared/customer-facing settings or the customer `doPost` flow merely because the admin UI uses related code. Every admin-only RPC must be protected independently on the server.

### Booking backend admin routes
- Router currently exposes `approveBooking`, `rejectBooking`, `cancelBooking`, and `releaseExpiredHolds` as request actions. Approval/rejection need authenticated admin authorization at the route and/or function boundary; cancellation/hold-release require caller analysis before changing their policy to avoid breaking legitimate customer/system flows.
- Telegram callback handling checks the configured chat ID but the checked-in callback handler does not verify `callbackQuery.from.id` against the configured numeric admin user ID. A chat ID is not sufficient proof of which Telegram account clicked a button.

### Implementation boundary
- This inventory is source-review evidence only. It does not claim to enumerate the deployed Version 46 source. The deployed code still needs to be compared with repository source before production design is finalized.
- No application code, bot configuration, Script Properties, live deployment, or Sheet was changed in this step.


## Next step: safe staging preparation checklist (2026-10-28)

### Live-vs-repository parity must be established by the project owner
- Live deployment is still the owner-reported Version 46 deployment documented above. Repository source alone cannot establish what is deployed.
- In Apps Script editor, inspect the deployment's associated project and identify the deployed version/source. Compare the relevant `doGet`, public data functions, and admin RPC functions with the checked-in repository. Do not edit the deployment or click Deploy during this inspection.
- Record only the result and file/function differences; never copy bot tokens, passwords, or customer data into GitHub or chat.

### Isolated staging project setup
1. Create a new Apps Script project owned by the same account; do not create it by editing the live project.
2. Use synthetic, non-customer Sheets with the minimum CMS/VIP columns required by the code. Do not share the live spreadsheet with the staging project.
3. Set separate staging-only Script Properties for the admin numeric ID, staging bot token, and webhook secret. Never use the production bot token in staging.
4. Enable the Advanced Google Sheets service only if the public API scaffold requires it, and verify the linked API is enabled.
5. Deploy staging as a Web App with the least exposure that still supports the test. If Telegram needs a public webhook, require Telegram's webhook secret and enforce actor ID on every admin action.
6. Run the test matrix against synthetic data; retain redacted evidence only. Do not point the Mini App, production bot webhook, or production Sheets at staging.

### Hosting/session design is not yet finalized
- A static dashboard URL is not a security boundary. All data and mutations must pass through authenticated server functions.
- Do not place bot tokens or long-lived session credentials in the static bundle, query strings, or localStorage.
- Before choosing a browser session scheme, prove in staging how Apps Script handles redirects, origin/CORS, request headers, and short-lived credential redemption. CORS alone is not authorization.
- If Apps Script cannot provide the required session behavior safely, reassess the transport while preserving the locked free-stack preference; do not silently introduce paid infrastructure.

### Current safe next action
- The next action is an owner-side, read-only comparison of deployed Version 46 source against repository source, followed by staging setup. No code or production settings are changed by this checklist.


## CMS main-branch callable RPC inventory (static source review, 2026-10-28)

Source inspected: `code.gs` on `main`, blob SHA `149893b3283687936863d19c5b12d8bec6d703f4`. This is repository source, not proof of deployed Version 46 parity.

### Client-callable functions (names do not end in underscore)
- Public read candidate: `getMiniAppData`. Keep this public only after narrowing its data source and allowlisting its response.
- Admin/private read candidates: `getCMSData`, `getDashboardStats`, `getBookingSchedule`, `getBookingClosures`. Confirm each caller and whether any data is needed publicly; otherwise require a valid admin session.
- Admin mutations requiring server-side authorization: `saveBookingSchedule`, `addItem`, `updateItem`, `deleteItem`, `toggleItem`, `addBookingClosure`, `toggleBookingClosure`, `deleteBookingClosure`, `uploadDailyContentImage`, `seedDailyContentStarterPack`.
- Diagnostic candidate: `testMiniAppData`. Restrict to staging/test use or remove from public reach if it reveals internal diagnostics.
- `doGet` currently serves pages/routes and must not expose the Admin page/data merely because a query parameter selects it; keep the public Mini App route separate from the protected dashboard route.
- Functions ending in underscore (for example `getAllData_`, `getOrCreateCmsSheet_`, `callBookingAdmin_`) are intended as private Apps Script helpers and are not directly callable through `google.script.run`; still ensure public functions cannot invoke them in an unauthorized path.

### Authorization design notes
- Use a single server-side guard for each admin RPC and fail closed if admin configuration/session verification is missing.
- A client-side password prompt, hidden link, username check, or dashboard URL is not an authorization boundary.
- Avoid treating `getBookingSchedule` and `getBookingClosures` as public just because the booking UI has date/slot views; trace actual callers and provide a separate minimal public response if required.
- Avoid using a generic `getCMSData` as the dashboard's long-term API without a server-side guard and response minimization.
- Before coding, confirm exact function callers in `Central.html` and `Admin.html`, then add tests for every callable public function.

### Next gate
- This inventory is a proposed classification from static code inspection. It is not an authorization patch and has not been runtime-tested.
- Next implementation should occur only in an isolated staging project/branch after explicit owner approval. No live source, deployment, Sheet, or Script Property was changed in this review.


## UI-to-RPC trace (Central.html and Admin.html, 2026-10-28)

### Central.html
- The generic `runServer(name, args)` wrapper invokes the named Apps Script function dynamically; it does not add authorization.
- Literal call sites found: `getCMSData`, `seedDailyContentStarterPack`, `getBookingSchedule`, `saveBookingSchedule`, `updateItem`, `addItem`, `getBookingClosures`, `addBookingClosure`, `toggleBookingClosure`, `deleteBookingClosure`, `uploadDailyContentImage`, `toggleItem`, and `deleteItem`.
- This page includes both CMS content management and booking/schedule management, so protecting only the older `Admin.html` is insufficient. The route and all server functions called by this page need the same server-side session policy.

### Admin.html
- The older CMS page directly uses `google.script.run` for `getCMSData`, `addItem`, `updateItem`, `toggleItem`, and `deleteItem`.
- These are overlapping RPCs with Central.html; any guard must apply in the server implementation, not only one page.

### Public page and diagnostic boundaries
- `doGet` returns `Central` for the default route and `Admin` for any non-`central` page value. Treat page selection as presentation only, never authorization.
- `action=getMiniAppData` is the public data route candidate. It should call a minimal public-only builder, not the broad CMS loader.
- `testMiniAppData` should not expose diagnostics to arbitrary public callers; limit it to staging or an authenticated administrator.
- The current UI call inventory is source-level only. It does not establish deployed Version 46 parity or prove runtime authorization behavior.

### Implementation-ready authorization table
| Function family | Policy target |
|---|---|
| `getMiniAppData` | Public, strict response allowlist and no private-sheet reads |
| `getCMSData`, `getDashboardStats` | Admin session required |
| `getBookingSchedule`, `getBookingClosures` | Admin session required unless a separately minimized public read is proven necessary |
| CMS CRUD/toggle functions | Admin session required |
| Schedule/closure mutations | Admin session required |
| Image upload and seed helper | Admin session required; seed helper may be staging-only |
| `testMiniAppData` | Staging-only or admin-only |
| `doGet?page=admin` / default Central page | Page rendering is not a permission check; protect data/actions independently |

### Next gate
- Next code change, after explicit approval, should be an isolated staging implementation of the server-side guard and public-only data builder, followed by direct-RPC negative tests. No app code or live deployment was changed during this trace.


## Cross-repository server-side guard verification (2026-10-28)

This step inspected the checked-in VIP and booking backend source. It was read-only; no application files or deployments were changed.

### VIP admin RPCs
- Current VIP source functions `getAdminInitialData`, `getVIPCustomers`, `getVIPTokens`, `getVIPConnectionCodes`, `saveVIPSettings`, `addVIPCustomer`, `setVIPStatus`, `createVIPToken`, `generateVIPConnectionCode`, and `revokeVIPConnectionCode` do not show a server-side admin identity/session check at their entry points.
- `getAdminInitialData` aggregates customer, token, connection-code, and settings data. It must be protected before calling any of those helpers.
- Do not add an admin-only guard to customer `doPost` or customer token activation merely because these share the VIP project. Preserve the existing Telegram `initData` validation for customer identity and add a distinct admin authorization path.

### Booking backend
- `routeRequest_` currently routes `approveBooking` and `rejectBooking` to their mutation functions without authenticating an admin at the router.
- `approveBooking_` and `rejectBooking_` record `request.adminId` / `request.admin` as audit labels; those caller-supplied values are not proof of authorization.
- `handleTelegramCallbackQuery_` verifies the configured admin chat ID but does not compare `callbackQuery.from.id` to the authorized numeric admin user ID. In a group/shared chat, chat-level verification is not actor-level authorization.
- Before guarding `cancelBooking` or `releaseExpiredHolds`, trace all public, customer, and scheduled-trigger callers. Do not block legitimate system cleanup or customer cancellation by applying an indiscriminate admin guard.
- Existing rejection idempotency should be preserved while adding authorization.

### Required design consequence
- One shared concept of “admin” must not mean one shared credential across unrelated bots/projects. CMS dashboard sessions, VIP admin RPCs, booking Telegram callbacks, and customer-facing VIP initData have different trust boundaries. Use the appropriate server-side verification at each boundary and keep production bot tokens separate.
- All changes should first be made in an isolated staging copy and validated against synthetic data. Production changes require explicit owner approval.
