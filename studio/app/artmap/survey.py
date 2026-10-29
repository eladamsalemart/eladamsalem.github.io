"""A country's art places in Overture Maps (free, monthly, CDLA-Permissive): how many, and how many come with a website
or an Instagram account. The first step of the art map anywhere in the world, before the curated list and the checks.

    python3 studio/app/artmap/survey.py --country IL --bbox 34.2,29.45,35.9,33.35 [--out il.json]

Needs duckdb (with its httpfs and spatial extensions); reads Overture's latest release straight from its public bucket.
"""
import argparse
import json
from collections import Counter

ART = ['art_gallery', 'art_museum', 'contemporary_art_museum', 'modern_art_museum', 'museum', 'arts_and_crafts',
       'art_school', 'cultural_center', 'public_art', 'sculpture_statue', 'art_space', 'artist_studio']


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--country', required=True)
    ap.add_argument('--bbox', required=True, help='xmin,ymin,xmax,ymax')
    ap.add_argument('--release', default='')
    ap.add_argument('--out')
    a = ap.parse_args()
    import duckdb
    con = duckdb.connect()
    con.execute("INSTALL httpfs; LOAD httpfs; INSTALL spatial; LOAD spatial; SET s3_region='us-west-2';")
    rel = a.release or sorted(r[0] for r in con.execute(
        "SELECT DISTINCT regexp_extract(file, 'release/([^/]+)/', 1) FROM glob('s3://overturemaps-us-west-2/release/*/theme=places/type=place/*')").fetchall())[-1]
    x0, y0, x1, y1 = map(float, a.bbox.split(','))
    src = f"read_parquet('s3://overturemaps-us-west-2/release/{rel}/theme=places/type=place/*', hive_partitioning=1)"
    # Overture renames its category fields now and then (categories, then taxonomy / basic_category): use what's there
    cols = {r[0]: r[1] for r in con.execute(f'DESCRIBE SELECT * FROM {src}').fetchall()}
    print('columns:', ', '.join(f'{k} {v[:60]}' for k, v in cols.items() if k not in ('geometry', 'bbox')))
    if 'categories' in cols:
        prim, alt = 'categories.primary', 'coalesce(categories.alternate, [])'
    elif 'taxonomy' in cols:
        prim = 'taxonomy.primary'
        alt = 'coalesce(taxonomy.alternates, [])' if 'alternates' in cols['taxonomy'] else 'coalesce(taxonomy.hierarchy, [])'
    else:
        prim, alt = 'basic_category', '[]'
    rows = con.execute(f"""
        SELECT id, names.primary, {prim}, {alt}, websites, socials, confidence,
               ST_Y(geometry), ST_X(geometry), addresses[1].country
        FROM {src}
        WHERE bbox.xmin BETWEEN {x0} AND {x1} AND bbox.ymin BETWEEN {y0} AND {y1}
          AND ({prim} IN ({','.join(repr(c) for c in ART)}) OR list_has_any({alt}, {ART!r})
               {"OR basic_category IN ('art_gallery','museum','art_museum')" if 'basic_category' in cols else ''})""").fetchall()
    keys = ['id', 'name', 'cat', 'alt', 'websites', 'socials', 'confidence', 'lat', 'lon', 'country']
    places = [dict(zip(keys, r)) for r in rows if (r[9] or a.country) == a.country]
    core = [p for p in places if p['cat'] in ('art_gallery', 'art_museum', 'contemporary_art_museum', 'modern_art_museum', 'art_space')
            or set(p['alt'] or []) & {'art_gallery', 'art_museum'}]
    ig = lambda p: any('instagram.com' in s for s in (p['socials'] or []))
    print(f'Overture {rel}, {a.country}: {len(places)} museums/arts places; {len(core)} art galleries and art museums')
    print('  categories:', Counter(p['cat'] for p in places).most_common(12))
    for label, group in (('art galleries and museums', core), ('all', places)):
        n = len(group) or 1
        print(f"  {label}: website {sum(bool(p['websites']) for p in group) / n:.0%}, any social {sum(bool(p['socials']) for p in group) / n:.0%},"
              f" instagram {sum(ig(p) for p in group) / n:.0%}, confidence>=0.8 {sum((p['confidence'] or 0) >= 0.8 for p in group) / n:.0%}")
    for p in core[:25]:
        print('   ', p['name'], '|', p['cat'], '|', (p['websites'] or [''])[0], '|', [s for s in (p['socials'] or []) if 'instagram' in s][:1])
    if a.out:
        json.dump({'release': rel, 'places': places}, open(a.out, 'w'), ensure_ascii=False, default=str)


if __name__ == '__main__':
    main()
