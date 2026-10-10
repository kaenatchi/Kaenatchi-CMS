# KaenatChi unified intake, courses and events architecture

Status: review draft only. This document does not change deployed behavior.

## Confirmed current structure
- CMS Apps Script project is in this repository; code.gs uses the same spreadsheet ID as Booking Backend v2.
- Existing content tabs: Services, Courses, Events, FAQ, Pages, Settings.
- getCMSData() reads Courses and Events; getMiniAppData() exposes active courses and events to the Main Mini App.
- Central.html already has Courses and Events content-management tabs using the generic CMS editor.
- Booking data is backend-owned. Therapy intake is not yet exposed in the CMS UI.

## Locked decisions
1. Main Mini App remains the only customer-facing app. Do not restore a separate /booking/ app.
2. Keep the current Cloudflare Worker unchanged.
3. Keep appointment booking, slot holds, payment, VIP token and Jalali logic unchanged.
4. Therapy intake is only a request. It never creates a booking or reserves a slot. After consultation, the customer uses the existing booking flow.
5. Each Course and Event independently selects its registration mode in CMS: direct or approval_required.
6. Store the mode per item, not as a global setting.
7. Reuse the existing CMS spreadsheet and existing Courses/Events records. Do not create a second spreadsheet.

## Proposed content fields
Keep existing columns and display behavior. After inspecting actual headers and Mini App mapping, add only optional backward-compatible fields as needed:
- RegistrationMode: direct or approval_required
- Capacity: positive integer; blank/unlimited behavior must be explicitly agreed
- RegistrationOpensAt and RegistrationClosesAt: optional dates in one documented format
- PaymentRequired: boolean-like value
- Price: reuse the existing price column if present; never create a duplicate
- WaitlistEnabled: phase 2 only
Never rename or overwrite current columns in the first rollout.

## Separate registration records
Use a dedicated Registrations tab in the same spreadsheet, created idempotently by backend code on first supported use. Do not put class/event registrations in Bookings or TherapyRequests.
Suggested fields: RegistrationID, IdempotencyKey, CreatedAt, ItemType, ItemID, ItemNameSnapshot, CustomerID, FirstName, LastName, Mobile, TelegramUsername, RegistrationModeSnapshot, CapacitySnapshot, Status, PaymentRequired, PaymentStatus, FinalPrice, AdminReviewedAt, AdminReviewNote, UpdatedAt.

## Status and capacity rules
- Suggested states: pending_review, awaiting_payment, payment_submitted, confirmed, rejected, cancelled, waitlisted.
- Capacity is enforced by the authoritative backend under a lock, never by the browser.
- Approval-required requests do not become confirmed seats before the configured approval/confirmation point. Temporary holds need expiry and concurrency tests.
- Use idempotency keys to prevent duplicate submissions.
- Payment amount must match the server-stored final price.
- Do not reuse appointment slot logic for capacity-counted class/event registrations.
- Do not change appointment VIP token behavior. Registration discounts require a separate explicit policy.

## CMS experience
Add a CMS section named «درخواست‌ها و ثبت‌نام‌ها» with separate filters for Therapy requests, Course registrations and Event registrations. Keep record types distinct. Show status, created date, item and contact details only to authorized admins. Review/status changes must go through validated backend functions, not direct browser sheet edits.
Course/Event editor additions: per-item registration mode, capacity, payment requirement and price (reuse existing field), and optional registration window. Old records must retain legacy behavior until an admin explicitly selects a mode.

## Implementation gates
1. Inventory actual sheet headers and deployed Apps Script versions/URLs.
2. Implement backend create/read/review actions with authorization, validation, idempotency, locking, capacity checks and audit logging.
3. Add CMS list/detail/review UI with sensitive data returned only by server functions.
4. Wire Main Mini App registration forms while preserving legacy content rendering when fields are absent.
5. Test duplicates, simultaneous requests at capacity, closed registration, approval gating, wrong/duplicate payments, cancellation and legacy compatibility.
6. Re-run appointment, VIP, payment, Jalali and transport regressions.
7. Merge/deploy only after explicit owner approval.

## Out of scope
- Any Cloudflare Worker change
- Changes to appointment slots, payment or VIP behavior for existing bookings
- Automatic therapy appointment creation
- Manual Google Sheets editing as the normal admin workflow