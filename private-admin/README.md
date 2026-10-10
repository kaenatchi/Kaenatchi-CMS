# Private CMS Admin — extraction plan (staging only)

This folder documents the private admin extraction target. No admin runtime code is copied here yet because the actual server-side identity/authentication model must be verified first.

## Required contents after auth is proven

- A private doGet route that serves only the management UI after the selected access policy is enforced.
- Only the server functions called by Central.html and Admin.html, after a full call inventory.
- A server-side authorization guard in every privileged read, mutation, schedule, closure, upload, and VIP-code function.
- Explicit sheet and field allowlists; no caller-controlled arbitrary sheet names.
- No public Mini App API handler in this project.

## Must not copy blindly

- Do not copy getCMSData() as-is: it returns customer, booking, payment, schedule, blocked-date/slot and log collections.
- Do not copy generic CRUD without restricting allowed sheets and columns.
- Do not assume a client-side password or hidden button is authorization.
- Do not assume Session.getActiveUser() is reliable until tested under the actual Apps Script deployment and user accounts.
- Do not change the current Version 46 deployment or its access setting.

## Verification before implementation

1. Confirm which Google account(s) are authorized CMS administrators.
2. In a separate test Apps Script project, verify identity/access behavior with anonymous and authorized sessions.
3. Confirm the private deployment can be restricted without impacting the public Mini App endpoint.
4. Add guards and test every callable function, including failure paths.
5. Keep all production changes blocked until explicit approval.
