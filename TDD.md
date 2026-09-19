# Technical Design Document — Family Photo Gallery

**Status:** Pre-implementation — this document reflects the agreed design, not built/verified behavior.
**Related docs:** `CLAUDE.md` (guidance for Claude Code sessions), `ARCHITECTURE.md` (diagrams, Mermaid source).

## 1. Problem statement

Family members need a single web address where they can view shared family photos. There are no traditional user accounts — instead, a lightweight gate asks a visitor's name, an admin approves or denies that specific device, and approved devices stay trusted on future visits. An admin needs a separate, properly authenticated dashboard to upload, update, and delete photos, with changes reflected on the public gallery immediately.

## 2. Goals

- A visitor can reach the gallery only after an admin explicitly approves their device.
- Approval is per-device and persistent: an approved visitor does not re-request access on every visit.
- An admin can revoke a previously approved device at any time, taking effect immediately.
- An admin can add, update, and delete photos through a dashboard; the public gallery reflects changes without a deploy.
- The system runs entirely on managed, free-tier-friendly infrastructure — no server for the family to maintain.

## 3. Non-goals (for v1)

- Visitor accounts with passwords, email verification, or self-service signup.
- Fine-grained per-photo permissions (all approved visitors see the same gallery).
- Native mobile apps — the web app must be responsive, not platform-native.
- Photo editing (crop/filter) — only upload, caption/album metadata, and delete.

## 4. High-level design

Two roles, one Next.js application:

- **Visitor**: gate page (name entry) → waiting screen (live) → gallery (grid + lightbox), gated by a signed device cookie.
- **Admin**: `/admin` behind Supabase Auth login → pending-requests queue (approve/deny/revoke) → photo management (upload/edit/delete).

Both roles talk only to the Next.js app; the app is the sole holder of privileged credentials (Supabase service role key). See `ARCHITECTURE.md` Fig. 01 for the component diagram and Fig. 02/03 for the two end-to-end flows.

### 4.1 Access control model

Visitor trust is **not** identity — it's a per-device grant:

1. First visit creates an `access_requests` row (`status = pending`) plus an anonymous, unsigned device cookie.
2. Admin approves → an `approved_devices` row is created (`token_hash`) and the visitor's cookie is upgraded to a signed JWT (httpOnly, secure, SameSite=Lax).
3. Every subsequent request is authorized by validating the JWT **and** checking `approved_devices.revoked_at IS NULL` server-side — so a revoke takes effect on the visitor's very next request, not just on next login.
4. Admin trust is separate and stronger: real credentials via Supabase Auth, required for every `/admin` route and every mutating API route.

### 4.2 Realtime updates

Both the visitor's "waiting for approval" screen and the admin's pending-requests queue subscribe to Postgres changes on `access_requests` via Supabase Realtime — no polling. The public gallery re-fetches on mount and can optionally subscribe to `photos` changes so an admin edit appears without a manual refresh.

## 5. Data model

| Table | Key fields | Notes |
|---|---|---|
| `access_requests` | `id, name, status (pending\|approved\|denied), device_cookie_id, created_at, decided_at, decided_by` | One row per name submitted at the gate. |
| `approved_devices` | `id, access_request_id, token_hash, created_at, revoked_at` | Trust record behind the visitor's JWT cookie; `revoked_at` is the kill switch. |
| `photos` | `id, album_id (nullable), storage_path, thumbnail_path, caption, uploaded_at, uploaded_by` | Points at two Storage objects (original + thumbnail). |
| `albums` *(optional, v1.1)* | `id, name, cover_photo_id, created_at` | Grouping only; not required to ship v1. |
| `admin_users` | managed by Supabase Auth | No custom table. |

All tables have Row-Level Security enabled with no public policies — every read/write goes through Next.js API routes using the service role key, never directly from the browser.

## 6. API surface (Next.js route handlers)

| Route | Auth | Purpose |
|---|---|---|
| `POST /api/access-requests` | none (rate-limited) | Create a pending request for the current device. |
| `GET /api/access-requests/me` | device cookie | Poll/initial-load status for the waiting screen (Realtime handles live updates). |
| `GET /api/admin/access-requests` | admin session | List pending/approved/denied requests. |
| `POST /api/admin/access-requests/:id/approve` | admin session | Approve; creates `approved_devices` row and mints the visitor JWT. |
| `POST /api/admin/access-requests/:id/deny` | admin session | Deny. |
| `POST /api/admin/devices/:id/revoke` | admin session | Set `revoked_at`; immediately invalidates that visitor's session. |
| `GET /api/gallery/photos` | approved visitor cookie or admin session | List photos (+ signed Storage URLs). |
| `POST /api/admin/photos` | admin session | Upload photo; validates type/size, generates thumbnail via `sharp`, writes Storage + DB row. |
| `PATCH /api/admin/photos/:id` | admin session | Update caption/album. |
| `DELETE /api/admin/photos/:id` | admin session | Delete Storage objects, then DB row. |

## 7. Security considerations

- `POST /api/access-requests` is the one endpoint an unauthenticated stranger can hit — rate-limit by IP and/or cookie to prevent spam/enumeration.
- Visitor JWT: httpOnly, secure, SameSite=Lax, short-enough expiry with silent renewal while `approved_devices.revoked_at IS NULL`; server re-checks the DB row on every request rather than trusting the token alone.
- Admin routes check the Supabase Auth session server-side in every route handler, not only in UI rendering.
- Photo upload validates MIME type and size before invoking `sharp`, to avoid processing arbitrary/oversized files.
- Storage objects are served via signed, time-limited URLs, not public buckets.

## 8. Deployment

- **Frontend + API**: Vercel, deployed from the `main` branch; environment variables for Supabase URL/keys and the JWT signing secret set in Vercel project settings (never committed).
- **Data/storage/auth**: a single Supabase project (dev and prod as separate Supabase projects if budget allows, otherwise one project with care around test data).
- **Domain**: custom domain pointed at Vercel; HTTPS via Vercel's automatic certificates.

## 9. Alternatives considered

| Decision | Chosen | Alternative | Why not the alternative |
|---|---|---|---|
| Visitor re-approval | Persistent per-device approval | Re-approve every visit | Rejected — too much friction for repeat family visitors; explicitly decided against. |
| Hosting | Vercel + Supabase (managed) | Self-hosted VPS (Node + Postgres) | Rejected — more ops burden for no scale benefit at family size; explicitly decided against. |
| Backend | Next.js API routes | Separate Express/Node service | Unnecessary second deployable for this scope; one codebase is simpler to operate. |
| DB | PostgreSQL (Supabase) | MongoDB | Data is naturally relational (requests/devices/photos/albums); RLS gives a clean security boundary. |

## 10. Open questions (non-blocking)

- Albums/dates/sorting in v1, or flat gallery first?
- Can approved visitors download originals, or view-only?
- Automatic expiry on approvals, or manual revoke only?

## 11. Rollout plan

See `CLAUDE.md` for the phased build order (scaffold → schema → admin auth → photo management → public gallery → access-gate flow → admin approval UI → hardening → polish → deploy).
