-- Applied to project hlpzqeosdavfuzjgpwhy (10.11.2026, "conversations_and_messages"). Additive only.
-- A user sees only their own conversations and messages; an admin (public.admins) sees all and may answer.
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null default '',
  status text not null default 'open' check (status in ('open','answered','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  from_admin boolean not null default false,
  body text not null check (length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index if not exists conversations_user_idx on public.conversations(user_id);
create index if not exists messages_conv_idx on public.messages(conversation_id, created_at);
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy conversations_select on public.conversations for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy conversations_insert on public.conversations for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy conversations_update on public.conversations for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy messages_select on public.messages for select to authenticated
  using ((select public.is_admin()) or exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = (select auth.uid())));
create policy messages_insert on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid()) and (
      ((select public.is_admin()) and from_admin)
      or (not from_admin and exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = (select auth.uid())))
    )
  );
