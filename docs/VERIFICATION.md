# Verification and handoff

## Executed in the implementation environment

- Node.js 22.16.0, TypeScript 5.8.3.
- `npm run typecheck`: passed.
- `npm test`: **23 passing unit/API-contract checks**.
- `npm run build`: passed; static `dist/` generated.
- `python3 tests/browser_smoke.py`: **18 passing offline browser integration scenarios**, Python Playwright 1.57.0 with Chromium.
- Desktop login/dashboard, Vietnamese dashboard, and 390px mobile navigation/table layout were visually inspected. Screenshots use fictional test data.

Unit checks cover the response envelope, bearer/public requests, malformed/error responses, 401/403, session races (including JSON parsing), URL and ID handling, zero coordinates, false filters, pagination, dates, exact request payloads, and failed deletion handling.

Browser scenarios cover login rejection for non-Admin accounts, Building/Category/Question/Answer CRUD, pagination, roles/status and self-protection, chat reading/deletion/filters, OTP/password validation, profile update, error/retry, session expiry, logout, text-only rendering of unsafe content, empty states, responsive navigation, and language switching.

## What those results do NOT prove

The environment could not install dependencies from the network or navigate the browser to localhost/Azure. The compiler was used from an existing local TypeScript 5.8.3 installation. The npm lockfile is committed, but a clean `npm ci` must also run in CI or on the developer machine.

The browser suite loads compiled application code through a test-only CommonJS harness using `page.set_content`, with isolated storage and mocked `fetch`. It makes **no production HTTP requests**. It is not a deployed native-ESM/CSP/CORS test and is not proof of live backend authorization, migrations, or data correctness. It is also not a full accessibility audit or a cross-browser certification.

There was no usable Admin credential supplied for live verification. No user, building, question, answer, chat, or password was created/changed/deleted on Azure. No Supabase migration, bootstrap, credential rotation, CORS change, or hosting deployment was performed here.

The CI workflow is provided to repeat clean installation/build/tests. Do not describe CI or deployment as passed until the actual GitHub run completes successfully.

## Required live smoke checks

Perform these on a staging backend or with disposable records, never by blindly deleting production data:

1. Confirm the deployed Swagger includes the new Admin endpoints and matches `docs/API_CONTRACT.md`.
2. Apply the backend `is_active` migration, bootstrap an active Admin, rotate exposed credentials, and configure CORS for the exact frontend origin. Keep all secrets server-side.
3. Run `npm ci && npm run build && npm run preview`; open the real HTTP page, check native ESM assets, CSP and the Network tab. Verify initial login has no fake data and a wrong login fails visibly.
4. Confirm Admin login -> `/users/me` -> dashboard/users/histories. Compare counts and pagination totals with backend truth.
5. Independently test API access with Customer and Employee tokens (expect Admin endpoints to reject them), invalid tokens, and a disabled disposable account. Frontend route guards alone are not authorization tests.
6. Create/edit/delete a disposable building/category/question/answer; verify persisted changes after browser reload. Confirm cancellation sends no write request.
7. Test role/status changes on another disposable user, not the only Admin. Confirm disabled tokens stop working in the backend; verify last-Admin protections separately.
8. View an authorized test conversation, check timestamps and ordering, and test deletion only on disposable chat data.
9. Test OTP and password change on a dedicated account, including incorrect OTP/current password. Verify backend revocation behavior separately.
10. Test reload, expired token, logout, browser back/direct hash links, desktop/mobile, and a second supported browser.
11. Deploy to the intended static host only after these checks; repeat CORS/login after deploying.

## Useful commands

```bash
npm ci
npm run check
python3 -m pip install -r tests/requirements.txt
python3 -m playwright install --with-deps chromium
npm run test:browser
```

Generated test screenshots, logs, and reports go into ignored `artifacts/`, never into the production build. `CHROMIUM_PATH` can select a locally installed Chromium; otherwise the test uses an available Chromium or Playwright's installed browser.
