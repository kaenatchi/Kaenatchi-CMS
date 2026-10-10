# Public API / Main Mini App compatibility audit

Date: 2026-10-11
Branch: `security/public-api-project-prep`
Scope: source-level comparison only. No live spreadsheet rows, headers, Apps Script execution, deployment, or endpoint switch was performed.

## Consumer contract found in `src/App.tsx`

The Main Mini App expects these top-level JSON properties:
- `success`
- `services`
- `courses`
- `events`
- `faq`
- `pages`
- `settings`
- `dailyContent`
- `bookingContent`

The new scaffold returns exactly these properties. It does not return the private collections used by the CMS admin or booking backend.

## Field compatibility matrix

| Collection | Fields consumed by Mini App | Projection status |
| --- | --- | --- |
| Services | ID/slug, service title, category, description, price, duration, active flag | Included in public field allowlist |
| Courses | ID/slug, course title, description, active flag | Included |
| Events | ID/slug, event title, description, active flag | Included |
| FAQ | Question/title, answer/text/description, category/group, active flag | Included; FAQ aliases added during audit |
| Pages | Page title/name, key/slug, text/description/answer, active flag | Included |
| Settings | Key/name plus value/text/link/url for hours, Telegram, WhatsApp, Instagram, channel and booking payment display | Field projection included; exact live key names still need verification |
| DailyContent | ID, title, text/content/description/short summary, image URL, category, active flag, Jalali start/end, order, display placement | Included |
| BookingContent | Key, title, section, content/text/description, image URL, order, active flag | Included |

## Behavior checks from source

- The existing CMS endpoint filters public content rows using the Persian `فعال` field and recognized active values: `بله`, `فعال`, `true`, `1`, `yes`. The new scaffold now applies the same rule to the same public content collections.
- The Mini App also filters active rows client-side. Its helper treats blank status as active, but the existing CMS endpoint filters server-side first and excludes blank status. The scaffold mirrors the server-side rule, so this preserves the existing endpoint's observable behavior.
- Booking content is sorted by numeric `ترتیب` ascending, matching the existing CMS endpoint.
- Daily content keeps its original field names; date-window and placement logic remains in the Mini App.
- Public projection omits the internal `_row` metadata and does not include private collections.
- The Settings filter uses exact normalized keys, not substring matching, to avoid exposing similarly named secrets. This is intentionally stricter than the Mini App's substring lookup.

## Release blockers — not yet proven

1. **Live header rows are not visible through the repository.** GitHub source cannot establish the actual current spreadsheet headers or values.
2. **The current Apps Script endpoint could not be retrieved through the available read-only web inspection.** Therefore no live JSON snapshot or row counts are claimed.
3. **Settings key compatibility remains unverified.** Compare each actual public key with `isPublicSettingKey_`; add only individually confirmed public keys.
4. **No runtime test has been run in Apps Script.** The scaffold's `testPublicPayloadSafety()` must be run only after copying it into a separate staging project bound to an approved test/read-only setup.
5. **Admin separation is not implemented yet.** `private-admin/README.md` is a plan, not a functioning private deployment. A verified server-side identity policy and per-function authorization are still required.
6. The code does not currently add the courses/events registration metadata columns because the inspected Mini App consumer does not read those fields.

## Release gate

Do not deploy this scaffold, switch `CMS_API_URL`, alter Version 46, change its access setting, merge to `main`, or change the Worker, booking, VIP, payments, Jalali logic, or Schedule until all blockers are cleared and the user explicitly approves.
