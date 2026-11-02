"""The film of a room for Home, from one wide picture of it (space/preview.cjs draws the picture).

    python3 studio/app/space/preview_film.py <wide.png> <its vertical field of view, degrees> <out dir>

Every frame is the wide picture seen from the same place, turned a little: for a camera turning where it stands
that is exact (a homography), so the film is as sharp as the picture and nothing in it can flicker. It turns
slowly, easing at both ends, and loops without a seam. Writes preview.hevc.mp4 (iPhone and Mac: small and sharp), preview.webm
(VP9: Chrome, Android, Firefox), preview.mp4 (H.264: any other browser; more compressed), preview.jpg (the first frame) and preview.json: what the film is and how
it measured (check_app.py holds the app back if a film is soft, flickers or turns too fast).
"""
import json
import math
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np

OUT_W, OUT_H, FPS, SECONDS = 1080, 1440, 30, 30   # the box on a phone, at 3 pixels a point; 30 fps fits 60 Hz evenly
SUPER = 1.5                                        # drawn 1.5 times larger, then brought down: no stair-stepped edges
VFOV = 60                                          # as the viewer looks
SWING = math.radians(16.5)                         # how far it turns either way: a slow look round, 3.5° a second at most


def warp_maker(wide, vfov_wide):
    hp, wp = wide.shape[:2]
    fp = (hp / 2) / math.tan(math.radians(vfov_wide) / 2)
    Kp = np.array([[fp, 0, wp / 2], [0, fp, hp / 2], [0, 0, 1]])
    w, h = round(OUT_W * SUPER), round(OUT_H * SUPER)
    fo = (h / 2) / math.tan(math.radians(VFOV) / 2)
    Ko_inv = np.linalg.inv(np.array([[fo, 0, w / 2], [0, fo, h / 2], [0, 0, 1]]))

    def H(theta):                                  # a pixel of the film -> where it is in the wide picture
        c, s = math.cos(theta), math.sin(theta)
        return Kp @ np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]]) @ Ko_inv

    def covered(theta):                            # the film's edges, all inside the wide picture?
        pts = np.array([[0, 0, 1], [w, 0, 1], [w, h, 1], [0, h, 1], [w / 2, 0, 1], [w / 2, h, 1]], float).T
        q = H(theta) @ pts
        x, y = q[0] / q[2], q[1] / q[2]
        return bool((x >= 0).all() and (x <= wp).all() and (y >= 0).all() and (y <= hp).all())

    def frame(theta):
        big = cv2.warpPerspective(wide, H(theta), (w, h), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REPLICATE)
        return cv2.resize(big, (OUT_W, OUT_H), interpolation=cv2.INTER_AREA)
    return frame, covered


def angle(n):                                      # from rest at one end, easing across and back: it opens almost still
    return SWING * math.cos(2 * math.pi * n / (FPS * SECONDS))


def main(src, vfov_wide, out):
    out = Path(out)
    wide = cv2.imread(src, cv2.IMREAD_COLOR)
    # a hole in the room shows magenta in the viewer's shots: a few pixels are filled from round them, more is a fault
    hole = cv2.inRange(wide, (230, 0, 230), (255, 40, 255))
    share = hole.mean() / 255
    if share > 0.003:
        sys.exit(f'the room has holes in view ({share:.2%} of the picture): no film')
    if share:
        wide = cv2.inpaint(wide, hole, 5, cv2.INPAINT_TELEA)
    frame, covered = warp_maker(wide, float(vfov_wide))
    if not (covered(SWING) and covered(-SWING)):
        sys.exit('the wide picture does not cover the turn')
    n = FPS * SECONDS
    size = f'{OUT_W}x{OUT_H}'
    raw = ['-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', size, '-r', str(FPS), '-i', '-']
    encs = [
        ['ffmpeg', '-y', '-loglevel', 'error', *raw, '-c:v', 'libx264', '-preset', 'veryslow', '-crf', '25', '-profile:v', 'high', '-level', '4.0',
         '-x264-params', 'aq-mode=3', '-g', '60', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', str(out / 'preview.mp4')],
        ['ffmpeg', '-y', '-loglevel', 'error', *raw, '-c:v', 'libx265', '-preset', 'medium', '-crf', '23', '-tag:v', 'hvc1', '-x265-params', 'log-level=error:keyint=60',
         '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', str(out / 'preview.hevc.mp4')],
        ['ffmpeg', '-y', '-loglevel', 'error', *raw, '-c:v', 'libvpx-vp9', '-crf', '32', '-b:v', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2',
         '-g', '60', '-pix_fmt', 'yuv420p', '-an', str(out / 'preview.webm')],
    ]
    procs = [subprocess.Popen(e, stdin=subprocess.PIPE) for e in encs]
    sample = {}
    for i in range(n):
        f = frame(angle(i))
        if i == 0:
            cv2.imwrite(str(out / 'preview.jpg'), f, [cv2.IMWRITE_JPEG_QUALITY, 86])
        if i % 150 == 7:
            sample[i] = f
        buf = f.tobytes()
        for p in procs:
            p.stdin.write(buf)
    for p in procs:
        p.stdin.close()
        if p.wait():
            sys.exit('a film could not be encoded')
    m = measure(out / 'preview.hevc.mp4', sample)                 # the one an iPhone plays
    m.update(width=OUT_W, height=OUT_H, fps=FPS, seconds=SECONDS, peak_deg_per_s=round(math.degrees(SWING) * 2 * math.pi / SECONDS, 2),
             kb={k: round((out / k).stat().st_size / 1024) for k in ('preview.mp4', 'preview.hevc.mp4', 'preview.webm')})
    (out / 'preview.json').write_text(json.dumps(m, indent=1) + '\n')
    print(f'{out.name}: film {OUT_W}x{OUT_H}, {SECONDS}s, {m["peak_deg_per_s"]}°/s, PSNR {m["psnr_db"]} dB, flicker {m["flicker"]}, {m["kb"]}')


def decode(video, w, h, gray=False):
    fmt = 'gray' if gray else 'bgr24'
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', str(video), '-vf', f'scale={w}:{h}:flags=area', '-f', 'rawvideo', '-pix_fmt', fmt, '-'],
                         capture_output=True, check=True).stdout
    ch = 1 if gray else 3
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w, ch) if ch == 3 else np.frombuffer(raw, np.uint8).reshape(-1, h, w)


def measure(video, sample=None):
    """How the film looks: its sharpness against the frames it was made from (PSNR, when they are given), and
    flicker: how much each frame differs from the mean of the frames either side of it (zero for steady motion)."""
    small = decode(video, 270, 360, gray=True).astype(np.float32)
    second = np.abs(small[2:] - 2 * small[1:-1] + small[:-2]).mean(axis=(1, 2))
    r = {'frames': int(small.shape[0]), 'flicker': round(float(np.percentile(second, 99)), 3),
         'motion': round(float(np.abs(small[1:] - small[:-1]).mean(axis=(1, 2)).max()), 3)}
    if sample:
        full = decode(video, OUT_W, OUT_H)
        ps = [cv2.PSNR(full[i], f) for i, f in sample.items() if i < len(full)]
        r['psnr_db'] = round(min(ps), 1)
    return r


if __name__ == '__main__':
    if sys.argv[1] == '--measure':                  # an existing film: python3 preview_film.py --measure <video>
        print(json.dumps(measure(sys.argv[2])))
    else:
        main(*sys.argv[1:4])
