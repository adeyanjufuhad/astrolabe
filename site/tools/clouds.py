"""Generate horizontally tileable, billowy cloud layers as WebP (Pillow only).

Each cloud is built from many lit "puff" sprites (bright top, blue-grey
underside), composited back to front, then its edges are eroded with
wrapping fractal noise so they turn wispy.

usage: python -I site/tools/clouds.py site/assets [preview.png]   (needs Pillow)
"""
import math
import random
import sys
from PIL import Image, ImageChops, ImageDraw, ImageFilter

OUT = sys.argv[1]
S = 256  # puff sprite size


def make_puff():
    a = Image.new("L", (S, S), 0)
    ImageDraw.Draw(a).ellipse((S * 0.12, S * 0.12, S * 0.88, S * 0.88), fill=255)
    a = a.filter(ImageFilter.GaussianBlur(S * 0.07))
    # light comes from the top: vertical ramp plus a soft core highlight
    shade = Image.new("L", (S, S))
    for y in range(S):
        t = y / (S - 1)
        shade.paste(int(255 * max(0, min(1, (t - 0.28) / 0.6)) ** 1.4), (0, y, S, y + 1))
    hi = Image.new("L", (S, S), 0)
    ImageDraw.Draw(hi).ellipse((S * 0.25, S * 0.14, S * 0.7, S * 0.5), fill=255)
    hi = hi.filter(ImageFilter.GaussianBlur(S * 0.1))
    shade = ImageChops.subtract(shade, hi)
    white = Image.new("RGB", (S, S), (255, 255, 255))
    grey = Image.new("RGB", (S, S), (156, 182, 220))
    rgb = Image.composite(grey, white, shade.point(lambda v: int(v * 0.85)))
    p = rgb.convert("RGBA")
    p.putalpha(a)
    return p


PUFF = make_puff()
_cache = {}


def puff(r):
    k = max(8, int(r // 4) * 4)
    if k not in _cache:
        _cache[k] = PUFF.resize((k * 2, k * 2), Image.LANCZOS)
    return _cache[k]


def tile_noise(W, H, cell, rnd):
    w, h = max(2, W // cell), max(2, H // cell)
    small = Image.new("L", (w, h))
    small.putdata([rnd.randint(0, 255) for _ in range(w * h)])
    pad = 4
    ext = Image.new("L", (w + pad, h))
    ext.paste(small, (0, 0))
    ext.paste(small.crop((0, 0, pad, h)), (w, 0))
    big = ext.resize((int(W * (w + pad) / w), H), Image.BICUBIC)
    return big.crop((0, 0, W, H))


def fbm(W, H, rnd):
    out = tile_noise(W, H, 180, rnd)
    for cell, wgt in ((70, 0.45), (28, 0.3), (11, 0.18)):
        out = Image.blend(out, tile_noise(W, H, cell, rnd), wgt)
    # stretch contrast back out after blending
    return out.point(lambda v: max(0, min(255, int((v - 128) * 2.2 + 128))))


def cumulus(rnd, cx, base, width, height):
    """Puff list for one cloud: big rounded towers, small billows on the rim."""
    puffs = []
    n = int(width / 14) + 20
    for _ in range(n):
        t = rnd.random()
        x = cx + (t - 0.5) * width
        env = math.sin(math.pi * t) ** 0.8  # height envelope along the cloud
        r = height * rnd.paretovariate(2.6) * 0.18 * (0.4 + env)
        r = max(min(r, height * 0.55), height * 0.11)
        top = base - height * env * rnd.uniform(0.25, 1.0)
        y = rnd.uniform(top, base - r * 0.3)
        puffs.append((x, y, r))
    puffs.sort(key=lambda p: p[1] - p[2] * 0.2)  # draw higher puffs first, lower in front
    return puffs


def layer(name, W, H, clouds, seed, erode=0.55, alpha_max=255, wisp_blur=1.2):
    rnd = random.Random(seed)
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for c in clouds:
        for (x, y, r) in cumulus(rnd, *c):
            sp = puff(r)
            for ox in (-W, 0, W):
                px, py = int(x + ox - sp.width / 2), int(y - sp.height / 2)
                if px > W or px + sp.width < 0:
                    continue
                img.alpha_composite(sp, (max(px, 0), max(py, 0)),
                                    (max(0, -px), max(0, -py)))
    a = img.getchannel("A").point(lambda v: min(255, int(v * 1.7)))
    n = fbm(W, H, rnd)
    # erode: alpha + noise - bias, so thin edges get eaten into wisps and the core stays solid
    bias = int(255 * erode)
    a = ImageChops.add(a, n, scale=1.0, offset=-bias)
    a = a.point(lambda v: min(255, int(v * 1.25)))
    a = a.filter(ImageFilter.GaussianBlur(wisp_blur))
    a = ImageChops.multiply(a, img.getchannel("A").point(lambda v: min(255, v * 3)))
    if alpha_max < 255:
        a = a.point(lambda v: v * alpha_max // 255)
    img.putalpha(a)
    path = f"{OUT}/{name}.webp"
    img.save(path, "WEBP", quality=72, method=6, alpha_quality=85)
    print(path, img.size)
    return img


r = random.Random(4)
W = 2400
far = layer("clouds-far", W, 360,
            [(r.uniform(0, W), r.uniform(180, 330), r.uniform(180, 420), r.uniform(50, 95)) for _ in range(10)],
            11, erode=0.6, alpha_max=190)
mid = layer("clouds-mid", W, 520,
            [(x + r.uniform(-120, 120), r.uniform(400, 500), r.uniform(420, 760), r.uniform(150, 240))
             for x in range(150, W, 560)],
            23, erode=0.55)
near = layer("clouds-near", W, 760,
             [(x + r.uniform(-150, 150), r.uniform(690, 750), r.uniform(700, 1050), r.uniform(330, 470))
              for x in (200, 1000, 1700)],
             37, erode=0.5)
front = layer("clouds-front", W, 320,
              [(x + r.uniform(-100, 100), 310, r.uniform(600, 900), r.uniform(110, 160)) for x in range(0, W, 600)],
              53, erode=0.62, alpha_max=230, wisp_blur=2)

if len(sys.argv) > 2:
    sky = Image.new("RGBA", (W, 1000))
    top, bot = (24, 104, 224), (150, 200, 250)
    for y in range(1000):
        t = y / 1000
        sky.paste(tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3)) + (255,), (0, y, W, y + 1))
    for im, y in ((far, 60), (mid, 300), (near, 300), (front, 690)):
        sky.alpha_composite(im, (0, y))
    sky.convert("RGB").resize((1200, 500), Image.LANCZOS).save(sys.argv[2])
