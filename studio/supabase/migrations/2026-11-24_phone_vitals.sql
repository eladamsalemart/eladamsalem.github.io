-- 24.11.2026. Additive only. Real-phone data: how the 3D spaces run on visitors' own devices.
-- One row per visit to a space (a tour or the museum), sent once by the app at the end with sendBeacon.
-- No personal data: no IP, no user id, no full user agent. `visit` is a random id made on the phone for that visit.
-- Anyone may add a row (insert only, checked and capped); only an admin reads. Rows older than 60 days are deleted nightly.
create table if not exists public.phone_vitals (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  visit text not null check (length(visit) between 8 and 40),
  space text not null check (length(space) between 1 and 120),
  device text not null check (device in ('iphone', 'ipad', 'android', 'desktop', 'other')),
  model text check (length(model) <= 60),
  browser text check (length(browser) <= 20),
  screen_w smallint check (screen_w between 0 and 10000),
  screen_h smallint check (screen_h between 0 and 10000),
  dpr real check (dpr between 0 and 8),
  first_frame_ms integer check (first_frame_ms between 0 and 600000),
  frame_med_ms real check (frame_med_ms between 0 and 60000),
  frame_p95_ms real check (frame_p95_ms between 0 and 60000),
  frame_worst_ms real check (frame_worst_ms between 0 and 600000),
  frames integer check (frames between 0 and 100000),
  heap_mb integer check (heap_mb between 0 and 100000),
  tex_mb integer check (tex_mb between 0 and 100000),
  context_lost boolean not null default false,
  crashed boolean not null default false,
  errors smallint not null default 0 check (errors between 0 and 1000),
  seconds integer check (seconds between 0 and 86400),
  owner boolean not null default false,
  test boolean not null default false
);
create index if not exists phone_vitals_created on public.phone_vitals (created_at desc);
alter table public.phone_vitals enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'phone_vitals' and policyname = 'phone_vitals_insert') then
    create policy phone_vitals_insert on public.phone_vitals for insert to anon, authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'phone_vitals' and policyname = 'phone_vitals_admin_read') then
    create policy phone_vitals_admin_read on public.phone_vitals for select to authenticated using ((select public.is_admin()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'phone_vitals' and policyname = 'phone_vitals_admin_delete') then
    create policy phone_vitals_admin_delete on public.phone_vitals for delete to authenticated using ((select public.is_admin()));
  end if;
end $$;
revoke all on public.phone_vitals from anon, authenticated;
grant insert on public.phone_vitals to anon, authenticated;
grant select, delete on public.phone_vitals to authenticated;

-- The app sends with navigator.sendBeacon, which can carry no headers: the body is text/plain JSON, posted to
-- /rest/v1/rpc/log_phone_vitals?apikey=... PostgREST hands a text/plain body to a function's single unnamed text argument.
-- Runs as the caller (anon), so the table's own insert policy and checks apply.
create or replace function public.log_phone_vitals(text) returns void
language plpgsql security invoker set search_path = public as $$
declare j jsonb;
begin
  if length($1) > 1024 then return; end if;
  j := $1::jsonb;
  insert into public.phone_vitals (visit, space, device, model, browser, screen_w, screen_h, dpr, first_frame_ms, frame_med_ms,
    frame_p95_ms, frame_worst_ms, frames, heap_mb, tex_mb, context_lost, crashed, errors, seconds, owner, test)
  values (j->>'id', j->>'space', coalesce(j->>'dev', 'other'), left(j->>'model', 60), left(j->>'br', 20),
    (j->>'sw')::smallint, (j->>'sh')::smallint, (j->>'dpr')::real, (j->>'ff')::integer, (j->>'med')::real,
    (j->>'p95')::real, (j->>'worst')::real, (j->>'n')::integer, (j->>'heap')::integer, (j->>'tex')::integer,
    coalesce((j->>'lost')::boolean, false), coalesce((j->>'crash')::boolean, false), coalesce((j->>'err')::smallint, 0),
    (j->>'s')::integer, coalesce((j->>'own')::boolean, false), coalesce((j->>'test')::boolean, false));
end $$;
revoke all on function public.log_phone_vitals(text) from public;
grant execute on function public.log_phone_vitals(text) to anon, authenticated;

-- 60 days, then gone (pg_cron; the job is replaced in place if it exists)
create extension if not exists pg_cron;
select cron.schedule('phone-vitals-retention', '17 3 * * *', $$delete from public.phone_vitals where created_at < now() - interval '60 days'$$);
