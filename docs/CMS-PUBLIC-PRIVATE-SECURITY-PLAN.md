# CMS security preparation — public Mini App / private admin

Status: preparation only. This branch is not deployed and must not be merged without owner approval.

## Safety boundaries
- Keep the current deployed version unchanged during preparation.
- Do not change the existing deployment's access setting as a quick fix: the Main Mini App depends on public access to `getMiniAppData`.
- Do not change the Cloudflare Worker.
- Do not change booking, VIP, payment, slot-hold, Jalali, or Main Mini App runtime behavior in this phase.
- Do not add therapy requests or registration PII to `getCMSData()`.

## Findings from source review
1. `doGet(e)` serves the public JSON action `getMiniAppData`, but otherwise serves `Central.html` or `Admin.html`.
2. `Central.html` calls management functions using `google.script.run`.
3. `getCMSData()` reads content plus bookings, customers, payments, schedule, closures/blocked slots and booking logs. It is also called by `getDashboardStats()`.
4. Content CRUD functions such as `addItem`, `updateItem`, `deleteItem`, and `toggleItem` do not show an explicit server-side admin authorization check in the reviewed source.
5. Source code cannot confirm the access settings of the currently deployed Apps Script version. The reported deployment setting is “Execute as: Me / Who has access: Anyone”.
6. The Mini App needs a public content-only response. Making the existing deployment “Only myself” without first providing a separate public content endpoint can break content loading.

These findings identify an exposure risk to validate; they do not prove that anyone accessed private data.

## Proposed safe target design
Separate the public content surface from the private admin surface.

### Public content surface
- Expose only a deliberately constructed allowlist response for active public content: services, courses, events, FAQ, pages, settings that are genuinely public, daily content, and booking presentation content.
- Do not return bookings, customers, payments, logs, internal schedule configuration, blocked slots, private settings, or any future intake/registration records.
- Keep the public endpoint read-only and validate the requested action.
- Preserve the existing JSON response shape consumed by the Mini App unless compatibility testing proves a change is safe.

### Private admin surface
- Serve the CMS management UI from a separately access-controlled Apps Script deployment/project or another private authenticated surface.
- Add server-side authorization checks to every read and write endpoint; UI hiding is not authorization.
- Ensure admin endpoints fail closed when the caller cannot be authenticated as the owner/authorized administrator.
- Validate sheet names against an explicit allowlist, row numbers, payload fields, and allowed status transitions.
- Return only the fields needed for each admin view. Keep full customer/contact/payment information out of general dashboard responses where not needed.
- Add audit logging for sensitive admin actions, without copying sensitive free text into Telegram.

### Deployment separation decision
Do not implement an access-setting flip on the current deployment. First determine whether the public content endpoint can be separated without changing the public Mini App contract. Prefer a dedicated public content deployment that has no callable admin operations and a separate private admin deployment. Verify that the existing spreadsheet permissions and Apps Script project ownership support this design before coding it.

## Implementation sequence
1. Record the current production URLs and deployment settings as reported/verified; do not alter them.
2. Map all public Mini App calls and all admin functions, including any `doPost` routes, before moving endpoints.
3. Implement the content-only public endpoint and private admin authorization in this branch only.
4. Add tests confirming that public responses contain no private data and that unauthenticated admin reads/writes are rejected.
5. Test the Main Mini App content against the proposed public endpoint without switching production.
6. Review the diff and run booking/VIP/payment/Jalali/transport regression checks.
7. Only after explicit owner approval, plan a staged deployment with a rollback path.

## Release gate
No merge, deployment, production URL switch, access-setting change, Worker change, or data migration is authorized by this document. The current deployed system remains unchanged until the owner explicitly approves a reviewed implementation.


## Branch implementation checkpoint — public reader draft

On 2026-10-10, branch-only changes were made to `code.gs`:
- `getMiniAppData()` now reads the public content sheets directly instead of calling `getCMSData()`.
- The public reader does not provision sheets or modify headers.
- `Settings` is filtered through an exact key allowlist intended for Mini App contact, hours, channel and payment-display values.
- `testMiniAppDataSafety()` reports top-level shape, absence of private collection keys, setting-key allowlist status, and collection counts; it logs no row contents.

Important limits:
- This is a source-level draft only. The diagnostic has not been run against the real spreadsheet in Apps Script, so the allowlist and payload compatibility remain unverified.
- The current public deployment still serves the CMS HTML by default, and global server functions still require a complete server-side authorization review. This change alone does **not** make the admin surface private.
- Do not deploy this branch or change the live access setting yet.
- Before release, test all expected public settings against actual key names, compare the public JSON shape with the Mini App's needs, and implement a separately authenticated admin surface with server-side guards for every read/write function.


## Audit reference (2026-10-10)
See [`CMS-SERVER-AUTHORIZATION-AUDIT.md`](./CMS-SERVER-AUTHORIZATION-AUDIT.md) for the callable-surface risks and Mini App settings compatibility review. The audit confirms this branch is not release-ready: the public endpoint currently shares the same Apps Script deployment surface as admin HTML/global functions, and the live spreadsheet keys/payload have not been tested. The next implementation must first establish a verified server-side identity model and separate public/admin deployment surfaces. No merge or deployment is authorized.

## Deployment separation implementation order — 2026-10-10

### Target state

- **Public content API project/deployment:** only `doGet` + a read-only public-data handler; serves the exact `getMiniAppData` JSON contract needed by the Main Mini App. It must not contain admin HTML or globally callable private management functions.
- **Private CMS project/deployment:** serves the CMS management UI and private functions. Access must be enforced by a verified server-side Google identity/authentication policy for the owner/admin. The private deployment must not be the URL used by the Main Mini App.
- **Shared source of truth:** the existing KaenatChi CMS spreadsheet remains authoritative. No duplicate booking/schedule/payment/VIP data stores are created.
- **Main Mini App:** its CMS endpoint URL is switched only after the public project is deployed and its payload is compared against the existing contract. No UI rewrite is required just to split the endpoint.
- **Booking transport / Worker / VIP / payment / Jalali / slot logic:** out of scope and unchanged.

### Safe staging sequence

1. Create a new Apps Script project for the public API; do not alter Version 46.
2. Add only a read-only API implementation to that project. Do not copy admin functions, VIP functions, generic CRUD, uploads, or private collection readers.
3. Define explicit field projections per public sheet. Do not return all sheet columns by default. Verify actual sheet headers before locking projections; the repository alone does not prove the live spreadsheet schema.
4. Run structural tests against a copy or read-only test setup: expected response keys, required Mini App fields, no private collections, no private/internal columns, correct public settings.
5. Deploy the public API as accessible to the Main Mini App and confirm the JSON response manually without touching the current URL.
6. Create a separate private admin deployment with verified owner/admin authorization. Confirm anonymous callers cannot read or write private data and cannot invoke mutation functions.
7. Only after both sides pass, and after explicit approval, change the Main Mini App CMS endpoint to the new public URL in a separate reviewable change.
8. Keep Version 46 available as rollback until the new endpoint has passed compatibility checks. Do not delete or disable the old deployment during initial rollout.

### Release blockers

- Actual live sheet headers and sample public rows are not available in this source review, so exact public field projections cannot safely be guessed.
- The current CMS endpoint URL is shared by the Mini App and the admin deployment. It must not be switched until a separate public deployment has been tested.
- A private deployment's access setting and identity behavior must be verified in Apps Script itself; GitHub source inspection cannot prove deployment permissions.
- No production change, endpoint switch, merge, or deployment is authorized by this plan alone.
