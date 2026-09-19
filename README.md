# Family Gallery

A private photo gallery gated by a name-request/admin-approval flow instead of visitor accounts. See `CLAUDE.md` for the full design, `ARCHITECTURE.md` for diagrams, and `TDD.md` for the technical design document.

## Stack

Next.js (App Router, TypeScript, Tailwind CSS) + Supabase (Postgres, Storage, Auth).

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project** at [supabase.com](https://supabase.com).

3. **Run the schema** — open the SQL Editor in your Supabase project and run `supabase/schema.sql`.

4. **Create a storage bucket** named `gallery-photos` (Storage → New bucket), **private** (not public).

5. **Create an admin user** — Authentication → Users → Add user, with the email/password you'll sign in to `/admin` with.

6. **Configure environment variables** — copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` — from Project Settings → API.
   - `SUPABASE_STORAGE_BUCKET` — `gallery-photos`, if you used the name above.
   - `VISITOR_JWT_SECRET` — generate with `openssl rand -base64 32`.

7. **Run the dev server**

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000` for the visitor gate, `http://localhost:3000/admin/login` to sign in as admin.

## Commands

| Command | Does |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | ESLint |

## Notes on the current implementation

- **Live updates are polling, not Supabase Realtime.** The visitor's waiting screen polls every 3s and the admin dashboard auto-refreshes every 5s, both via Server Actions/Server Components — not a wired-up Realtime subscription. This was a deliberate simplification made during implementation (see `CLAUDE.md`): it keeps every table unreachable from the browser (no client-side Realtime + RLS policies to get right) while still feeling live within a few seconds.
- **Rate limiting is in-memory**, per serverless instance — a reasonable deterrent at family scale, not a distributed solution. See `src/lib/rate-limit.ts`.
