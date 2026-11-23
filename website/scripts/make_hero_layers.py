"""Build the animated layers of the H-01 hero from the clean observatory plate.

The hero is the static plate (crisp <img>, image-rendering: pixelated) plus small CSS sprite
sheets for the parts that move. That keeps every art pixel square at any viewport width,
which a scaled video cannot, and weighs a fraction of a video.

    python -P website/scripts/make_hero_layers.py

Writes website/public/art/hero/ and website/src/content/hero-layers.json (positions in
native 640x360 scene pixels, read by the hero component).
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
PLATE = ROOT / "website" / "public" / "art" / "scene" / "H-01-plate.png"
OUT = ROOT / "website" / "public" / "art" / "hero"
CONFIG = ROOT / "website" / "src" / "content" / "hero-layers.json"

FALLS = [(361, 385), (426, 452)]           # waterfall columns (native x ranges)
FALL_Y = (150, 292)                        # water plus spray
LANTERNS = [209, 302, 394, 486, 572]       # lantern centres (native x)
LANTERN_Y = (236, 270)
FRAMES = 12                                # 12 frames at 12 fps = 1 s cycle; 12 s scene period is a multiple
rng = np.random.default_rng(7)             # fixed seed: identical output on every build


def foliage_mask(region: np.ndarray, name: str) -> np.ndarray:
    """Plants only: saturated greens, white petals and violet lupine spikes. Grey-green stone and
    limestone are excluded, so walls and buildings never move."""
    r, g, b = (region[..., k] for k in range(3))
    green = (g > r + 12) & (g > b + 4) & (g > 60)
    petals = (r > 205) & (g > 205) & (b > 195) & (name not in ("moss", "tree"))
    lupine = (b > r + 15) & (r > g + 10) & name.startswith("lupines")
    return green | petals | lupine


def components(mask: np.ndarray) -> np.ndarray:
    """4-connected labels of the plant mask (0 = background)."""
    labels = np.zeros(mask.shape, np.int32)
    h, w = mask.shape
    current = 0
    for sy, sx in zip(*np.nonzero(mask)):
        if labels[sy, sx]:
            continue
        current += 1
        stack = [(sy, sx)]
        labels[sy, sx] = current
        while stack:
            y, x = stack.pop()
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not labels[ny, nx]:
                    labels[ny, nx] = current
                    stack.append((ny, nx))
    return labels


def inpaint(region: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """What is behind the plants: each plant pixel takes the nearest non-plant pixel in its row
    (or column), so a plant can move without dragging the wall behind it."""
    out = region.copy()
    h, w = mask.shape
    for y, x in zip(*np.nonzero(mask)):
        for r in range(1, 8):
            for ny, nx in ((y, x - r), (y, x + r), (y - r, x), (y + r, x)):
                if 0 <= ny < h and 0 <= nx < w and not mask[ny, nx]:
                    out[y, x] = region[ny, nx]
                    break
            else:
                continue
            break
    return out


def sway_strip(region, x0, amp, anchor, name, rng, frames):
    """Each plant (connected component) sways from its own base: the background stays fixed and the
    plant's pixels are redrawn shifted, the shift growing with height above the base."""
    mask = foliage_mask(region, name)
    labels = components(mask)
    background = inpaint(region, mask)
    h, w = mask.shape
    count = labels.max()
    tops = np.full(count + 1, h, np.int32)
    bottoms = np.zeros(count + 1, np.int32)
    ys, xs = np.nonzero(labels)
    ls = labels[ys, xs]
    np.minimum.at(tops, ls, ys)
    np.maximum.at(bottoms, ls, ys)
    gain = rng.uniform(0.7, 1.3, count + 1)           # every plant its own strength…
    jitter = rng.uniform(-0.6, 0.6, count + 1)        # …and a small phase offset
    height = np.maximum(1, bottoms[ls] - tops[ls])
    rel = (bottoms[ls] - ys) / height if anchor == "bottom" else (ys - tops[ls]) / height
    sheet = np.zeros((h, w * frames, 3), np.uint8)
    colours = region[ys, xs]
    order = np.argsort(rel)                           # draw bases first, tips last
    for f in range(frames):
        frame = background.copy()
        phase = 2 * math.pi * f / frames - 2 * math.pi * (x0 + xs) / 96 + jitter[ls]
        d = np.rint(amp * gain[ls] * rel ** 1.2 * np.sin(phase)).astype(int)
        nx = np.clip(xs + d, 0, w - 1)
        frame[ys[order], nx[order]] = colours[order]
        sheet[:, f * w:(f + 1) * w] = frame.astype(np.uint8)
    return sheet, h, w


def make_cloud(w: int, h: int, rng, tones) -> np.ndarray:
    """A pixel cloud: a union of puffs on a flat base, shaded light-on-top in four tones."""
    yy, xx = np.mgrid[0:h, 0:w]
    body = np.zeros((h, w), bool)
    for _ in range(7):
        cx = rng.uniform(0.15, 0.85) * w
        r = rng.uniform(0.25, 0.45) * h
        cy = h - r - 1 - rng.uniform(0, 0.25) * h
        body |= (xx - cx) ** 2 / (r * 1.6) ** 2 + (yy - cy) ** 2 / r ** 2 <= 1
    body[h - 2:, :] &= body[h - 3:h - 2, :].repeat(2, axis=0)
    img = np.zeros((h, w, 4), np.uint8)
    top = np.argmax(body, axis=0)
    for x in range(w):
        for y0 in np.where(body[:, x])[0]:
            depth = (y0 - top[x]) / max(1, h - top[x])
            tone = tones[0] if depth < 0.2 else tones[1] if depth < 0.55 else tones[2] if depth < 0.85 else tones[3]
            img[y0, x] = (*tone, 255)
    return img


def make_dusk_layers(crng) -> None:
    """The F-01 dusk scene behind the final call to action: waterfalls, lantern glow, twinkling
    stars and slow pink clouds. Writes website/public/art/dusk/ and src/content/dusk-layers.json."""
    src = ROOT / "website" / "public" / "art" / "scene" / "F-01-dusk.png"
    out = ROOT / "website" / "public" / "art" / "dusk"
    out.mkdir(parents=True, exist_ok=True)
    a = np.asarray(Image.open(src).convert("RGB")).astype(np.int32)
    H, W, _ = a.shape
    cfg: dict = {"scene": {"src": "/art/scene/F-01-dusk.png", "w": W, "h": H}, "falls": [], "lanterns": [], "stars": [], "clouds": []}
    drng = np.random.default_rng(31)

    for i, (x0, y0, x1, y1) in enumerate([(278, 92, 313, 153), (318, 92, 349, 153)]):
        region = a[y0:y1, x0:x1]
        r, g, b = (region[..., k] for k in range(3))
        water = (b > 150) & (b - r > 60) & ((r + g + b) / 3 > 105)
        h, w = water.shape
        cols = region[water]
        lum = cols @ np.array([0.3, 0.59, 0.11])
        edges = np.percentile(lum, [0, 25, 50, 75, 100])
        palette = np.array([cols[(lum >= lo) & (lum <= hi)].mean(axis=0) for lo, hi in zip(edges[:-1], edges[1:])]).astype(np.uint8)
        phase = drng.integers(0, 12, size=w)
        speed = drng.choice([1, 2], size=w)
        ys, xs = np.nonzero(water)
        sheet = np.zeros((h, w * 12, 4), np.uint8)
        for f in range(12):
            k = ((ys - f * speed[xs] + phase[xs]) % 12) * len(palette) // 12
            sheet[ys, f * w + xs, :3] = palette[k]
            sheet[ys, f * w + xs, 3] = 255
        name = f"fall-{i + 1}.png"
        Image.fromarray(sheet, "RGBA").save(out / name)
        cfg["falls"].append({"src": f"/art/dusk/{name}", "x": x0, "y": y0, "w": w, "h": h, "frames": 12})

    for i, cx in enumerate([87, 184, 268, 349, 430]):
        x0, x1, y0, y1 = cx - 12, cx + 13, 124, 156
        region = a[y0:y1, x0:x1]
        r, g, b = (region[..., k] for k in range(3))
        glass = (g > 170) & (r > 130) & (b < 140) & (g - b > 70)
        glow = np.zeros((*glass.shape, 4), np.uint8)
        glow[glass, :3] = (region[glass] + (np.array([250, 255, 190]) - region[glass]) * 0.6).clip(0, 255).astype(np.uint8)
        glow[glass, 3] = 255
        name = f"lantern-{i + 1}.png"
        Image.fromarray(glow, "RGBA").save(out / name)
        cfg["lanterns"].append({"src": f"/art/dusk/{name}", "x": x0, "y": y0, "w": x1 - x0, "h": y1 - y0, "delay": round(-4 * i / 5, 2)})

    lum = a.sum(axis=2) / 3
    p = np.pad(lum, 1, mode="edge")
    neighbours = (p[:-2, 1:-1] + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]) / 4
    star = (lum > 200) & (lum - neighbours > 40)
    star[int(H * 0.5):, :] = False
    ys, xs = np.nonzero(star)
    group = drng.integers(0, 3, size=len(ys))
    for gi in range(3):
        img = np.zeros((H, W, 4), np.uint8)
        sel = group == gi
        img[ys[sel], xs[sel]] = (255, 255, 240, 255)
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):     # a small cross so a star can flare
            yy, xx = np.clip(ys[sel] + dy, 0, H - 1), np.clip(xs[sel] + dx, 0, W - 1)
            img[yy, xx] = (220, 226, 255, 255)
        name = f"stars-{gi + 1}.png"
        Image.fromarray(img, "RGBA").save(out / name)
        cfg["stars"].append({"src": f"/art/dusk/{name}", "delay": round(-1.3 * gi, 1), "duration": round(3.2 + 0.9 * gi, 1)})

    tones = [(255, 222, 236), (243, 197, 222), (218, 172, 210), (188, 152, 202)]
    for i, (w, h, speed, y) in enumerate([(46, 12, 180, 14.0), (32, 9, 140, 24.0), (26, 8, 120, 9.0)]):
        img = make_cloud(w, h, crng, tones)
        name = f"cloud-{i + 1}.png"
        Image.fromarray(img, "RGBA").save(out / name)
        cfg["clouds"].append({"src": f"/art/dusk/{name}", "w": w, "h": h, "y": y, "duration": speed, "delay": round(-speed * (0.2 + 0.3 * i), 1)})

    (ROOT / "website" / "src" / "content" / "dusk-layers.json").write_text(json.dumps(cfg, indent=2) + "\n")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    CONFIG.parent.mkdir(parents=True, exist_ok=True)
    base = np.asarray(Image.open(PLATE).convert("RGB")).astype(np.int32)
    r, g, b = base[..., 0], base[..., 1], base[..., 2]
    layers: dict[str, list] = {"falls": [], "lanterns": []}

    water_all = (b > 170) & (g > 140) & (r < 150) & (b - r > 60)
    lum_all = base[water_all] @ np.array([0.3, 0.59, 0.11])
    edges = np.percentile(lum_all, [0, 20, 40, 60, 80, 100])
    wc = base[water_all]
    palette = np.array([wc[(lum_all >= lo) & (lum_all <= hi)].mean(axis=0) for lo, hi in zip(edges[:-1], edges[1:])]).astype(np.uint8)
    n = len(palette)

    for i, (x0, x1) in enumerate(FALLS):
        bx0, bx1, by0, by1 = x0 - 3, x1 + 4, FALL_Y[0], FALL_Y[1]
        region = base[by0:by1, bx0:bx1]
        rr, gg, bb = region[..., 0], region[..., 1], region[..., 2]
        water = (bb > 170) & (gg > 140) & (rr < 150) & (bb - rr > 60)
        water[region.shape[0] - 24:, :] = False          # bottom band is spray only
        # Only the falling water itself: the colour test also catches sky seen through the wall's
        # arches and balustrade, and patches of mist, which then flickered with the water.
        labels = components(water)
        sizes = np.bincount(labels.ravel())
        sizes[0] = 0
        water = labels == int(sizes.argmax())
        h, w = water.shape
        phase = rng.integers(0, 12, size=w)
        speed = rng.choice([1, 2], size=w)                # 12 or 6 frames per stripe cycle
        spray = [(int(rng.integers(h - 30, h - 4)), int(rng.integers(0, w)), int(rng.choice([3, 4, 6])), int(rng.integers(0, 6)))
                 for _ in range(16)]
        sheet = np.zeros((h, w * FRAMES, 4), np.uint8)
        ys, xs = np.where(water)
        for f in range(FRAMES):
            frame = np.zeros((h, w, 4), np.uint8)
            k = ((ys - f * speed[xs] + phase[xs]) % 12) * n // 12
            frame[ys, xs, :3] = palette[k]
            frame[ys, xs, 3] = 255
            for y, x, p, ph in spray:
                if (f + ph) % p < max(1, p // 3):
                    frame[y, x] = (240, 252, 255, 255)
            sheet[:, f * w:(f + 1) * w] = frame
        name = f"fall-{i + 1}.png"
        Image.fromarray(sheet, "RGBA").save(OUT / name)
        layers["falls"].append({"src": f"/art/hero/{name}", "x": bx0, "y": by0, "w": w, "h": h, "frames": FRAMES})

    for i, cx in enumerate(LANTERNS):
        x0, x1, y0, y1 = cx - 9, cx + 10, LANTERN_Y[0], LANTERN_Y[1]
        region = base[y0:y1, x0:x1]
        rr, gg, bb = (region[..., k] for k in range(3))
        glass = (gg > 190) & (rr > 140) & (bb < 150) & (gg - bb > 80)
        glow = np.zeros((*glass.shape, 4), np.uint8)
        lifted = region + (np.array([250, 255, 170]) - region) * 0.55
        glow[glass, :3] = lifted[glass].clip(0, 255).astype(np.uint8)
        glow[glass, 3] = 255
        name = f"lantern-{i + 1}.png"
        Image.fromarray(glow, "RGBA").save(OUT / name)
        layers["lanterns"].append({"src": f"/art/hero/{name}", "x": x0, "y": y0, "w": x1 - x0, "h": y1 - y0,
                                   "delay": round(-6 * i / len(LANTERNS), 2)})

    # Wind: foliage sways in 16-frame strips (2 s at 8 fps). Only foliage pixels move; stone, sky and
    # buildings never do. Displacement grows with distance from where the plant is anchored, and the
    # phase follows absolute x, so gusts travel across the scene and neighbouring regions agree.
    SWAY_FRAMES = 16
    sway_regions = [
        # name, box (x0, y0, x1, y1), amplitude in art px, anchor: "bottom" (rooted) or "top" (hanging)
        ("lupines-left", (0, 284, 34, 360), 2, "bottom"),
        ("lupines-right", (606, 284, 640, 360), 2, "bottom"),
        ("grass", (34, 318, 606, 360), 2, "bottom"),
        ("moss", (34, 296, 606, 318), 1, "top"),
        ("tree", (355, 135, 415, 186), 1, "bottom"),
    ]
    layers["sway"] = []
    wrng = np.random.default_rng(23)
    for name, (x0, y0, x1, y1), amp, anchor in sway_regions:
        region = base[y0:y1, x0:x1].astype(np.int32)
        sheet, h, w = sway_strip(region, x0, amp, anchor, name, wrng, SWAY_FRAMES)
        fname = f"sway-{name}.png"
        Image.fromarray(sheet, "RGB").save(OUT / fname)
        layers["sway"].append({"src": f"/art/hero/{fname}", "x": x0, "y": y0, "w": w, "h": h, "frames": SWAY_FRAMES})

    # Drifting clouds. "clouds": top band of sky, above the hero copy. "cloudsLow": smaller, paler
    # (more distant) clouds drifting along the mountains. Both fade out before the observatory,
    # which a page layer cannot pass behind. y is a percentage of the scene.
    crng = np.random.default_rng(11)                  # separate seed: falls and lanterns stay identical
    bands = {
        "clouds": ([(255, 255, 255), (238, 247, 255), (207, 232, 252), (169, 212, 247)],
                   [(56, 16, 170, 7.2), (40, 12, 125, 10.6), (28, 9, 100, 8.4)]),
        "cloudsLow": ([(236, 246, 254), (219, 237, 252), (196, 224, 248), (172, 208, 242)],
                      [(34, 9, 210, 63.0), (24, 7, 160, 66.5), (44, 10, 260, 64.5), (20, 6, 140, 68.0)]),
    }
    for band, (tones, specs) in bands.items():
        layers[band] = []
        for i, (w, h, speed, y) in enumerate(specs):
            img = make_cloud(w, h, crng, tones)
            name = f"{'cloud' if band == 'clouds' else 'cloud-low'}-{i + 1}.png"
            Image.fromarray(img, "RGBA").save(OUT / name)
            layers[band].append({"src": f"/art/hero/{name}", "w": w, "h": h, "y": y, "duration": speed,
                                 "delay": round(-speed * (0.15 + 0.27 * i), 1)})

    make_dusk_layers(crng)

    layers["scene"] = {"src": "/art/scene/H-01-plate.png", "w": 640, "h": 360}
    CONFIG.write_text(json.dumps(layers, indent=2) + "\n")
    for p in sorted(OUT.iterdir()):
        print(p.name, p.stat().st_size)


if __name__ == "__main__":
    main()
