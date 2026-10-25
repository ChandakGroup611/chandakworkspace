-- Monthly counter of paid AI picture requests (Gemini), so the app can enforce a hard limit and
-- never spend beyond the free monthly credit. One row per month ("2026-10").
create table if not exists public.vehicle_ai_usage (
  month        text primary key,
  gemini_calls integer not null default 0,
  updated_at   timestamptz not null default now()
);
-- Server-only (service role).
alter table public.vehicle_ai_usage enable row level security;
