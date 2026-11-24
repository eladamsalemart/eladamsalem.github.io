-- 24.11.2026. Additive only. The last hours of real-phone data as one compact summary, per space and device class
-- (for the lead session's morning review and the Desk's "טלפונים" tab). Admin only: an app user who is not an admin gets
-- an error; the database's own roles (the connector, the service key) may read it.
-- select * from public.phone_vitals_summary();            -- last 24 h, test rows left out
-- select * from public.phone_vitals_summary(72, true);    -- last 72 h, test rows in
-- Flags (the same lines as the Desk tab): first frame over 6 s on an iPhone or iPad (10 s elsewhere), a median frame
-- over 50 ms, any crash, any lost graphics context.
create or replace function public.phone_vitals_summary(hours integer default 24, include_tests boolean default false)
returns table (space text, device text, visits integer, tests integer,
  load_med_ms integer, load_worst_ms integer, frame_med_ms real, frame_worst_ms real,
  tex_med_mb integer, tex_worst_mb integer, heap_med_mb integer, crashes integer, context_lost integer, flags text[])
language plpgsql stable security invoker set search_path = public as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then raise exception 'admins only'; end if;
  return query
  with r as (
    select * from public.phone_vitals v
    where v.created_at > now() - make_interval(hours => greatest(1, least(hours, 24 * 60))) and (include_tests or not v.test)
  ), g as (
    select r.space, r.device, count(*)::int n, count(*) filter (where r.test)::int t,
      (percentile_disc(0.5) within group (order by r.first_frame_ms))::int ff, max(r.first_frame_ms)::int ffw,
      (percentile_disc(0.5) within group (order by r.frame_med_ms))::real fm, max(r.frame_worst_ms)::real fw,
      (percentile_disc(0.5) within group (order by r.tex_mb))::int tm, max(r.tex_mb)::int tw,
      (percentile_disc(0.5) within group (order by r.heap_mb))::int hm,
      count(*) filter (where r.crashed)::int c, count(*) filter (where r.context_lost)::int l
    from r group by r.space, r.device
  )
  select g.space, g.device, g.n, g.t, g.ff, g.ffw, g.fm, g.fw, g.tm, g.tw, g.hm, g.c, g.l,
    array_remove(array[
      case when g.ff > (case when g.device in ('iphone', 'ipad') then 6000 else 10000 end) then 'load ' || round(g.ff / 1000.0, 1) || ' s' end,
      case when g.fm > 50 then 'frame ' || round(g.fm::numeric) || ' ms' end,
      case when g.c > 0 then g.c || ' crashed' end,
      case when g.l > 0 then g.l || ' context lost' end], null)
  from g order by (g.c + g.l) desc, g.n desc;
end $$;
revoke all on function public.phone_vitals_summary(integer, boolean) from public, anon;
grant execute on function public.phone_vitals_summary(integer, boolean) to authenticated;
