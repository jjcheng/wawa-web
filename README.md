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
| `npm run dev:vinext` | Start the Vinext dev server on port 3001 |
| `npm run build:vinext` | Build the Cloudflare Workers output |
| `npm run start:vinext` | Run the built Worker locally with Wrangler |
| `npm run deploy:vinext` | Deploy the built Worker to Cloudflare |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm run format` | Prettier write |

## Cloudflare Workers

This app can run on Cloudflare Workers through Vinext. The standard Next.js scripts still
work for local development and Node-style builds; the Vinext scripts are the Cloudflare
deployment path.

```bash
npm run build:vinext
npm run start:vinext
npm run deploy:vinext
```

Set the same environment variables in Cloudflare as in `.env.local`. `API_BASE_URL` must
be reachable from Cloudflare over HTTPS. For customer storefront domains, route the portal
Worker for the relevant hostnames so `src/proxy.ts` and the public website loader can use
the incoming host to resolve the website.

Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` as a **build variable** in Workers Builds. Vinext
embeds `NEXT_PUBLIC_*` values into browser assets at build time, so adding it only as a
Worker runtime variable will not enable Google Places in the deployed UI.

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

Start the HTTPS development server with the generated certificate pair:

```bash
make local-ssl
```