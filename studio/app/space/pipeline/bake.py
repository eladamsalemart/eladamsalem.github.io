"""Bake the real light of the room onto its surfaces, from the photos themselves.

Every surface (a wall, the floor, the ceiling) is a flat rectangle at a known place, so each of its
points can be looked up in every photo that sees it. The photos are first brought to a common exposure
(each photo's brightness is solved so that overlapping views agree), then blended, favouring the photo
that sees each point largest and most squarely. Works are masked out of the photos (the 3D works are
drawn on top), and where the photos disagree a lot the surface is not really there: that is an opening.

The works get the same treatment the other way round: comparing a work as it appears in the photos with
its own high-quality image gives the light that fell on it (brighter at the top under a spot, a warm
cast), which the viewer applies to the full-resolution image."""
import cv2
import numpy as np
from .room import project, centre, K_of

TEXEL = 0.01            # metres per texel on walls
GRAZING = 0.17          # a view this oblique (cosine to the surface's normal) smears; treated as unseen


class Surface:
    """A rectangle: origin o, unit axes u (columns) and v (rows, pointing down the texture), size in metres."""
    def __init__(self, name, o, u, v, su, sv, normal, texel=TEXEL):
        self.name, self.o, self.u, self.v = name, np.asarray(o, float), np.asarray(u, float), np.asarray(v, float)
        self.su, self.sv, self.n, self.texel = su, sv, np.asarray(normal, float), texel
        self.W, self.H = max(2, int(round(su / texel))), max(2, int(round(sv / texel)))

    def grid(self, step=1):
        i = (np.arange(0, self.W, step) + 0.5) * self.texel
        j = (np.arange(0, self.H, step) + 0.5) * self.texel
        I, J = np.meshgrid(i, j)
        return self.o + I[..., None] * self.u + J[..., None] * self.v      # (rows, cols, 3)


def sample(img, cam, X, mask=None, edge=24):
    """Colours of world points X (r,c,3) in one photo, with a weight for how well the photo sees them."""
    r, c = X.shape[:2]
    uv, z = project(cam, X.reshape(-1, 3))
    h, w = img.shape[:2]
    mapx = uv[:, 0].reshape(r, c).astype(np.float32); mapy = uv[:, 1].reshape(r, c).astype(np.float32)
    col = cv2.remap(img, mapx, mapy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT).astype(np.float32)
    z = z.reshape(r, c)
    inside = (z > 0.2) & (mapx > 1) & (mapy > 1) & (mapx < w - 2) & (mapy < h - 2)
    # feather towards the frame's edges and the works' masks, so seams between photos don't show
    border = np.minimum.reduce([mapx, mapy, w - mapx, h - mapy]) / edge
    wgt = np.clip(border, 0, 1)
    if mask is not None:
        far = cv2.distanceTransform((mask == 0).astype(np.uint8), cv2.DIST_L2, 5)
        d = cv2.remap(far, mapx, mapy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
        wgt = wgt * np.clip((d - 2) / edge, 0, 1)
    # resolution: how many photo pixels a texel gets (closer and more square-on is better)
    C = centre(cam)
    view = C - X
    dist = np.linalg.norm(view, axis=-1)
    return col, wgt * inside, (cam['f'] / np.maximum(dist, 0.1)) ** 2, view / dist[..., None]


def off_plane(s, images, cams, masks, gains, min_quality=0.15):
    """Where on a surface the photos show something that is not on its plane (a pier standing out of a
    wall, an object in front of it, a room seen through it): a mask, True there.

    Two photos of the same flat surface agree on its detail wherever both see it; anything standing off
    the plane appears in a different place in each (parallax), so its edges disagree. Only the detail is
    compared (each photo's light differs a little), and only where at least two photos see the spot well."""
    X = s.grid()
    det, ok = [], []
    for p, cam in cams.items():
        col, wgt, res, view = sample(images[p], cam, X, masks[p])
        facing = np.clip((view * s.n).sum(-1), 0, 1)
        g = (col * gains[p][None, None, :]).mean(-1).astype(np.float32)
        hp = g - cv2.GaussianBlur(g, (0, 0), 3)
        det.append(cv2.GaussianBlur(np.abs(hp), (0, 0), 1.5) * np.sign(cv2.GaussianBlur(hp, (0, 0), 1.0)))
        ok.append((wgt > 0.5) & (facing > 0.3))
    if len(det) < 2:
        return np.zeros((s.H, s.W), bool)
    acc = np.zeros((s.H, s.W)); n = np.zeros((s.H, s.W))
    for i in range(len(det)):
        for j in range(i + 1, len(det)):
            m = ok[i] & ok[j]
            # a strong edge in one photo with nothing (or the opposite) at the same place in the other
            d = np.abs(det[i] - det[j]) - 0.5 * np.minimum(np.abs(det[i]), np.abs(det[j]))
            acc += np.where(m, d, 0); n += m
    dis = np.where(n > 0, acc / np.maximum(n, 1), 0)
    dis = cv2.GaussianBlur(dis.astype(np.float32), (0, 0), 4)
    off = dis > 2.5
    off = cv2.morphologyEx(off.astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    return cv2.dilate(off, np.ones((15, 15), np.uint8)) > 0


def exposure_gains(surfaces, images, cams, masks, step=6):
    """One brightness and colour gain per photo, so that photos agree where they overlap (log domain)."""
    ps = list(cams)
    rows, rhs = [], []
    for s in surfaces:
        X = s.grid(step)
        samp = {p: sample(images[p], cams[p], X, masks[p]) for p in ps}
        for i in range(len(ps)):
            for j in range(i + 1, len(ps)):
                a, b = samp[ps[i]], samp[ps[j]]
                m = (a[1] > 0.5) & (b[1] > 0.5)
                if m.sum() < 50:
                    continue
                la = np.log(np.median(a[0][m], axis=0) + 1); lb = np.log(np.median(b[0][m], axis=0) + 1)
                r = np.zeros(len(ps)); r[i] = 1; r[j] = -1
                wgt = np.sqrt(m.sum())
                rows.append(r * wgt); rhs.append((lb - la) * wgt)
    if not rows:
        return {p: np.ones(3) for p in ps}
    A = np.vstack(rows + [np.ones(len(ps)) * 10]); B = np.vstack(rhs + [np.zeros(3)])
    g, *_ = np.linalg.lstsq(A, B, rcond=None)
    return {p: np.exp(g[k]) for k, p in enumerate(ps)}


def bake(s, images, cams, masks, gains, sharp=3.0):
    """Blend all photos onto a surface. Returns colour (H,W,3 uint8), coverage (0..1), and disagreement.

    Each spot takes its colour from the photos that see it well; a photo that sees it much worse than the
    best one (from far, or at a grazing angle, where a small error moves things a long way) is left out
    there, even where the best photo fades out near a work's edge or its own frame."""
    X = s.grid()
    views, facings = [], []
    for p, cam in cams.items():
        col, wgt, res, view = sample(images[p], cam, X, masks[p])
        if wgt.max() <= 0:
            continue
        facing = np.clip((view * s.n).sum(-1), 0, 1)
        quality = (res * facing) ** sharp * (facing > 0.08)
        # where this photo truly sees the spot (inside its frame, not behind a work), feathering aside
        sees = (wgt > 0) | ((masks[p] is not None) & (quality > 0) & _near_mask_only(images[p], cam, X, masks[p]))
        views.append((col * gains[p][None, None, :], wgt, quality, sees)); facings.append(facing)
    best = np.max([q * sv for _, _, q, sv in views], axis=0) if views else np.zeros((s.H, s.W))
    acc = np.zeros((s.H, s.W, 3), np.float64); wsum = np.zeros((s.H, s.W))
    cols, ws = [], []
    steep = np.zeros((s.H, s.W))
    for (col, wgt, quality, sees), facing in zip(views, facings):
        q = wgt * quality * (quality >= 0.1 * best)
        acc += col * q[..., None]; wsum += q
        cols.append(col); ws.append(q)
        steep = np.maximum(steep, np.where(q > 0, facing, 0))
    out = acc / np.maximum(wsum, 1e-12)[..., None]
    if len(cols) > 1:
        out = multiband(cols, ws, out, wsum > 0)
    dis = np.zeros((s.H, s.W)); wn = np.zeros((s.H, s.W))
    for col, q in zip(cols, ws):
        qn = (q > 0).astype(float)
        dis += qn * np.abs(col - out).mean(-1); wn += qn
    dis = dis / np.maximum(wn, 1)
    # seen only at a grazing angle is not really seen: the photo's pixels smear along the surface there
    cover = ((wsum > 0) & (steep >= GRAZING)).astype(np.float32)
    return np.clip(out, 0, 255).astype(np.uint8), cover, dis, wn


def multiband(cols, ws, base, seen, levels=7):
    """The photos blended band by band (Burt and Adelson): fine detail from the photo that sees each spot
    best, changing over a few pixels, and the broad light from all of them, changing over metres. One photo
    a little brighter than the next (its exposure, the angle it saw the wall at) then leaves no edge where it
    ends: its brightness fades into the others' over a wide band instead."""
    H, W = base.shape[:2]
    levels = int(min(levels, np.log2(max(2, min(H, W))) - 2))
    if levels < 2:
        return base
    wsum = np.maximum(np.sum(ws, axis=0), 1e-12)

    def gauss(img):
        pyr = [img]
        for _ in range(levels):
            pyr.append(cv2.pyrDown(pyr[-1]))
        return pyr

    def lap(img):
        g = gauss(img)
        return [g[i] - cv2.pyrUp(g[i + 1], dstsize=(g[i].shape[1], g[i].shape[0])) for i in range(levels)] + [g[-1]]
    acc = None; norm = None
    for col, q in zip(cols, ws):
        c = np.where((q > 0)[..., None], col, base).astype(np.float32)   # outside its view: the plain blend
        gw = gauss((q / wsum).astype(np.float32))
        lc = lap(c)
        if acc is None:
            acc = [l * w[..., None] for l, w in zip(lc, gw)]; norm = [w.copy() for w in gw]
        else:
            for i in range(levels + 1):
                acc[i] += lc[i] * gw[i][..., None]; norm[i] += gw[i]
    out = acc[-1] / np.maximum(norm[-1], 1e-6)[..., None]
    for i in range(levels - 1, -1, -1):
        out = cv2.pyrUp(out, dstsize=(acc[i].shape[1], acc[i].shape[0])) + acc[i] / np.maximum(norm[i], 1e-6)[..., None]
    return np.where(seen[..., None], out, base)


def _near_mask_only(img, cam, X, mask):
    """Spots a photo sees but whose weight was faded to zero only for being close to a work's mask."""
    r, c = X.shape[:2]
    uv, z = project(cam, X.reshape(-1, 3))
    h, w = img.shape[:2]
    mx = uv[:, 0].reshape(r, c).astype(np.float32); my = uv[:, 1].reshape(r, c).astype(np.float32)
    inside = (z.reshape(r, c) > 0.2) & (mx > 1) & (my > 1) & (mx < w - 2) & (my < h - 2)
    m = cv2.remap(mask.astype(np.float32), mx, my, cv2.INTER_NEAREST, borderMode=cv2.BORDER_CONSTANT, borderValue=1)
    return inside & (m < 0.5)


def membrane(img, miss):
    """The smoothest colour field that agrees with the seen surface around each gap (Laplace, solved coarse
    to fine). Where a gap runs off the surface's own edge, the field just carries on."""
    H, W = miss.shape
    k3 = np.ones((3, 3), np.float32)
    V = None
    for scale, iters in ((1 / 16, 800), (1 / 4, 300), (1 / 2, 120)):
        size = (max(4, int(W * scale)), max(4, int(H * scale)))
        s = cv2.resize(img, size, interpolation=cv2.INTER_AREA).astype(np.float32)
        m = cv2.resize(miss.astype(np.uint8), size, interpolation=cv2.INTER_NEAREST) > 0
        known = ~m
        kn = cv2.filter2D(known.astype(np.float32), -1, k3, borderType=cv2.BORDER_REFLECT)
        # seen pixels next to a gap hold their colour; the rest of the gap relaxes between them
        good = known & (cv2.erode(known.astype(np.uint8), k3.astype(np.uint8)) > 0) | (known & (kn >= 9))
        start = np.where(known[..., None], s, (cv2.filter2D(s * known[..., None], -1, np.ones((15, 15), np.float32), borderType=cv2.BORDER_REFLECT) /
                                                np.maximum(cv2.filter2D(known.astype(np.float32), -1, np.ones((15, 15), np.float32), borderType=cv2.BORDER_REFLECT), 1e-6)[..., None]))
        V = start if V is None else np.where(known[..., None], s, cv2.resize(V, size, interpolation=cv2.INTER_LINEAR))
        for _ in range(iters):
            avg = cv2.filter2D(V, -1, k3 / 9, borderType=cv2.BORDER_REFLECT)
            V[m] = avg[m]
    return cv2.resize(V, (W, H), interpolation=cv2.INTER_LINEAR)


def match_edges(out, img, miss):
    """Blend a filled area into what surrounds it: along every edge where it meets seen surface, the colour
    difference is measured and spread smoothly across the fill (a membrane, solved coarse to fine). Where a
    fill runs off the surface's own edge there is nothing to match, so the correction just carries on."""
    H, W = miss.shape
    if not miss.any() or miss.all():
        return out
    k3 = np.ones((3, 3), np.float32)
    C = None
    for scale, iters in ((1 / 16, 800), (1 / 4, 300), (1 / 2, 120)):
        size = (max(4, int(W * scale)), max(4, int(H * scale)))
        s = cv2.resize(out, size, interpolation=cv2.INTER_AREA).astype(np.float32)
        m = cv2.resize(miss.astype(np.uint8), size, interpolation=cv2.INTER_NEAREST) > 0
        known = ~m
        if not known.any():
            return out
        kn = cv2.filter2D(known.astype(np.float32), -1, k3, borderType=cv2.BORDER_REFLECT)
        outside = cv2.filter2D(s * known[..., None], -1, k3, borderType=cv2.BORDER_REFLECT) / np.maximum(kn, 1e-6)[..., None]
        edge = m & (kn > 0)
        C = np.zeros_like(s) if C is None else cv2.resize(C, size, interpolation=cv2.INTER_LINEAR)
        C[edge] = outside[edge] - s[edge]
        free = m & ~edge
        cnt = cv2.filter2D(m.astype(np.float32), -1, k3, borderType=cv2.BORDER_REFLECT)
        for _ in range(iters):
            avg = cv2.filter2D(C * m[..., None], -1, k3, borderType=cv2.BORDER_REFLECT)
            C[free] = (avg / np.maximum(cnt, 1e-6)[..., None])[free]
    Cb = cv2.resize(C, (W, H), interpolation=cv2.INTER_LINEAR)
    res = out.astype(np.float32); res[miss] += Cb[miss]
    return np.clip(res, 0, 255).astype(np.uint8)


def fill_holes(img, cover, feather=0):
    """Where no photo saw the surface: small gaps are continued from their edges at full detail, large
    ones softly from the surrounding colour (both are hidden behind works more often than not).

    feather (pixels): the seen surface right round a gap is often its least trustworthy part (a canvas's
    edge or shadow just outside a work's mask, a doorframe's): a ring that wide is filled too, and blended
    back into what was seen from the gap outward, so the fill starts from clean wall and leaves no seam."""
    miss = (cover == 0)
    if not miss.any() or miss.all():
        return img
    if feather:
        ring = cv2.dilate(miss.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * feather + 1,) * 2)) > 0
        filled = fill_holes(img, (~ring).astype(np.float32))
        d = cv2.distanceTransform((~miss).astype(np.uint8), cv2.DIST_L2, 5)
        a = np.clip(1 - d / feather, 0, 1)[..., None]
        a = a * a * (3 - 2 * a)                                      # a smooth step, no edge of its own
        return np.clip(filled * a + img * (1 - a), 0, 255).astype(np.uint8)
    from . import inpaint
    lam = inpaint.fill(img, miss)
    if lam is not None:
        out = img.copy(); out[miss] = lam[miss]
        # the network keeps edges and texture well but drifts in tone toward the middle of a large area; so
        # the fill's broad light is a smooth membrane stretched from all its seen edges, and only its detail
        # comes from the network
        base = membrane(out, miss)                                   # (out, not img: the gap's black must not bleed into its edge)
        lf = lam.astype(np.float32)                                  # the network's whole picture: no step at the gap's edge
        detail = lf - cv2.GaussianBlur(lf, (0, 0), 6)
        # no stronger than the detail round the gap: it may carry a skirting board's edge on across, but on
        # plain plaster it must not draw an edge of its own (a gap round a work invites the trace of one)
        f = img.astype(np.float32)
        seen_d = np.where(miss[..., None], 0, np.abs(f - cv2.GaussianBlur(f, (0, 0), 6))).max(-1)
        env = cv2.dilate(seen_d, np.ones((31, 31), np.uint8))
        for _ in range(6):                                           # carried into the gap from its edges
            env = np.maximum(env, cv2.dilate(env, np.ones((31, 31), np.uint8)) * miss)
        env = cv2.GaussianBlur(env, (0, 0), 8)[..., None] * 1.2
        detail = np.clip(detail, -env, env)
        out = np.where(miss[..., None], np.clip(base + detail, 0, 255), img).astype(np.uint8)
        # the network works at a coarser scale: give the fill the plaster's own fine grain
        grain = img.astype(np.float32) - cv2.GaussianBlur(img.astype(np.float32), (0, 0), 2)
        sd = min(2.5, float(np.median(np.abs(grain[~miss]))) * 1.48) if (~miss).any() else 0
        noise = cv2.GaussianBlur(np.random.default_rng(0).normal(0, sd, img.shape[:2]).astype(np.float32), (0, 0), 0.7)
        out = np.where(miss[..., None], np.clip(out.astype(np.float32) + noise[..., None], 0, 255), out).astype(np.uint8)
        # soften the seam between seen and filled
        edge = cv2.dilate(miss.astype(np.uint8), np.ones((5, 5), np.uint8)) & ~cv2.erode(miss.astype(np.uint8), np.ones((5, 5), np.uint8))
        blur = cv2.GaussianBlur(out, (0, 0), 1.5)
        out[edge > 0] = blur[edge > 0]
        return out
    out = img.copy()
    # small gaps (up to a few cm wide): inpaint at full resolution
    small = miss & (cv2.distanceTransform(miss.astype(np.uint8), cv2.DIST_L2, 3) <= 6)
    big = miss & ~small
    if big.any():
        lo = cv2.resize(img, None, fx=0.125, fy=0.125, interpolation=cv2.INTER_AREA)
        m = cv2.resize(miss.astype(np.uint8), (lo.shape[1], lo.shape[0]), interpolation=cv2.INTER_NEAREST)
        lo = cv2.inpaint(lo, m, 6, cv2.INPAINT_TELEA)
        up = cv2.resize(lo, (img.shape[1], img.shape[0]), interpolation=cv2.INTER_CUBIC)
        out[big] = up[big]
    known = (~miss).astype(np.uint8)
    out = cv2.inpaint(out, (miss & ~cv2.dilate(big.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool) | small).astype(np.uint8), 4, cv2.INPAINT_TELEA)
    # a light grain over the soft fill, so it reads as the same plaster as around it
    if big.any():
        grain = img.astype(np.float32) - cv2.GaussianBlur(img.astype(np.float32), (0, 0), 3)
        sd = min(2.5, float(np.median(np.abs(grain[~miss]))) * 1.48) if (~miss).any() else 0   # plaster grain, not fixtures
        noise = cv2.GaussianBlur(np.random.default_rng(0).normal(0, sd, img.shape[:2]).astype(np.float32), (0, 0), 0.7)
        out = np.where(big[..., None], np.clip(out.astype(np.float32) + noise[..., None], 0, 255), out).astype(np.uint8)
    return out


def work_light(work, size_m, images, cams, gains, res=48):
    """The light that fell on a work, as a small map (res wide): photo / the work's own image, blurred.
    1.0 means 'as bright as the reference image'."""
    from .works import load_image
    ref = load_image(work['image'], 400).astype(np.float32)
    w, h = size_m
    rw, rh = res, max(4, int(round(res * h / w)))
    refs = cv2.resize(cv2.GaussianBlur(ref, (0, 0), 6), (rw, rh), interpolation=cv2.INTER_AREA)
    u = (np.arange(rw) + 0.5) / rw; v = (np.arange(rh) + 0.5) / rh
    U, V = np.meshgrid(u, v)
    Xl = np.stack([(U - 0.5) * w, (0.5 - V) * h, np.zeros_like(U)], -1)
    X = Xl @ work['R'].T + work['c']
    acc = np.zeros((rh, rw, 3)); wsum = np.zeros((rh, rw))
    for p, cam in cams.items():
        img = cv2.GaussianBlur(images[p], (0, 0), 3)
        col, wgt, resn, view = sample(img, cam, X, None, edge=8)
        facing = np.clip((view * work['R'][:, 2]).sum(-1), 0, 1)
        q = wgt * resn * facing ** 2
        if q.max() <= 0 or (wgt > 0.5).mean() < 0.6:
            continue
        acc += (col * gains[p]) * q[..., None]; wsum += q
    if wsum.max() <= 0:
        return None
    seen = acc / np.maximum(wsum, 1e-9)[..., None]
    ratio = (seen + 4) / (refs + 4)
    # light from a spot falls off smoothly across a canvas: fit a gentle surface (quadratic in u and v) to the
    # ratio, so no trace of the painting's own shapes (or of a slight misregistration) gets into the light
    # one brightness for all three channels: the light from gallery spots is white, so the work keeps the
    # true colours of its own image (a channel fitted on its own drifts at the corners into colour casts)
    ratio = ratio.mean(-1)
    sel = np.isfinite(ratio) & (refs.mean(-1) > 12)
    A = np.column_stack([np.ones(U.size), U.ravel(), V.ravel(), U.ravel() ** 2, V.ravel() ** 2, (U * V).ravel()])
    y = np.log(np.clip(ratio, 0.05, 20)).ravel()
    coef, *_ = np.linalg.lstsq(A[sel.ravel()], y[sel.ravel()], rcond=None)
    fit = np.exp(A @ coef).reshape(ratio.shape)
    # keep the light's shape (brighter under the spot, falling off at the edges), not the photo's exposure;
    # a spot never makes one part of a canvas more than ~1.5x another, so anything steeper is a poor fit
    fit = fit / np.median(fit)
    fit = np.clip(fit, 0.8, 1.2)
    return np.repeat(fit[..., None], 3, -1).astype(np.float32)
