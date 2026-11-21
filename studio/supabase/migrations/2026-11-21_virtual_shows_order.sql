-- 21.11.2026. Additive only. Where an artist's virtual exhibition stands among their arches: the number of real exhibitions before it.
alter table public.virtual_shows add column if not exists art_ord integer;
