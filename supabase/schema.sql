-- Family Photo Gallery — database schema
-- Run this against a fresh Supabase project (SQL Editor, or `supabase db push`).
--
-- Row Level Security is enabled on every table with NO public policies.
-- Nothing is reachable from the anon/authenticated PostgREST roles; every
-- read and write goes through Next.js Server Actions / Route Handlers using
-- the service role key. See src/lib/supabase/admin.ts.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- access_requests: one row per name submitted at the visitor gate.
-- ---------------------------------------------------------------------------
create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  device_cookie_id text not null unique,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users (id)
);

create index if not exists access_requests_status_idx on public.access_requests (status, created_at desc);

alter table public.access_requests enable row level security;

-- ---------------------------------------------------------------------------
-- approved_devices: the trust record behind a visitor's session cookie.
-- Revoking access is a single update: set revoked_at.
-- ---------------------------------------------------------------------------
create table if not exists public.approved_devices (
  id uuid primary key default gen_random_uuid(),
  access_request_id uuid not null references public.access_requests (id) on delete cascade unique,
  token_hash text not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists approved_devices_request_idx on public.approved_devices (access_request_id);

alter table public.approved_devices enable row level security;

-- ---------------------------------------------------------------------------
-- albums: optional grouping for photos.
-- ---------------------------------------------------------------------------
create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  cover_photo_id uuid,
  created_at timestamptz not null default now()
);

alter table public.albums enable row level security;

-- ---------------------------------------------------------------------------
-- photos: one row per image; points at the two Storage objects that back it.
-- ---------------------------------------------------------------------------
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid references public.albums (id) on delete set null,
  storage_path text not null,
  thumbnail_path text not null,
  caption text,
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid references auth.users (id)
);

create index if not exists photos_album_idx on public.photos (album_id);
create index if not exists photos_uploaded_at_idx on public.photos (uploaded_at desc);

alter table public.photos enable row level security;

alter table public.albums
  add constraint albums_cover_photo_fkey
  foreign key (cover_photo_id) references public.photos (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Storage: a single private bucket holding both originals and thumbnails,
-- served exclusively via short-lived signed URLs (see src/lib/photos.ts).
-- Create it once, e.g. via the Supabase dashboard or:
--   select storage.create_bucket('gallery-photos', public => false);
-- ---------------------------------------------------------------------------
