# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Implemented (v1) with Next.js + Supabase, not yet deployed. `npm run build` and `npm run lint` pass. The app has not been exercised against a live Supabase project in this environment — see `README.md` for setup steps before running it for real.

## What this project is

A family photo gallery, gated by a name-request/admin-approval flow instead of traditional user accounts:

1. A visitor opens the domain and is shown a gate page asking for their name and email.
2. Submitting the form creates a pending access request (keyed by email — see below) and sets an (untrusted) device cookie.
3. The visitor sees a "waiting for approval" screen that updates live (Supabase Realtime) when the admin acts.
4. The admin approves or denies from a separate `/admin` dashboard, which shows the requester's name and email.
5. On approval, the visitor's device cookie is upgraded to a signed, long-lived JWT — **the device stays approved on future visits** (no re-request each time), until the admin explicitly revokes it.
6. Once approved, the visitor can browse the photo gallery (grid + lightbox); the admin manages photos (upload/update/delete, thumbnail generation) from the admin dashboard, and changes reflect immediately on the public gallery.

Key decision: approval is keyed by **email**, and per-email trust is persistent and admin-revocable — not a one-time gate and not a full username/password system for viewers. `access_requests` has one row per email (unique on `lower(email)`): submitting a name/email that already has an active (non-revoked) approval mints a session for that browser immediately, with no admin round-trip — see `submitNameRequest` in `src/app/actions.ts`. Re-approval is only required again if the request was denied, or every `approved_devices` row for it has been revoked. A single email can still have multiple independent devices/browsers approved at once (`approved_devices.access_request_id` is not unique), each separately revocable from the admin dashboard. Admin auth (separate from viewer approval) uses real login credentials via Supabase Auth.

## Planned architecture

- **Frontend + API**: Next.js (React, TypeScript, Tailwind) — a single app. API routes handle both the access-request flow and admin CRUD; no separate backend service.
- **Database**: PostgreSQL via Supabase, with Row-Level Security — public clients never hit tables directly, all reads/writes go through API routes using the service role key.
- **Photo storage**: Supabase Storage (S3-compatible). Originals and generated thumbnails/medium sizes are stored as separate objects (thumbnails generated server-side with `sharp` on upload) so the gallery grid stays fast.
- **Admin auth**: Supabase Auth (email/password or magic link), protecting `/admin/*`.
- **Visitor auth**: not Supabase Auth — a custom signed JWT in an httpOnly, secure, SameSite cookie, issued only after admin approval of that device's access request.
- **Realtime**: originally planned as Supabase Realtime (Postgres change subscriptions). **Implemented instead as polling** — see "Deviations from the original plan" below.
- **Hosting**: Vercel (frontend + serverless API routes) + Supabase (DB/storage/auth/realtime). Chosen for near-zero ops and free-tier viability at family scale.

### Data model

- `admin_users` — managed by Supabase Auth (not a custom table)
- `access_requests`: `id, name, email, status (pending|approved|denied), device_cookie_id, created_at, decided_at, decided_by` — unique on `lower(email)`; one row per email, reused/reset across resubmissions rather than duplicated
- `approved_devices`: `id, access_request_id, token_hash, created_at, revoked_at` — one row per approved browser/device; not unique on `access_request_id`, so one email can have several active devices, each independently revocable without touching the original request record
- `albums` *(optional)*: `id, name, cover_photo_id, created_at`
- `photos`: `id, album_id (nullable), storage_path, thumbnail_path, caption, uploaded_at, uploaded_by`

### Security notes specific to this design

- The name-submission endpoint (creates `access_requests`) must be rate-limited — it's the one endpoint an unapproved, anonymous visitor can hit.
- Visitor JWT cookie must be httpOnly + secure + SameSite; validate it server-side against `approved_devices` (not just signature) so a revoke takes effect immediately.
- Admin mutations (approve/deny, photo CRUD, revoke) require the Supabase Auth session, checked in the API route, not just hidden in the UI.
- Upload endpoint must validate file type/size before handing off to `sharp`.

### Deviations from the original plan

- **Polling instead of Supabase Realtime.** Wiring Realtime correctly from the browser would mean either giving the anon client direct table access (RLS policies gating what an unauthenticated visitor's socket can see) or a broadcast/presence layer — more surface area to get right without a live project to test against. Instead: the visitor's waiting screen calls a Server Action (`pollAccessStatus` in `src/app/actions.ts`) every 3s, and the admin dashboard calls `router.refresh()` every 5s (`src/components/admin/AutoRefresh.tsx`). Every table stays unreachable from the browser, matching the original RLS posture exactly. Revisit if the few-second latency ever actually matters.
- **Next.js 16 renamed `middleware.ts` to `proxy.ts`** (functionally identical) — `src/proxy.ts` does an optimistic-only redirect for `/gallery` based on cookie *presence*; the real check (signature, DB revocation) is `readVisitorStatus()` / `pollAndUpgradeIfApproved()` in `src/lib/auth/visitor.ts`, called on every protected render regardless.
- **Server Actions instead of a REST API.** There is no `/api/*` route — `src/app/actions.ts` (public: submit name, poll status) and `src/app/admin/actions.ts` / `src/app/admin/photos-actions.ts` (admin: approve/deny/revoke, photo CRUD) are all Server Actions called directly from forms or client components. Simpler than maintaining parallel Route Handlers for the same operations; each admin action still re-verifies `verifyAdminSession()` itself rather than trusting the caller.
- **`src/types/database.ts` uses `type`, not `interface`, for every row shape.** Supabase's client types require `Row`/`Insert`/`Update` to structurally satisfy `Record<string, unknown>`; a bare `interface` (no index signature) fails that check silently and every query resolves to `never`. Keep new tables' Row/Insert/Update as `type`.
- **Identity moved from device-only to email-keyed.** The original plan trusted a bare random `device_cookie_id` with no visitor-supplied identity. `submitNameRequest` now looks up `access_requests` by `lower(email)` first: no row → insert pending as before; an existing row that's `approved` with at least one non-revoked `approved_devices` row → mint a session for this browser immediately via `mintApprovedSession` (`src/lib/auth/visitor.ts`), skipping the waiting screen entirely; a `pending` row → attach this browser's cookie to the existing request instead of creating a duplicate; `denied`, or `approved` with every device revoked → reset the row to `pending` (clearing `decided_at`/`decided_by`) so it needs a fresh admin decision.

## Commands

| Command | Does |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build (verified passing) |
| `npm start` | Run the production build |
| `npm run lint` | ESLint (verified passing) |

No test suite exists yet.
