-- 16.11.2026. Additive only. Exhibitions the owner hides from the app (nothing is deleted: the control room can bring them back).
-- key: 'ex:<exhibition slug>'. Everyone reads (the app filters on it); only an admin writes.
create table if not exists public.app_hidden (
  key text primary key check (length(key) <= 200),
  created_at timestamptz not null default now()
);
alter table public.app_hidden enable row level security;
create policy app_hidden_read on public.app_hidden for select to anon, authenticated using (true);
create policy app_hidden_admin_write on public.app_hidden for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
