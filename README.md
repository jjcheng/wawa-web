# WAWAGO CRM Portal

Web portal for **WAWAGO** — a CRM integrated with WhatsApp Business. It is a
Next.js App Router front end for the `wawa-go` API.

## Requirements

- Node.js 20+
- A running `wawa-go` API (default `http://localhost:9000`)

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

## Environment variables

| Variable | Purpose |
| --- | --- |
| `API_BASE_URL` | Base URL of the wawa-go API |
| `SESSION_COOKIE_NAME` | Session cookie issued by the API (`wawa_session`) |
| `NEXT_META_APP_ID` | Meta app ID used by Embedded Signup |
| `NEXT_META_EMBEDDED_SIGNUP_CONFIG_ID` | Meta login configuration ID |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps key with Places API enabled for broadcast locations |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key rendered on the login page |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret key used to verify tokens server-side |

### Authentication header

The API now authenticates requests with the `x-user-access-token` header instead of relying
on the session cookie alone. The portal still stores the token in its own `wawa_session`
cookie for same-origin routing, but every upstream request includes the active token in the
new header, while keeping the older `x-user-access-token` name as a compatibility fallback.

## Architecture

- **BFF proxy** — the browser never talks to the API directly. Requests go to
  `/api/bff/<upstream path>`, which forwards them server-side with the `x-user-access-token`
  header (and compatibility fallback) and the portal cookie when present. Only paths on the
  allow-list in `src/lib/api/allowlist.ts` are forwarded, so the route cannot be used as an open
  proxy.
- **Sessions** — the API issues an access token via `x-user-access-token`. Login is a Server
  Action that re-issues the token onto the portal's own origin via the `wawa_session` cookie.
  `src/proxy.ts` does a cheap cookie-presence redirect; `requireUser()` performs the real check
  against `/auth/v1/me`. A stale token is cleared by `/session/end`.
- **Data fetching** — server components use `serverFetch()`; client components use
  `apiFetch()` through TanStack Query.
- **Time zone** — all user-visible timestamps render in US Eastern (`America/New_York`)
  via `src/lib/format.ts`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm run format` | Prettier write |

## Status

Auth, dashboard, WhatsApp phone numbers, Embedded Signup onboarding and settings
are wired to the live API. Contacts, Conversations and Broadcasts are UI previews backed by
mock data until the corresponding API endpoints exist.

# https://localhost
## in macos terminal
brew install mkcert
mkcert -install

## in project terminal
mkcert localhost 127.0.0.1 ::1