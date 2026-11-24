-- The works bucket also keeps the phone-friendly copies of artists' uploads (studio/app/texopt/texopt.py: <uid>/opt/<name>.<edge>.ktx2,
-- a 768 px WebP, a relief map) and their manifest (opt/manifest.json). Additive: the types allowed before stay allowed.
update storage.buckets
   set allowed_mime_types = (select array_agg(distinct t) from unnest(coalesce(allowed_mime_types, '{}') || array['image/ktx2', 'application/json']) t)
 where id = 'works';
