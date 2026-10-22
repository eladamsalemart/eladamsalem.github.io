"""Studio infrastructure cost model. Prices: Cloudflare R2/Stream, Supabase, Hive, Mapbox (2026 public list prices,
see RESEARCH.md). Every assumption is a named constant so it can be changed and re-run."""

MB, GB, TB = 1, 1024, 1024 * 1024

# Storage per artist (MB)
WORKS_PER_ARTIST = 40
PER_2D_WORK = 25 + 2 * 20 + 10          # master JPEG/TIFF-avg + 2 detail shots + derivatives & deep-zoom tiles
PER_3D_WORK = 60 + 25 + 40 + 36 * 4     # masters, splat (SPZ), glTF+USDZ, 36-frame turntable
SHARE_3D = 0.25                         # share of works that are 3D across all artists
INSTALL_VIEWS = 3 * 20 * 15             # 3 shows x 20 installation photos x 15 MB
REAL_SPACE_SCAN = 100                   # one Gaussian-splat capture of a physical show
per_artist = WORKS_PER_ARTIST * ((1 - SHARE_3D) * PER_2D_WORK + SHARE_3D * PER_3D_WORK) + INSTALL_VIEWS + REAL_SPACE_SCAN
BACKUP_FACTOR = 2                       # masters kept in a second provider

# Traffic per visit (MB)
VISITS_PER_USER = 8
SHARE_3D_VISITS = 0.3
MB_3D_VISIT = 35                        # space (cached after first) + ~12 work textures + deep zoom
MB_2D_VISIT = 5
REQ_PER_VISIT = 120

R2_GB = 0.015; R2_B_PER_M = 0.36; R2_FREE_GB = 10; R2_FREE_B = 10
S3_EGRESS_GB = 0.09                     # for comparison only
SUPABASE = 25; COMPUTE = {"pilot": 0, "invited": 10, "growth": 60, "scale": 210}
WORKERS = 5
STREAM_STORED_PER_1000 = 5; STREAM_DELIVERED_PER_1000 = 1
HIVE_PER_IMAGE = 0.006
MAPBOX_FREE = 50_000; MAPBOX_PER_1000 = 5

scenarios = {
    #           artists, monthly active users, video minutes stored, video minutes watched, map loads
    "pilot":   (1,      500,     0,     0,       0),
    "invited": (20,     3_000,   60,    3_000,   5_000),
    "growth":  (500,    20_000,  1_500, 60_000,  40_000),
    "scale":   (5_000,  150_000, 15_000, 600_000, 300_000),
}

print(f"Average storage per artist: {per_artist/GB:.1f} GB (x{BACKUP_FACTOR} with backup)\n")
print(f"{'scenario':9} {'storage':>9} {'traffic/mo':>11} {'R2':>7} {'S3-egress*':>11} {'DB':>6} {'video':>6} {'maps':>6} {'total/mo':>9} {'AI check once':>13}")
for name, (artists, mau, vstored, vwatched, maps) in scenarios.items():
    stor_gb = artists * per_artist * BACKUP_FACTOR / GB
    visits = mau * VISITS_PER_USER
    traffic_gb = visits * (SHARE_3D_VISITS * MB_3D_VISIT + (1 - SHARE_3D_VISITS) * MB_2D_VISIT) / GB
    reads_m = visits * REQ_PER_VISIT / 1e6 * 0.3          # ~70% served from CDN cache, not R2
    r2 = max(0, stor_gb - R2_FREE_GB) * R2_GB + max(0, reads_m - R2_FREE_B) * R2_B_PER_M
    s3_egress = traffic_gb * S3_EGRESS_GB
    db = (SUPABASE + COMPUTE[name]) if name != "pilot" else 0
    video = (vstored / 1000) * STREAM_STORED_PER_1000 + (vwatched / 1000) * STREAM_DELIVERED_PER_1000
    mapc = max(0, maps - MAPBOX_FREE) / 1000 * MAPBOX_PER_1000
    total = r2 + db + video + mapc + (WORKERS if name != "pilot" else 0)
    ai = artists * WORKS_PER_ARTIST * 3 * HIVE_PER_IMAGE
    unit = "TB" if stor_gb > 1024 else "GB"
    sval = stor_gb / 1024 if unit == "TB" else stor_gb
    print(f"{name:9} {sval:7.1f}{unit} {traffic_gb/1024:9.2f}TB {r2:7.0f} {s3_egress:11.0f} {db:6.0f} {video:6.0f} {mapc:6.0f} {total:9.0f} {ai:13.0f}")
print("\n* what bandwidth alone would cost on AWS S3 at $0.09/GB; R2 egress is free.")
