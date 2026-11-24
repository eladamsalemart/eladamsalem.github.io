-- 24.11.2026. Additive only. The Desk's "עבודה" tab: tasks the owner plans, and a two-way thread with the lead developer.
-- Admin only, read and write (same is_admin() pattern as conversations/messages).
create table if not exists public.work_items (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 300),
  details text not null default '',
  priority int not null default 2 check (priority between 1 and 3),          -- 1 urgent, 2 normal, 3 later
  status text not null default 'new' check (status in ('new', 'planned', 'in_progress', 'done', 'waiting_owner')),
  area text not null default 'other' check (area in ('museum', 'art', 'tours', 'app', 'other')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text not null default 'owner',
  seen_by_lead_at timestamptz
);
create table if not exists public.work_notes (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.work_items (id) on delete cascade,
  author text not null default 'owner' check (author in ('owner', 'lead')),
  body text not null check (length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index if not exists work_items_status_priority on public.work_items (status, priority, created_at desc);
create index if not exists work_notes_item on public.work_notes (item_id, created_at);
alter table public.work_items enable row level security;
alter table public.work_notes enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'work_items' and policyname = 'work_items_admin') then
    create policy work_items_admin on public.work_items for all to authenticated
      using ((select public.is_admin())) with check ((select public.is_admin()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'work_notes' and policyname = 'work_notes_admin') then
    create policy work_notes_admin on public.work_notes for all to authenticated
      using ((select public.is_admin())) with check ((select public.is_admin()));
  end if;
end $$;
revoke all on public.work_items, public.work_notes from anon, authenticated;
grant select, insert, update, delete on public.work_items, public.work_notes to authenticated;
