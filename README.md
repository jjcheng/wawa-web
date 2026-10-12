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

### Authentication header

The API now authenticates requests with the `x-user-access-token` header instead of relying
on the session cookie alone. The portal still stores the token in its own `wawa_session`
cookie for same-origin routing, but every upstream request includes the active token in the
new header, while keeping the older `x-user-access-token` name as a compatibility fallback.

## Architecture

Error toasts remain open until dismissed. Their **Close all errors** button
dismisses all error toasts at once while leaving other notifications open.

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

### Chat message updates

The Chats list shows a red dot at the right edge when a customer's
`latest_message_read` is `false`, including after refresh and pagination.
Realtime incoming messages update this flag. Clicking an unread customer calls
`POST /v1/wa/messages/mark-read?customer_id={id}` and clears the dot after success.
Failed requests leave the dot visible and show an error.
Incoming messages for the currently open customer keep the dot hidden and restart
a five-second debounce. After five seconds without another incoming message for
that customer, the same mark-read API is called. Pending timers are cancelled when
switching customers or leaving the list.
Successful mark-read requests acknowledge the current notification batch, so a
pending retry cannot mark the same batch twice.
Mark-read requests only run for the currently open customer; no request is sent
when no customer is selected in the conversation panel.
The matching conversation panel must be visible in the active tab; a stale
customer ID in the URL or a panel hidden on mobile does not trigger mark-read.
The side menu and bottom tab bar Chats items show a red dot while any customer has
unread messages. It is seeded from the first page of active customers, set by
incoming realtime messages, kept in sync with the Chats list, and cleared once all
known unread customers are marked read.

In the Chats Inactive list, selecting one or more customers exposes a danger-colored
Delete action. After confirmation, it calls `DELETE /v1/customers` with `{ ids }`
and removes the selected customers after success.

FAILED messages have a Delete action in their right-click menu. It calls
`DELETE /v1/wa/messages/{id}` and removes the message only after success;
failed requests display an error and leave the message available for retry.

Outgoing realtime messages (`sending=true`) update the customer's latest-message
preview and timestamp and move the customer up the Chats list, without adding an
unread indicator or an incoming-message toast.

Realtime edit notifications update the original received message and show `edited`
beside its timestamp. Revoke notifications replace the original displayed content
with muted `Message deleted` text while retaining its timestamp. Both updates
also apply when the original is loaded later through pagination or reconnect.
Media edits with an unchanged media ID retain the existing URL and viewer state,
so caption changes do not trigger another media lookup or download.
Sent messages show double green ticks if their current status or any entry in
`statuses` is `READ` (case-insensitive), even if a later status reports failure.
Once read, subsequent realtime status notifications cannot downgrade the message.

Chat pagination keeps its numeric page counter independent of the optional API
page count. An empty older-message response stops pagination without assigning
the API page count to the counter.

Image, video, audio, and document uploads use `POST /v1/wa/media` with
`to_meta=true`. The returned `id` is sent in the message's media object instead
of a `link`; captions and document filenames are preserved.

Media with a nonempty `attachment_url` displays automatically when messages load,
without an ID-based lookup. Other media loads only after the user clicks its
attachment button, including media in realtime messages.
Otherwise, attachments with a media object ID resolve their display/download URL through
`GET /v1/wa/media?message_id={message.id}&wa_media_id={media.id}`.
ID-based lookup takes precedence over media links, but not `attachment_url`.
Attachments without an ID use their media link after the button is clicked.

Sticker placeholders use the normal message bubble styling; downloaded stickers
display without a bubble background or border.

### Chat attachment checks

Images retain the PNG/JPG/JPEG file-type check, but their encoding, color mode,
bit depth, and progressive format are not inspected.

Images and videos are uploaded unchanged, without compression. Images have a
5 MB size limit and videos a 16 MB size limit, checked during selection and before upload.
Video attachments are inspected locally
for an MP4/3GP container, H.264 video, and at most one AAC audio stream. Audio
attachments are checked for AAC, AAC in MP4, AMR, MP3, or Opus in Ogg.
Checks run during selection and again before upload. MediaInfo runs entirely in
the browser; files are not sent to an inspection service. `npm install`/`npm ci`
copies its browser bundle, WASM module, and license into the generated `public/media-info/` directory
via `scripts/prepare-media-info.mjs`.

### Business agent API routes

Phone-number-scoped business agent requests use
`/v1/wa/phone-numbers/{id}/business-agent/...`, with the local phone number ID in
the path rather than a `phone_number_id` query or body field. This includes
status, onboarding/offboarding, eligibility, business info, FAQs, files, websites,
skills/common skills, UI skills, settings, schedules, test chat, and connectors.
Account-wide budgets and customer-scoped pass-control retain
`/v1/wa/business-agent/budgets` and `/v1/wa/business-agent/pass-control`.
The API must expose the migrated routes before these screens can be used.

### AI agent websites

An AI agent profile's **Websites** page lists the websites returned by
`GET /v1/ai-agent/profiles/{id}/websites`, including added times and optional
excluded patterns. Select a website to open **Crawled pages** at
`/ai-agent/profiles/{profileId}/websites/{websiteId}`.
Empty arrays and missing or null website data show the empty-list state.
**Add website** opens a dialog and submits `profile_id`, `url`, and optional
`include_patterns` and `exclude_patterns` to `POST /v1/ai-agent/profiles/{id}/websites`.
Enter one pattern per line; blank lines are ignored and empty pattern fields
are omitted. Use full URLs in Include patterns to crawl only those specific
pages. Successful additions refresh the list; failed
requests keep the dialog input and show the API errors for retry.
This page shows the crawl status, finished/total counts, and each page's title,
URL, and status from `GET /v1/ai-agent/websites/{id}?cursor=0&limit=30`.
Statuses are plain text labels, with `Error` shown in the danger text color.
Selecting a crawled-page row opens a dialog
rendering that record's `markdown` with `react-markdown` and `remark-gfm`,
including tables, task lists, and strikethrough. Raw HTML is disabled and the
renderer filters unsafe link protocols. The content scrolls within the dialog,
with a Close button in the footer. Records without content show an explicit
empty state.
The title row shows **Cancel** while the website status is `RUNNING`, using
`POST /v1/ai-agent/websites/{id}/cancel` and refreshing crawl progress on success.
Otherwise it shows **Delete**, with a confirmation dialog. Deletion uses
`DELETE /v1/ai-agent/websites/{id}` and returns to the profile's website list.
When the response cursor is positive, **Load more** appends the next batch using
that cursor and the same limit. Failed requests preserve the list for retry.
These pages follow the same master-user access and feature gate as the other
AI agent profile pages.

### Business agent connectors

On a phone number's **Business agent > Connectors** page, **Add connector** opens
a dedicated page at `/assets/phone-numbers/{id}/business-agent/connectors/new`.
It submits configuration to `POST /v1/wa/phone-numbers/{id}/business-agent/connectors`
through the BFF proxy, then returns to the connector list.
Connector names are automatically lowercased, spaces and dashes become underscores, unsupported
characters are removed, and leading digits are stripped. Names allow only letters,
numbers, and underscores and cannot start with a number.
The form supports OAuth 2.0 client credentials, API key parameters in headers/query/body, or **None** authentication
(which omits `auth_config` entirely), optional mTLS certificates,
and optional user-authentication injection. IDs, sync/connection status, and
certificate metadata are supplied by the API, not sent during creation or updates.
Description is required. Connector protocol is limited to HTTP or MCP; changing
protocol does not change any other fields or show additional panels.
`mcp_tool_sync` is not included in submitted configuration.
Selecting a connector opens `/assets/phone-numbers/{id}/business-agent/connectors/{connector_id}/edit`,
prefilled from the array returned by the connector list API. Saving uses
`PUT /v1/wa/phone-numbers/{id}/business-agent/connectors/{connector_id}`.
The connector list uses the same searchable, divided-row layout as Phone numbers,
with an icon, name, description, and connection status, and no column headers.
An empty state is shown when no connectors match.
If the API omits credentials or certificates, re-enter the required values before
saving. Failed requests preserve the form for correction or retry.

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