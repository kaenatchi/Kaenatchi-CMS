# Public Mini App API — staging scaffold

This folder is a source-only scaffold for a **new, separate Google Apps Script project**. It is not a deployment and is not connected to the live URL.

## What this code does

- Exposes only `doGet?action=getMiniAppData`.
- Reads only public presentation sheets: Services, Courses, Events, FAQ, Pages, Settings, DailyContent, BookingContent.
- Projects columns through explicit per-sheet allowlists and omits the internal `_row` marker.
- Filters Settings through an exact key allowlist.
- Does not contain CMS HTML, CRUD, file uploads, booking/customer/payment/schedule readers, VIP functions, or write operations.

## Do not deploy yet

This scaffold is **not production-ready until all blockers below are cleared**:

1. Verify the actual live header row for every listed sheet, especially Settings, Services, DailyContent and BookingContent. Repository code does not prove the live spreadsheet schema.
2. Compare the resulting JSON keys and values against every field consumed by the Main Mini App. If a legitimate public field is missing from the allowlist, add it explicitly after verifying the header.
3. Verify every actual public Settings key. Keep exact matching; never replace the allowlist with substring matching.
4. Run the safety test against a staging copy or an approved read-only test setup and confirm the counts and payload structure.
5. Create a new Apps Script project manually, copy only `Code.gs` from this folder, bind/authorize it to the authoritative spreadsheet, and deploy it separately. Do not change CMS Version 46.
6. Test the new endpoint directly. Do not switch the Mini App's `CMS_API_URL` until explicit compatibility checks pass and the user approves.
7. The separate private CMS still needs its own verified server-side authentication model and authorization on every privileged function. This public API scaffold does not solve that by itself.

## Important compatibility note

The Main Mini App's client-side `cmsActive` helper treats a missing/blank active field as active. However, the existing CMS server endpoint calls `getActiveRows_` before returning public content and only publishes rows whose `فعال` value is one of `بله`, `فعال`, `true`, `1`, or `yes`. This scaffold mirrors that server-side behavior with `getPublicActiveRows_`, so blank-status rows are excluded before they reach the Mini App. This matches the current CMS endpoint's observable behavior, but live row values and counts still need verification before release.

## Protected scope

Do not merge to `main`, deploy, switch endpoints, or change the live Apps Script deployment/access settings from this scaffold. Do not change Cloudflare Worker, booking, payments, VIP, Jalali logic, or Schedule.
