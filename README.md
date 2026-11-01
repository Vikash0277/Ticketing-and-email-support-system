# BitMax Ticketing & Email Support System

A production-oriented MERN ticketing platform built for the BitMax Technology MERN internship assignment. Customers raise and track tickets, agents work an assigned queue, admins manage users/categories, and every ticket supports a **two-way email conversation**: outbound notifications leave the system, and replies sent from an email client are converted back into messages on the same web ticket.

---

## Table of contents

- [Feature checklist](#feature-checklist)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Seed accounts and data](#seed-accounts-and-data)
- [Email integration](#email-integration)
- [Attachments and Cloudinary](#attachments-and-cloudinary)
- [API documentation and Postman](#api-documentation-and-postman)
- [API overview](#api-overview)
- [Ticket lifecycle](#ticket-lifecycle)
- [Frontend](#frontend)
- [Security](#security)
- [Tests](#tests)
- [Docker](#docker)
- [Mandatory demo walkthrough](#mandatory-demo-walkthrough)
- [Troubleshooting](#troubleshooting)
- [Known deviations](#known-deviations)
- [Deliverables checklist](#deliverables-checklist)

---

## Feature checklist

| Area | Implemented |
| --- | --- |
| Auth | Registration, email OTP verification, resend OTP with expiry/attempt limits, email + password login, email + OTP login, forgot/reset password, JWT access + rotating refresh tokens, logout, logout-all |
| Sessions | Per-device refresh sessions, session listing, single-session revocation |
| RBAC | `customer`, `agent`, `admin` with route-level authorization and ownership checks |
| Tickets | Create, list/filter/sort/paginate, get, update, assign/reassign, status transitions, resolve, reopen, close, human-readable `TKT-YYYY-NNNNNN` numbers |
| Conversation | Public replies, staff-only internal notes, chronological pagination, attachments, sender role and timestamps |
| Activity timeline | Ticket created, assigned, replied, status changed, resolved, reopened, closed, priority/category changes |
| Dashboard | Role-aware totals, status/priority breakdowns, 14-day trend, recent tickets, admin user totals |
| Notifications | In-app notifications, unread count, mark one/all read |
| Email outbound | Ticket confirmation, assignment/reassignment, agent reply, customer reply, status changes, reusable HTML templates |
| Email inbound | Resend webhook with Svix signature verification, secure `reply-token@domain` threading, duplicate protection, sanitized HTML, reopen on customer reply, dev simulator |
| Email delivery | Resend sends outbound email inline from the API; no Redis or separate worker required |
| Files | Multer validation (max 5 files, 10 MB each), Cloudinary storage with local-disk fallback |
| API quality | Consistent `{ success, message, data, pagination? }` responses, centralized errors, Zod validation, Swagger, Postman |
| Ops | Health/readiness probes, structured request logs, graceful shutdown, Docker Compose |
| Tests | Vitest + Supertest integration suite with in-memory MongoDB |

---

## Tech stack

**Backend:** Node.js 22, Express 5, MongoDB + Mongoose 9, Zod, JWT, bcryptjs, Helmet, express-rate-limit, Multer, Cloudinary, Resend, Svix, Swagger UI, Vitest + Supertest + mongodb-memory-server.

**Frontend:** React 19, Vite, React Router 7, Redux Toolkit (auth/session), Axios, Tailwind CSS 4, lucide-react.

---

## Architecture

```text
React SPA (Vite)
   │  axios + Bearer access token
   │  refresh-on-401 queue
   ▼
Express API  ──►  MongoDB (users, tickets, messages, activities,
   │              categories, notifications, sessions, email events)
   │
   ├──► Resend API (outbound email, sent inline)
   │
   ├──► Cloudinary (attachments) or ./uploads (local fallback)
   │
   └──► POST /api/v1/email/inbound  ◄── Resend webhook (Svix-signed)
            │
            └── reply-<HMAC token>@replies.domain  →  ticket message
```

Every backend module follows the same layering:

```text
routes → validation (Zod) → controller → service → model
                              │
                              ├── activity/notification side effects
                              └── email dispatcher (inline)
```

Key design points:

- **Reply threading never depends on the subject.** Each ticket stores an HMAC reply token hash; outbound mail uses `Reply-To: reply-<token>@EMAIL_REPLY_DOMAIN`. Inbound mail is resolved by the recipient token, and the sender must match the ticket requester (or an authorized participant).
- **Email failures never block ticket operations.** Notifications are best-effort and logged.
- **Email processing is idempotent.** Provider event IDs and email Message-IDs are unique-indexed in `EmailEvent`; duplicates are acknowledged without creating another message.
- **Inbound HTML is sanitized** before it is stored or rendered.

---

## Project structure

```text
bitmax/
├── backend/
│   ├── src/
│   │   ├── app.js                 # middleware, Swagger, /api/v1 + /api mounting
│   │   ├── server.js              # HTTP server + graceful shutdown
│   │   ├── config/                # env schema, logger, Swagger
│   │   ├── database/              # Mongo connection
│   │   ├── middleware/            # auth, validation, upload, rate limits, errors
│   │   ├── modules/
│   │   │   ├── auth/              # register, OTP, login, refresh, sessions, profile
│   │   │   ├── user/              # admin user management
│   │   │   ├── tickets/           # lifecycle, assignment, filters, stats
│   │   │   ├── ticketMessage/     # conversation, internal notes, attachments
│   │   │   ├── ticketActivity/    # audit timeline
│   │   │   ├── categories/
│   │   │   ├── notification/
│   │   │   ├── dashboard/
│   │   │   ├── email/             # templates, provider, outbound, inbound, events
│   │   │   ├── attachments/       # local attachment download
│   │   │   └── health/
│   │   ├── services/              # storage abstraction
│   │   ├── scripts/seed.js
│   │   └── utils/
│   ├── tests/                     # Vitest integration suite
│   ├── vitest.config.js
│   ├── .env.example
│   └── dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/                   # axios client, auth/ticket/resource modules
│   │   ├── components/            # AppLayout + shared UI primitives
│   │   ├── pages/                 # auth, dashboard, tickets, profile, admin
│   │   ├── redux/auth/            # auth slice/service (global session state)
│   │   └── App.jsx                # protected role-based routes
│   ├── Dockerfile
│   └── nginx.conf
├── docs/postman/                  # collection + environment
├── docker-compose.yml
└── README.md
```

---

## Quick start

### Prerequisites

- Node.js 20+ (22 recommended)
- MongoDB running locally (or a connection string)
- A Resend account — optional, enables real email delivery/receipt
- A Cloudinary account — optional, otherwise attachments are stored on local disk

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # Windows: copy .env.example .env
# edit .env with your Mongo URI and secrets
npm run seed -- --reset   # reset dev data and create sample accounts/tickets
npm run dev               # API (nodemon); sends email inline through Resend
```

The API starts on `http://localhost:3000`; Swagger is at `http://localhost:3000/api-docs`.

Useful scripts:

| Script | Purpose |
| --- | --- |
| `npm run dev` | API with nodemon |
| `npm run dev:api` | API only |
| `npm start` | production API |
| `npm run seed -- --reset` | wipe and reseed development data |
| `npm run seed:categories` | safely add default categories without changing users or tickets |
| `npm test` | run the Vitest integration suite |

For a deployed database with no ticket categories, run `npm run seed:categories`
once from the backend service shell. This only inserts missing default
categories; unlike the development seed command, it does not create demo
accounts or tickets and does not reset existing data.

### 2. Frontend

```bash
cd frontend
npm install
# .env already points at the local API
npm run dev
```

Open `http://localhost:5173`.

`frontend/.env`:

```env
VITE_API_URL=http://localhost:3000/api/v1
```

### 3. Sign in

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@bitmax.test` | `Password123!` |
| Agent | `agent@bitmax.test` | `Password123!` |
| Customer | `customer@bitmax.test` | `Password123!` |

> These `.test` addresses are for local demos. To exercise real email delivery, register an account with a real inbox or edit a seeded user's email in MongoDB.

### 4. Local OTPs

When Resend is not configured, OTPs are printed to the backend console:

```text
  LOGIN OTP for customer@bitmax.test: 123456
```

They are also written to the structured logger at `info` level.

---

## Environment variables

Copy `backend/.env.example` to `backend/.env`. Never commit `.env`.

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | no | API port, default `3000` |
| `NODE_ENV` | no | `development` \| `test` \| `production` |
| `API_BASE_URL` | no | Public API base used in Swagger and email links |
| `FRONTEND_URL` | no | Frontend origin used for CORS and reset links |
| `MONGODB_URI` | **yes** | MongoDB connection string |
| `JWT_ACCESS_SECRET` | **yes** | Access-token signing secret |
| `TOKEN_HASH_SECRET` | **yes** | Refresh-token/session hashing secret |
| `ACCESS_TOKEN_TTL` | no | Access-token lifetime, default `15m` |
| `REFRESH_TOKEN_TTL_DAYS` | no | Refresh-token lifetime, default `7` |
| `RESEND_API_KEY` | no | Enables outbound email |
| `EMAIL_FROM` | no | Sender, e.g. `"BitMax Support" <support@yourdomain.com>` |
| `EMAIL_REPLY_DOMAIN` | no | Receiving domain configured in Resend, e.g. `viegoxo.resend.app` |
| `EMAIL_REPLY_TOKEN_SECRET` | no | HMAC secret for reply addresses (falls back to `TOKEN_HASH_SECRET`) |
| `RESEND_WEBHOOK_SECRET` | no | Svix signing secret for the inbound webhook |
| `CLOUDINARY_CLOUD_NAME` | no | Enables Cloudinary when all three are set |
| `CLOUDINARY_API_KEY` | no | |
| `CLOUDINARY_API_SECRET` | no | |
| `CLOUDINARY_FOLDER` | no | Default `bitmax-tickets` |
| `LOG_LEVEL` | no | `http`, `info`, `error`, ... |

Generate strong secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## Seed accounts and data

`npm run seed -- --reset` deletes development data and creates:

- 3 users (admin, agent, customer) with password `Password123!`
- 5 categories: Billing, Technical, Account, Feature Request, General
- 3 sample tickets with messages and activity history
- Reset ticket counter so numbering starts at `TKT-<year>-000001`

Without `--reset`, the script upserts accounts/categories and leaves existing tickets intact.

---

## Email integration

Email threading activates only when **all** of these are set:

```env
RESEND_API_KEY=re_...
EMAIL_FROM="BitMax Support" <support@yourdomain.com>
EMAIL_REPLY_DOMAIN=viegoxo.resend.app
```

### Outbound

Sent automatically by the API through Resend:

- Ticket created → confirmation to the requester
- Ticket assigned/reassigned → notification to the agent
- Staff public reply → notification to the requester
- Customer reply → notification to the assignee (or support inbox)
- Status changed to resolved/closed/reopened → notification to the requester
- Manual staff email via `POST /api/v1/email/outbound`

Each email contains the ticket number and subject. Outbound `Reply-To` uses:

```text
reply-<58-char-hmac-token>@viegoxo.resend.app
```

The token is derived from the ticket ID and an HMAC secret; only its SHA-256 hash is stored on the ticket.

### Inbound (Resend)

1. Add and verify your domain in Resend.
2. Configure the domain's **MX record** to point at Resend's inbound servers and set `EMAIL_REPLY_DOMAIN` (for the Resend-provided domain, use `viegoxo.resend.app`).
3. Create a webhook for the `email.received` event:
   - URL: `https://your-api-host/api/v1/email/inbound`
   - Copy the Svix signing secret into `RESEND_WEBHOOK_SECRET`.
4. Ensure the raw request body reaches the API unchanged (the app captures `req.rawBody` before JSON parsing; nginx proxies `/api/` unchanged).

Inbound flow:

1. Svix signature, timestamp and event ID are verified.
2. The `email.received` payload is fetched from Resend.
3. The recipient `reply-token@domain` is matched against `Ticket.emailReplyTokenHash`.
4. The sender must be the ticket requester (or an authorized participant).
5. Quoted history is trimmed where possible, HTML is sanitized, and a `TicketMessage` with `source: "email"` is stored.
6. If the ticket is `resolved`/`closed`, the customer reply reopens it.
7. The event is recorded in `EmailEvent`; duplicates are ignored by provider event ID / Message-ID.
8. Failures are logged with the provider event ID and return a safe response so Resend can retry.

### Development simulator

Without a live inbound domain you can inject an email-shaped reply:

```http
POST /api/v1/email/inbound/simulate
Authorization: Bearer <agent-or-admin-token>
Content-Type: application/json

{
  "ticketId": "<ticket-id>",
  "from": "customer@bitmax.test",
  "subject": "Re: Cannot sign in",
  "text": "The problem is back after the reset.",
  "messageId": "<manual-test-1@bitmax.test>"
}
```

It uses the same processor as the real webhook and is disabled in production.

### Delivery behavior

- Outbound ticket email is sent inline by the API through Resend; Redis and a separate worker are not required.
- If Resend sending fails, the email event is marked failed and logged. Ticket creation/reply still succeeds, so inspect Email Events and retry the email after resolving the provider/configuration issue.
- Email failures are logged and never roll back a ticket operation.

---

## Attachments and Cloudinary

- Max 5 files per request, 10 MB each.
- Allowed types include images (png/jpeg/gif/webp), PDF, plain text, CSV and ZIP.
- With all `CLOUDINARY_*` values set, files go to Cloudinary and the stored URL is returned.
- Otherwise files are written to `backend/uploads/` and served through `GET /api/v1/attachments/local/:key` with Bearer authentication and ticket-ownership checks.
- Cloudinary failures fall back to local disk automatically.
- Ticket attachments live on the first `TicketMessage` (the description); message replies can add their own.

---

## API documentation and Postman

- **Swagger UI:** `http://localhost:3000/api-docs` (also `/api/docs`)
- **OpenAPI JSON:** served by Swagger UI from `backend/src/config/swagger.js`; annotations live next to each route.
- **Postman:** import both files from `docs/postman/`:
  - `BitMax-Ticketing.postman_collection.json`
  - `BitMax-Ticketing.postman_environment.json`

Postman flow: run **Auth → Login (password)** first; tokens and the user ID are captured automatically. Then **Categories → List categories** captures `categoryId`, **Tickets → Create ticket** captures `ticketId`, and the rest of the folders reuse those variables. Use **Users → List agents** to populate `agentId` before assigning.

All endpoints exist under both `/api/v1` and `/api`. The Postman environment and frontend use `/api/v1`.

---

## API overview

Base URL: `http://localhost:3000/api/v1`

### Auth

| Method | Endpoint | Notes |
| --- | --- | --- |
| POST | `/auth/register` | Creates a customer and sends an email OTP |
| POST | `/auth/verify-otp` | Verifies registration OTP |
| POST | `/auth/resend-otp` | Resends registration OTP |
| POST | `/auth/login-password` | Returns access + refresh tokens |
| POST | `/auth/login-otp` | Requests an email login OTP |
| POST | `/auth/verify-login-otp` | Signs in with the OTP |
| POST | `/auth/refresh-token` | Rotates the refresh token |
| POST | `/auth/logout` | Revokes one refresh token |
| POST | `/auth/logout-all` | Revokes all sessions (auth) |
| POST | `/auth/forgot-password` | Sends a reset link |
| POST | `/auth/reset-password` | Resets with a token |
| GET/PATCH | `/auth/me` | Read/update profile (auth) |
| POST | `/auth/change-password` | Change password (auth) |
| GET | `/auth/sessions` | List sessions (auth) |
| DELETE | `/auth/sessions/:sessionId` | Revoke a session (auth) |

### Tickets and conversation

| Method | Endpoint | Notes |
| --- | --- | --- |
| GET | `/tickets` | Filters: `status`, `priority`, `categoryId`, `assignedTo`, `requesterId`, `search`, `tags`, `dateFrom`, `dateTo`, `view` (`all\|mine\|unassigned\|overdue`), `sortBy`, `sortOrder`, `page`, `limit` |
| POST | `/tickets` | JSON or multipart with `attachments` |
| GET | `/tickets/stats` | Role-scoped counts |
| GET | `/tickets/:id` | Ownership enforced |
| PATCH | `/tickets/:id` | Metadata; priority/category are staff-only |
| PATCH | `/tickets/:id/assign` | Staff; `assignedTo` or `null` |
| PATCH | `/tickets/:id/status` | State-machine transition |
| POST | `/tickets/:id/resolve` | Resolve with optional note |
| POST | `/tickets/:id/reopen` | Reopen resolved/closed |
| POST | `/tickets/:id/close` | Close |
| POST | `/tickets/:ticketId/messages` | Public reply or internal note (staff only) |
| GET | `/tickets/:ticketId/messages` | Paginated conversation |
| GET | `/tickets/:ticketId/messages/:messageId` | Single message |
| GET | `/tickets/:ticketId/messages/:messageId/attachments/:attachmentId` | Download |
| GET | `/tickets/:ticketId/activities` | Audit timeline (`/activity` alias) |
| GET | `/tickets/:ticketId/activities/:activityId` | Single activity |

### Other

| Method | Endpoint | Notes |
| --- | --- | --- |
| GET | `/categories` | Active categories; `includeInactive` for staff |
| POST/PATCH/DELETE | `/categories...` | Admin only |
| GET | `/dashboard/summary` | Role-aware dashboard (`/dashboard/stats` alias) |
| GET | `/notifications` | Current user's notifications |
| GET | `/notifications/unread-count` | Unread count |
| POST | `/notifications/:id/read` | Mark one read |
| POST | `/notifications/read-all` | Mark all read |
| GET | `/users` | Admin directory; agents see limited data |
| GET | `/users/agents` | Assignment picker (staff) |
| GET | `/users/stats` | Admin totals |
| POST/PATCH/DELETE | `/users...` | Admin only; role/status endpoints included |
| POST | `/email/inbound` | Resend webhook (Svix verified) |
| POST | `/email/inbound/simulate` | Dev simulator (staff) |
| POST | `/email/outbound` | Manual staff email |
| GET | `/email/events` | Email audit log (staff) |
| GET | `/health`, `/health/ready` | Liveness/readiness |

**Response shape**

```json
{
  "success": true,
  "message": "Tickets fetched successfully",
  "data": [],
  "pagination": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 }
}
```

Errors use `{ success: false, message, errors? }` with appropriate status codes (`400`, `401`, `403`, `404`, `409`, `429`, `500`).

---

## Ticket lifecycle

```text
             ┌──────────── reopen ────────────┐
             ▼                                │
 open ──► in_progress ──► pending ──► resolved ──► closed
   │            │             │           │          │
   └────────────┴─────────────┴───────────┘          │
                    (staff transitions)              │
                                                     │
 customer email/web reply on resolved/closed ──► reopened
```

- New tickets start as `open`.
- Staff can move through `open → in_progress → pending → resolved → closed`.
- Resolve/reopen/close are also available as dedicated POST actions.
- A customer reply to a resolved/closed ticket reopens it (`reopened`).
- Every transition writes a `TicketActivity` entry with actor, old value, new value and metadata.
- Invalid transitions return `400` with a descriptive message.

---

## Frontend

| Route | Access | Page |
| --- | --- | --- |
| `/login`, `/register`, `/verify-otp`, `/forgot-password`, `/reset-password` | public | Auth flow |
| `/dashboard` | any authenticated | Role-aware dashboard |
| `/tickets` | any authenticated | My Tickets / All Tickets |
| `/tickets/new` | any authenticated | Create ticket |
| `/tickets/:id` | owner or staff | Conversation, metadata, assignment, status, timeline |
| `/profile` | any authenticated | Profile and password |
| `/notifications` | any authenticated | Notifications |
| `/admin/users` | admin | User management |
| `/admin/categories` | admin | Category management |

Implementation notes:

- A single Axios client attaches the access token, retries once after a queued refresh on `401`, and clears the session on refresh failure.
- Redux Toolkit is used for **auth/session state only** (user, tokens, login/OTP flags). Ticket lists, conversations, dashboard data and admin tables use API modules plus local component state. This keeps server data fresh per page, avoids a global cache that goes stale after every reply/status change, and avoids thunk/boilerplate overhead for data that is not shared across the app. Global shared state (who is signed in, what role they have) is exactly what Redux is good at.
- Route guards check both authentication and role; unauthorized users are redirected.
- Loading, empty, success and error states are implemented for the major screens.
- Responsive layout: collapsible sidebar/top bar, stacked ticket metadata, mobile-friendly conversation composer.

---

## Security

- bcrypt password hashing (cost 10 in app, lower in tests).
- Short-lived JWT access tokens; refresh tokens are random, hashed at rest, rotated on use, and revoked on logout.
- OTPs are hashed, expire, and have attempt limits; resend is rate-limited.
- Helmet, strict CORS allow-list, request IDs, Mongo operator sanitization.
- Zod validation on bodies, params and query strings; text is trimmed and HTML email is sanitized.
- Rate limits on auth, OTP, password reset, ticket creation and the API generally.
- Ownership checks on every ticket, message, attachment and notification operation.
- Internal notes are filtered out of customer responses.
- Inbound webhook requires a valid Svix signature; replay/duplicate events are rejected by unique event/message IDs.
- Attachment type/size validation; local files require authentication.
- Secrets live in `.env` (gitignored); no secrets are shipped to the frontend.
- Admin user/category changes are recorded in logs/activity where applicable.

---

## Tests

```bash
cd backend
npm test
```

The suite (`backend/tests/api.test.js`) uses Vitest + Supertest and an in-memory MongoDB (`mongodb-memory-server`, using the installed system binary when available). It covers 44 checks:

- Health and `/api` alias
- Login, refresh rotation/reuse rejection, logout, profile update, invalid OTP
- RBAC for categories and users
- Ticket creation/numbering, filtering, cross-customer access denial, assignment, replies, internal-note hiding, priority permissions, resolve/close/reopen, activity timeline, stats
- Attachment upload/download/auth
- Notifications and unread counts
- Dashboard scoping for customer vs admin
- Inbound email simulator, email events, customer denial
- 404 and validation error shapes

Frontend checks:

```bash
cd frontend
npm run lint
npm run build
```

---

## Docker

```bash
# from the repository root
docker compose up --build
```

Services:

| Service | URL / role |
| --- | --- |
| `backend` | `http://localhost:3000` (API + Swagger) |
| `frontend` | `http://localhost:8080` (nginx, proxies `/api/` and `/api-docs`) |
| `mongo` | internal `mongo:27017`, persisted volume |

Notes:

- `docker-compose.yml` reads `backend/.env` for secrets.
- The frontend is built with `VITE_API_URL=/api/v1` so nginx proxies API calls to the backend container.
- Seed inside Docker if needed:

```bash
docker compose exec backend npm run seed -- --reset
```

---

## Mandatory demo walkthrough

1. **Register and verify OTP** — open `/register`, submit name/email/password, read the OTP from the backend console (or your inbox), verify.
2. **Log in from the frontend** — sign in with the seeded customer or a newly verified account.
3. **Create a ticket** — choose category and priority, attach a file, submit; note the `TKT-YYYY-NNNNNN` number.
4. **Confirm the requester email** — with Resend configured, the requester receives the confirmation email (otherwise the attempt is logged).
5. **Agent/Admin sees the ticket** — sign in as `agent@bitmax.test` or `admin@bitmax.test`, open **All Tickets**.
6. **Assign the ticket** — open the ticket, choose an agent, save; the activity panel records the assignment.
7. **Reply from the web** — post a public reply; the requester receives the reply email.
8. **Reply from an email client** — reply to the notification. The `Reply-To` address contains the ticket token.
9. **Verify the inbound message** — refresh the ticket; the email appears as a new customer message in the same conversation.
10. **Resolve the ticket** — use Resolve; status becomes `resolved`, activity is recorded.
11. **Reply again from email** — the ticket automatically moves to `reopened`, with a new message and activity entry.
12. **Close and inspect history** — close the ticket and show the full activity timeline, then demonstrate role restrictions (customer cannot assign, change priority, manage users/categories, or read another customer's ticket).

**No live email domain?** Use **Postman → Email → Simulate inbound reply** (or `POST /email/inbound/simulate` as an agent/admin). It exercises the same processor as the real webhook.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Invalid environment configuration` | Copy `.env.example`, fill `MONGODB_URI`, `JWT_ACCESS_SECRET`, `TOKEN_HASH_SECRET` |
| Mongo connection refused | Start MongoDB or update `MONGODB_URI` |
| OTP not received | Check backend console; configure Resend for real delivery |
| Email not threaded | `RESEND_API_KEY`, `EMAIL_FROM` and `EMAIL_REPLY_DOMAIN` must all be set |
| Webhook returns 401 | `RESEND_WEBHOOK_SECRET` must match the Resend webhook signing secret |
| Webhook returns 400/500 | Verify the raw body is not modified by a proxy; check logs with the provider event ID |
| Attachments stored locally | Expected without Cloudinary credentials; local URLs require Bearer auth |
| Frontend gets CORS errors | Add the frontend origin to `FRONTEND_URL` or use the documented dev ports |
| Tests fail to start MongoDB | Install MongoDB locally or let `mongodb-memory-server` download a binary |

---

## Known deviations

- **Email OTP only.** The assignment also lists phone OTP login/verification. Per the project decision for this build, phone is an optional profile field and phone OTP/SMS is intentionally not enabled. Email OTP covers registration, login and resend flows.
- Seed accounts use `@bitmax.test`; use real inboxes for live email demos.
- Socket.IO real-time updates are not implemented; the web conversation refreshes on navigation/actions and the assignment marks real-time as optional.
- Live Resend inbound and Cloudinary uploads require account-specific credentials in `backend/.env`; local fallbacks and the simulator keep the whole flow demonstrable without them.

---

## Deliverables checklist

- [x] Complete frontend source code
- [x] Complete backend source code
- [x] MongoDB schema/models
- [x] `README.md` with setup and architecture
- [x] `.env.example`
- [x] Postman collection + environment
- [x] Swagger/OpenAPI docs
- [x] Database seed/sample data
- [x] Reusable HTML email templates
- [x] Integration tests
- [x] Docker + Docker Compose
- [ ] Screenshots or demo video — record locally during the walkthrough above
