# Apps Script endpoint reconciliation

Status: source-only mapping prepared on `security/cms-public-private-split`. This records the URLs referenced by the Main Mini App source branch `feature/therapy-intake-shared-flow`. It does not independently prove which deployment is live or which Apps Script project/deployment version currently serves each URL.

## Exact references found in Main Mini App source

| Role in Mini App source | Constant | Referenced endpoint | Source evidence |
|---|---|---|---|
| Public CMS content | `CMS_API_URL` | `https://script.google.com/macros/s/AKfycbzgocb54x4FDoQl3C8-o2WnipZuQYkM1j1juV-ZZKHoieN7DbrybTj3WyXbJe5I2nMhXw/exec` | `src/App.tsx` defines `CMS_API_URL`; calls `?action=getMiniAppData` |
| VIP Mini App | `VIP_API_URL` | `https://script.google.com/macros/s/AKfycbySl6RH5K7oTLBus2cjvBJuOv-ZTjIhX9OnIq93gifQng1IfMl7f2A3Bl-7pSx1nC1u/exec` | `src/App.tsx` defines `VIP_API_URL`; VIP requests use POST |
| Booking backend | `BOOKING_BACKEND_ENDPOINT` | `https://script.google.com/macros/s/AKfycbyEh9txZP7nWdLoTtNvbQn_aKxiI0syH3M8Qh0TXR6C6AFC5rEuyidq1tMo5ufpKdXzHg/exec` | `src/App.tsx` defines `BOOKING_BACKEND_ENDPOINT` |
| Booking transport | `BOOKING_TRANSPORT_ENDPOINT` | `https://kaenatchi-booking-transport.mayanaz-oriflame.workers.dev/` | `src/App.tsx` defines `BOOKING_TRANSPORT_ENDPOINT` |

## Reconciliation against source repositories

### CMS repository
The reviewed `kaenatchi/KaenatChi-CMS` branch `security/cms-public-private-split` contains `code.gs` with:
- `doGet(e)` returning JSON for `action=getMiniAppData`.
- Other GET requests serving `Central.html` or `Admin.html`.
- No `doPost(e)` in that file.

This is structurally consistent with the CMS-content role. However, the URL constant in the Mini App does not itself prove that this exact repository/version is deployed to that endpoint.

### Booking repository
The reviewed `kaenatchi/KaenatChi-Booking-Backend-v2` file `Code.gs` has `doGet(e)`, `doPost(e)`, and a `getSchedule` action. This is structurally consistent with a booking backend, but the Apps Script URL-to-project/deployment mapping still requires confirmation from the Apps Script deployment screen.

### VIP
The Main Mini App uses a separate `VIP_API_URL` constant and sends VIP requests via POST. The CMS repository also contains a `TelegramVIP.gs` file with a Telegram Mini App `doPost(e)` handler validating Telegram `initData`. Do not assume these are the same deployed project merely because related source code exists in the CMS repository. The URL constants differ by role, and the live project mapping is not proven by source alone.

## Security decision based on the mapping

1. Treat the CMS endpoint as public-facing because the Main Mini App requests `getMiniAppData` from it without an interactive admin login.
2. Do not flip that endpoint to “Only myself” until a replacement public-content endpoint is deployed and the Mini App has been safely tested against it.
3. Keep the booking backend and Cloudflare Worker unchanged during CMS separation.
4. Keep VIP unchanged while the URL-to-project mapping and authentication path are verified separately.
5. For the future public CMS handler, use a narrow content-only reader that never calls `getCMSData()`; do not merely filter the broad payload after private sheets have already been read.
6. For the private admin surface, choose and test the actual authentication model before adding guards. Do not assume `Session.getActiveUser()` always identifies a caller correctly under every Apps Script deployment mode.

## What remains unverified
- Whether the URLs listed above are the currently deployed production URLs, rather than the URLs in the reviewed Mini App branch.
- The Apps Script project name, deployment ID/version, execute-as identity, and access setting for each URL.
- Whether old deployments remain active.
- Whether the spreadsheet is shared directly with anyone beyond the owner and authorized operators.

## Release gate
This file is documentation only. No endpoint constants, application code, deployment settings, Worker configuration, or spreadsheet permissions were changed. No merge or deployment was performed.
