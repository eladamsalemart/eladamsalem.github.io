-- Every virtual exhibition is looked at before it goes live (the owner's rule, 13.11.2026).
-- An artist's exhibition goes draft -> pending (sent) -> published (an admin) or changes (an admin, with a note);
-- the artist may take a sent one back, and take a published one down. Only an admin makes one published.
-- Exhibitions already published stay as they are.

alter table public.virtual_shows drop constraint if exists virtual_shows_status_check;
alter table public.virtual_shows add constraint virtual_shows_status_check
  check (status = any (array['draft'::text, 'pending'::text, 'changes'::text, 'published'::text]));
alter table public.virtual_shows add column if not exists note text;
alter table public.virtual_shows add column if not exists sent_at timestamptz;

create or replace function public.virtual_shows_guard()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if not public.is_admin() then
    if tg_op = 'INSERT' then
      new.note := null;
      if new.status in ('pending', 'published') then new.status := 'pending'; new.sent_at := now();
      else new.status := 'draft'; new.sent_at := null; end if;
    else
      new.note := old.note; new.sent_at := old.sent_at;
      if old.status = 'published' then
        if new.status <> 'published' then new.status := 'draft'; end if;          -- taken down by the artist
      elsif new.status in ('pending', 'published') then
        if old.status <> 'pending' then new.sent_at := now(); end if;             -- sent for a look
        new.status := 'pending';
      elsif new.status <> old.status then new.status := 'draft';                  -- taken back
      end if;
    end if;
  end if;
  return new;
end $function$;

drop trigger if exists virtual_shows_guard on public.virtual_shows;
create trigger virtual_shows_guard before insert or update on public.virtual_shows
  for each row execute function public.virtual_shows_guard();
