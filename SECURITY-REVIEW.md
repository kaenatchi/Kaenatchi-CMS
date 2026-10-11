# Security review — current CMS deployment source

Date: 2026-10-11
Status: source-level finding; no live endpoint probing or deployment changes performed.

## High-priority concern

The source on `main` routes unauthenticated Web App requests through `doGet` to the CMS HTML page by default. The CMS page invokes `google.script.run.getCMSData()`. The current `getCMSData()` implementation includes the private collections `bookings`, `customers`, `payments`, `schedule`, `blockedDates`, `blockedSlots`, `bookingLogs`, and booking settings. The same source contains generic mutation helpers such as `addItem`, `updateItem`, `deleteItem`, and `toggleItem`.

Because the user reports the existing Web App access is set to “Anyone”, this combination should be treated as a potentially serious exposure until server-side identity and authorization are verified. This source review does not prove that a third party has accessed or successfully invoked any function.

## Required safe path

1. Do not modify, redeploy, or change access on the current live Version 46 during this preparation phase.
2. Do not merge this branch to `main`.
3. Keep public Mini App reads isolated to `public-api/Code.gs` and an independently deployed public-only project after compatibility review.
4. Keep admin HTML, reads of private collections, and all CRUD/write operations out of the public API project.
5. Before any private CMS is redeployed, implement server-side authentication and authorization for every privileged callable function. Hiding UI buttons or relying on the HTML page is not authorization.
6. Use `ReadOnlyDiagnostics.gs` only in a separate temporary Apps Script project with the read-only scope. It reports schema metadata only and is not a Web App endpoint.
7. Verify schema, allowlists, settings keys, Mini App compatibility, and runtime tests before asking the user to approve any release.

## Out of scope / protected

No changes to the Cloudflare Worker, booking backend, payments, VIP, Jalali date handling, slot holds/race prevention, Schedule logic, or live deployment were made or authorized.
