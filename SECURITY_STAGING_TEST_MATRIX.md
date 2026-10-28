# Kaenatchi Admin Dashboard — Staging Security Test Matrix

Status: planning only. No production code, deployment, bot configuration, Script Properties, or Sheets were changed to prepare this matrix.

## Test environment rules
- Use a dedicated staging Apps Script project and copied/synthetic Sheets, never the live CMS/VIP/booking spreadsheets.
- Use a staging bot token distinct from the production customer bot. Keep tokens in Script Properties; never commit them or paste them into chat.
- Do not deploy any test build to the production Web App URL.
- Capture test results and execution logs with tokens, session credentials, phone numbers, Telegram IDs, and customer data redacted.

## Identity and dashboard launch

| ID | Scenario | Expected result | Evidence |
|---|---|---|---|
| AUTH-01 | Configured admin opens admin bot | Bot issues one-time short-lived launch credential | Redacted bot response and server log |
| AUTH-02 | Different Telegram user starts bot | No launch credential; no dashboard session | Denial response and server log |
| AUTH-03 | Callback from wrong Telegram user in a shared/admin chat | Action denied based on callback actor ID | Redacted callback log |
| AUTH-04 | Webhook has missing/incorrect Telegram secret | Update rejected; no state change | HTTP/log result |
| AUTH-05 | Missing admin ID or bot config | Fail closed; no admin operation | Redacted error |
| AUTH-06 | Launch credential expired | Redemption denied | Test timestamp and response |
| AUTH-07 | Launch credential redeemed twice | First redemption only; replay denied | Two responses |
| AUTH-08 | Session expired/revoked | Every privileged request denied | Response and log |
| AUTH-09 | URL query, username, client flag, or localStorage claims admin | No effect on authorization | Negative test output |
| AUTH-10 | Password wrong or rate limit exceeded (if password retained as second factor) | Denied and rate-limited; no credential issued | Attempt counts and responses |

## Direct server-call and operation authorization

| ID | Scenario | Expected result |
|---|---|---|
| RPC-01 | Call each CMS read/write method without a valid session | Denied before reading private data or mutating Sheets |
| RPC-02 | Call each VIP admin method without a valid session | Denied; VIP customer-facing flow unaffected |
| RPC-03 | Call approve/reject booking route as customer | Denied; booking/payment state unchanged |
| RPC-04 | Authorized admin invokes each explicitly allowlisted operation | Only requested operation occurs; actor recorded from verified session |
| RPC-05 | Unknown operation or extra/forged adminId field | Denied; caller-supplied admin identity ignored |
| RPC-06 | Attempt to read token/config secrets or private collections through public API | No secret/private field in response and no unnecessary private collection read |
| RPC-07 | Invalid input, malformed JSON, repeated request | Safe error; no partial or duplicate mutation |

## Regression checks

| ID | Scenario | Expected result |
|---|---|---|
| REG-01 | Public Mini App loads services, prices, active public content, dates and available slots | Same required public fields/semantics as baseline |
| REG-02 | Customer creates a booking and submits payment | Existing flow works end-to-end in staging |
| REG-03 | Customer VIP view and token activation | Existing customer authorization and behavior remain intact |
| REG-04 | Admin changes VIP status/token/settings | Works only with a valid admin session |
| REG-05 | Admin opens/closes a slot or closure | Existing Shamsi date/time rules remain intact |
| REG-06 | Telegram booking notification approve/reject buttons | Only verified admin actor can approve/reject; duplicate rejection remains idempotent |
| REG-07 | Missing private config | Admin fails closed; public read-only paths behave only as explicitly designed |
| REG-08 | Three or more public API timing runs | Record each duration; compare with baseline without inventing a pass threshold |

## Required evidence before release
1. Identify the source/version actually deployed as CMS Version 46 and compare it with the repository.
2. Record baseline public payload keys/shape from a safe staging copy.
3. Run all applicable tests and attach redacted results to the review.
4. Review the full server-call inventory and every callable admin function; no partial grep-only coverage.
5. Verify rollback instructions and confirm public Mini App, booking, VIP customer, and Telegram notification regressions pass.
6. Request explicit owner approval before production deployment or changing any production Script Property, webhook, or deployment access setting.

## Current implementation blockers
- Live Version 46 source parity with GitHub is not yet confirmed.
- PR #8 public API scaffold has not been executed in an isolated Apps Script project.
- Apps Script browser/session and cross-origin transport behavior for the chosen static dashboard host must be verified in staging before finalizing token transport.
- Booking approval/rejection authorization must verify the Telegram callback actor, not only the chat ID.
