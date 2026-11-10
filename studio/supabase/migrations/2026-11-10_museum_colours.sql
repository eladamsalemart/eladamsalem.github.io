-- Applied to project hlpzqeosdavfuzjgpwhy (10.11.2026, "museum_colours"). Additive only.
-- The curator's override of an exhibition's threshold colour in the museum street. Anyone reads; only an admin writes.
create table if not exists public.museum_colours (
  slug text primary key check (length(slug) between 1 and 120),
  colour text not null check (colour ~ '^#[0-9a-fA-F]{6}$'),
  updated_at timestamptz not null default now()
);
alter table public.museum_colours enable row level security;
create policy museum_colours_read on public.museum_colours for select to anon, authenticated using (true);
create policy museum_colours_insert on public.museum_colours for insert to authenticated with check ((select public.is_admin()));
create policy museum_colours_update on public.museum_colours for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy museum_colours_delete on public.museum_colours for delete to authenticated using ((select public.is_admin()));
