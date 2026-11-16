-- Additive. The museum is a description: its base and its spaces are data, the building is generated from them (studio/design/museum-sky/README.md).
-- One row, key 'main', written by the Desk (admin); everyone reads it. No row = the app builds the base plan it carries.
create table if not exists public.museum_plan (
  key text primary key default 'main' check (key ~ '^[a-z0-9_-]{1,40}$'),
  plan jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.museum_plan enable row level security;
create policy museum_plan_public on public.museum_plan for select to anon, authenticated using (true);
create policy museum_plan_admin_all on public.museum_plan for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
-- the museum can hold more than eight exhibitions at once (a loosening of the old check, not a removal of data)
alter table public.museum_slots drop constraint if exists museum_slots_slot_check;
alter table public.museum_slots add constraint museum_slots_slot_check check (slot between 1 and 64);
