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

## Additional compatibility findings — 2026-10-10

- The Main Mini App consumer uses substring matching in `cmsSetting()`, with these lookup families: `hours/ساعات`, `telegram/تلگرام`, `whatsapp/واتساپ`, `instagram/اینستاگرام`, `channel/کانال/telegramchannel`, `booking_card_number/شماره کارت/کارت بانکی`, `booking_bank_name/نام بانک/بانک`, `booking_card_holder/صاحب کارت/نام صاحب کارت/بنـام`, and `booking_payment_text/توضیح پرداخت/متن پرداخت`.
- The draft server allowlist uses exact normalized key matching, so it is stricter than the Mini App consumer. Until the actual Settings sheet keys are verified, valid existing contact/payment settings could be omitted and the UI could fall back to defaults or show blank values.
- The draft's channel aliases need a careful pass: `telegramchannelink` appears to be a typo for `telegramchannellink`. Do not broaden the allowlist to substring matching; verify actual keys and explicitly add only confirmed public keys.
- The current `Central.html` branch diff adds course/event registration configuration fields to the CMS form. It does not add a verified authentication gate; treat this as unrelated existing branch work and do not interpret it as a security fix.
- The public reader currently forwards whole row objects from public sheets (including internal `_row` metadata and all columns). Before release, define per-sheet public column projections and test the exact fields the Mini App reads.

## Next safe checkpoint

Do not add speculative authorization code to the combined public deployment. First verify the real deployment/project boundaries and select a design that isolates callable server functions. The safest target to evaluate is a separate read-only public-content Apps Script project/deployment and a separately access-controlled admin project/deployment, both using the same authoritative spreadsheet only where needed. This requires a compatibility test and an approved endpoint switch; it is not authorized for production yet.

