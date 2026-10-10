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
