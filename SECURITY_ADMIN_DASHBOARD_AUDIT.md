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