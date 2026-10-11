# Public API / Main Mini App compatibility audit

Date: 2026-10-11
Branch: `security/public-api-project-prep`
Scope: source review plus a successful read-only schema diagnostic in a separate temporary Apps Script project. No live endpoint/deployment change, no spreadsheet writes, and no private row values were read.

## Main Mini App consumer contract

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

The staging scaffold returns exactly these properties and excludes private collections used by the CMS admin and booking backend.

## Confirmed live spreadsheet schema (headers only)

The read-only diagnostic successfully identified the spreadsheet title and the following expected public-content headers:
- `Services`: فعال, نام خدمت, دسته, توضیح کوتاه, توضیحات کامل, قیمت, تصویر, ترتیب
- `Courses`: فعال, نام دوره, توضیح کوتاه, توضیحات کامل, سرفصل‌ها, مدت, هزینه, تصویر
- `Events`: فعال, نام ایونت, توضیح کوتاه, توضیحات کامل, تاریخ, ساعت, نحوه برگزاری, ظرفیت, هزینه
- `FAQ`: فعال, سؤال, پاسخ, دسته, ترتیب
- `Pages`: فعال, نام صفحه, عنوان, متن, تصویر
- `Settings`: کلید, مقدار, توضیحات
- `DailyContent`: شناسه, عنوان, متن, لینک تصویر, دسته, فعال, تاریخ شروع, تاریخ پایان, ترتیب, محل نمایش
- `BookingContent`: کلید, عنوان, بخش, محتوا, لینک تصویر, ترتیب, فعال

It also confirmed the presence and headers of private/booking-related tabs (Bookings, Customers, Schedule, BlockedDates, BlockedSlots, Payments, BookingSettings, BookingLogs). Their row contents were not read. The expected misspelled legacy tab `BookingSetings` does not exist; `BookingSettings` does.

### Settings key names confirmed

The diagnostic read only the Settings key/name column and found:
- `booking_card_number`
- `booking_bank_name`
- `booking_card_holder`
- `booking_payment_text`

No corresponding setting values were read by the diagnostic. The staging public API allowlist includes these exact normalized keys because the Mini App uses payment display information. No other Settings keys are permitted by the public API allowlist.

## Performance review update (2026-10-11)

The staging reader was updated to use Google Sheets Values `batchGet` for allowlisted content columns and for individually approved public Settings cells. This removes the prior one-request-per-column and one-request-per-approved-cell pattern while preserving the field and Settings-key allowlists. The safety test now reports `elapsedMs` and `valuesBatchRequests`; those metrics still need to be collected by running the updated code in the separate temporary Apps Script project. No live deployment, Mini App URL, Worker, or main-branch file was changed.

## Staging implementation behavior

- The staging API uses the Advanced Google Sheets service and declares only the `spreadsheets.readonly` OAuth scope. The diagnostic successfully ran with that scope.
- Public content readers use Sheets API values reads and retrieve only explicitly allowlisted columns rather than whole rows.
- Settings handling first reads only the key column, then reads allowlisted fields only for rows whose keys match the exact public allowlist. It does not fetch values for other Settings keys.
- Content rows are published only when the Persian `فعال` field explicitly contains a recognized active value: `بله`, `فعال`, `true`, `1`, or `yes`. This matches the current CMS endpoint's server-side rule.
- Booking content is sorted by numeric `ترتیب` ascending.
- The public payload omits internal `_row` metadata and private collections.
- The new diagnostic is schema-only; it does not read customer, booking, payment, receipt, VIP-token, or other private row contents, and it does not write or deploy anything.

## Remaining release blockers

1. **No public API runtime test yet.** The staging public API code itself has not been run against the real sheet in a separate test project. Only the schema diagnostic has run.
2. **Main Mini App contract still needs a payload test.** Verify all eight collections, expected field aliases, active filtering, and settings rendering with the staging payload before any URL switch.
3. **Admin separation is not implemented.** `private-admin/README.md` is a plan, not a functioning private deployment. A verified server-side identity policy and per-function authorization are still required.
4. **No deployment or endpoint switch has been authorized.** The live Mini App still uses its existing endpoint; no endpoint URL was changed.
5. Course/event enrollment metadata is not added because the inspected Mini App consumer does not currently read those fields. If product requirements change, assess separately.

## Release gate

Do not deploy this scaffold, switch `CMS_API_URL`, alter Version 46 or its access setting, merge to `main`, or change the Worker, booking, VIP, payments, Jalali logic, or Schedule until remaining blockers are cleared and the user explicitly approves.
