-- Applied to project hlpzqeosdavfuzjgpwhy (11.11.2026, "museum_slots"). Additive only.
-- The museum street is fixed: 8 slots (rooms). The owner keeps exhibitions (drafts, admin only) and places them in slots.
-- Publishing copies an exhibition into its slot (content); visitors read only live slots inside their dates.
create table if not exists public.museum_exhibitions (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Untitled' check (length(title) <= 200),
  curator text,
  text text,
  works jsonb not null default '[]'::jsonb,
  plinths jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.museum_slots (
  slot int primary key check (slot between 1 and 8),
  exhibition_id uuid references public.museum_exhibitions(id) on delete set null,
  app_slug text,
  live boolean not null default false,
  from_date date,
  to_date date,
  colour text check (colour is null or colour ~ '^#[0-9a-fA-F]{6}$'),
  content jsonb,
  published_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.museum_exhibitions enable row level security;
alter table public.museum_slots enable row level security;
create policy museum_ex_admin_all on public.museum_exhibitions for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy museum_slots_public on public.museum_slots for select to anon, authenticated using (
  live and (from_date is null or from_date <= (now() at time zone 'Asia/Jerusalem')::date) and (to_date is null or to_date >= (now() at time zone 'Asia/Jerusalem')::date));
create policy museum_slots_admin_all on public.museum_slots for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
