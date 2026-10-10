# CMS Server Authorization Audit — 2026-10-10

## Status
**NO-GO for merge/deploy.** This is a source review, not proof of a live exploit. No live Apps Script, spreadsheet, Worker, booking or VIP settings were changed.

## Confirmed source risks
- `doGet(e)` serves `Central.html` by default and `Admin.html` for other page values without an apparent identity check; it enables `XFrameOptionsMode.ALLOWALL`.
- `getCMSData()` returns private booking/customer/payment/schedule/closure/log collections. `getDashboardStats()` calls it. No visible server-side authorization check was found in either.
- `addItem`, `updateItem`, `deleteItem`, `toggleItem`, `saveBookingSchedule`, closure proxy functions, `uploadDailyContentImage`, and `seedDailyContentStarterPack` have no visible admin guard.
- Generic CRUD accepts a sheet name from the caller. `updateItem` can blank fields omitted from its payload.
- Image upload grants `ANYONE_WITH_LINK` viewing.
- The public reader draft avoids `getCMSData()`, but returns every column from the chosen public sheets. Public per-sheet field allowlists are still needed.
- VIP connection-code management functions need a separate guard review. Preserve Telegram initData validation and existing VIP logic.

## Main Mini App compatibility review
The active Main Mini App branch `feature/therapy-intake-shared-flow` uses the CMS endpoint with `action=getMiniAppData`. Its public settings lookups include hours, Telegram, WhatsApp, Instagram, channel, booking card number, bank name, card holder and payment text. The current exact allowlist in the CMS draft must be checked against the actual Settings keys and its substring-based consumer before release. Public field projection must also preserve all fields the Mini App needs from Services, Courses, Events, FAQ, Pages, DailyContent and BookingContent.

## Safe implementation plan
1. Keep the current Version 46 public deployment and access setting unchanged while preparing a replacement.
2. Map the actual Apps Script projects/deployments for CMS, VIP and Booking.
3. Separate the content-only public endpoint from the private admin interface and private functions.
4. Choose a verified server-side admin identity/authentication model for the real deployment. Do not rely on a client-side password, an exposed shared secret, or an unverified `Session.getActiveUser()` check.
5. Guard every private read, write, proxy, upload and management function; restrict CRUD to explicit sheet/field allowlists.
6. Add public field allowlists and tests for anonymous access denial, public payload compatibility and no private data leakage.
7. Run booking/VIP/payment/Jalali/slot and schedule regression checks before an explicitly approved staged release.

## Protected scope
Do not merge or deploy without explicit approval. Do not change the Main Mini App, Cloudflare Worker, booking flow, VIP tokens, payments, Jalali handling, live Schedule or CMS Version 46 during this audit.
