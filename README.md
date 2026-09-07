# AR-Agentic-Admin

A complete, responsive administration frontend for **Agentic AR**. The production app talks directly to the existing .NET API; it does not contain demo data or a mock login.

Built with strict TypeScript, native browser ES modules, semantic HTML, and CSS. There are **no runtime JavaScript dependencies**. TypeScript 5.8.3 is the only npm development dependency. The UI provides Vietnamese and English labels, a dark sidebar, a light workspace, and real Font Awesome SVG icons.

## Run locally

Use Node.js 22 or newer:

```bash
npm ci
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`. The development script rebuilds on source changes; refresh the browser after a rebuild. Do not open `index.html` directly with `file://`.

`.env` contains **only a public API origin**:

```dotenv
ADMIN_API_BASE_URL=https://ar-agentic-bscygtc7gdf7b4ga.southeastasia-01.azurewebsites.net
```

No account is bundled. Use an existing, active **Admin** account. Login is followed by `GET /api/v1/users/me`; Customer, Employee, inactive, or unidentified accounts cannot enter this portal.

**Backend prerequisites:** deploy the updated BE, apply its `is_active` migration, bootstrap an Admin account, rotate exposed server credentials, and allow the frontend origin in backend CORS. These are not performed by this frontend repository.

For local development, one allowed origin should be exactly `http://localhost:5173`. For a Pages deployment under `https://Kandy2705.github.io/AR-Agentic-Admin/`, the CORS origin is **`https://kandy2705.github.io`**, without a repository path or trailing slash. Never add Supabase service-role keys, Gmail passwords, or chatbot secrets to this frontend.

## Implemented screens

| Route | Capability |
| --- | --- |
| `#/login` | Email/password login, active Admin verification, safe session handling |
| `#/dashboard` | Nine backend counts, recent questions and conversations, independent loading/errors |
| `#/users` and `#/users/:id` | Server pagination, search, role/status filters, profile/role edit, enable/disable |
| `#/buildings` and `#/buildings/:id` | List/search, create/edit/delete, coordinates, optional external map link |
| `#/questions` and `#/questions/:id` | Category filter, CRUD, question details, answer create/edit/delete |
| `#/categories` | Category create/edit/delete and local search/pagination |
| `#/chats` and `#/chats/:id` | System-wide histories, user/date filters, messages, confirmed deletion |
| `#/profile` | Current account and self-service profile editing |
| `#/password` | Request OTP, current/new password, confirmation, sign out after success |

Destructive actions require confirmation. Role changes require a separate confirmation. The UI prevents accidental self-disabling and self-role changes, but these are **not substitutes for server-side protections**, including protection of the last active Admin.

The implementation deliberately does not invent image upload, floor/room management, question workflow statuses, user creation/deletion, token refresh, or analytics endpoints that the backend does not expose.

## Build and checks

```bash
npm run typecheck
npm test
npm run build
npm run preview
```

`dist/` is the deployable static site. Hash routing and relative asset URLs support repository subpaths without server rewrite rules. Only the configured public API origin is emitted into `dist/config.js`; `.env`, tests, fixtures, and backend secrets are not copied into the site.

Optional offline browser integration suite:

```bash
python3 -m pip install -r tests/requirements.txt
python3 -m playwright install --with-deps chromium
npm run build
npm run test:browser
```

These browser tests use isolated, fictional API fixtures and an **offline test-only module harness**. They test UI interactions and payloads, not the deployed Azure service or real account permissions. See [verification details](docs/VERIFICATION.md).

## Deploy

A manual GitHub Pages workflow is included. After merging the implementation to `main`:

1. In repository **Settings -> Pages**, choose **GitHub Actions** as the source.
2. Optionally set repository variable `ADMIN_API_BASE_URL` to the API origin; the workflow otherwise uses the Azure origin above.
3. Add the actual frontend origin to Azure `Cors__AllowedOrigins__N`, and restart/redeploy the backend as needed.
4. Run **Actions -> Deploy Pages (manual) -> Run workflow** on `main`.

Deployment is intentionally **not automatic on push**. This repository does not enable Pages, change Azure/Supabase settings, or deploy the backend. Public static assets do not grant access to private API data; runtime authorization must remain enforced by the backend.

For another static host, publish the contents of `dist/`. Prefer HTTP security headers at the host (including `frame-ancestors 'none'`); the page already has a restrictive meta CSP. After changing the API origin, rebuild so both configuration and CSP are updated.

## Structure

```text
src/api.ts             Endpoint paths, exact wire payloads, envelope/error handling
src/auth.ts            Tab-scoped session, Admin guard, expiry and revalidation
src/types.ts           DTOs derived from the backend source
src/main.ts            Hash router and responsive application shell
src/pages/             Feature screens
src/ui.ts              Safe DOM helpers, forms, dialogs, tables, loading states
src/i18n.ts            Vietnamese/English UI text and formatting
src/icons.ts           Attributed Font Awesome SVG paths (no font files)
public/                HTML, CSS and brand mark
scripts/               Build, local development and static preview
tests/                Unit and offline browser integration tests
docs/                 API contract notes, verification and live checklist
```

See [API contract and limitations](docs/API_CONTRACT.md), [verification and live smoke checklist](docs/VERIFICATION.md), and [third-party attribution](THIRD_PARTY_NOTICES.md).
