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

    # Drifting clouds: small pixel clouds in the plate's sky whites. They live in the top band of
    # sky (above the hero copy) and fade out before the observatory, which they cannot pass behind.
    crng = np.random.default_rng(11)                  # separate seed: falls and lanterns stay identical
    tones = [(255, 255, 255), (238, 247, 255), (207, 232, 252), (169, 212, 247)]
    layers["clouds"] = []
    for i, (w, h, speed, y) in enumerate([(56, 16, 170, 2.0), (40, 12, 125, 6.5), (28, 9, 100, 3.5)]):
        yy, xx = np.mgrid[0:h, 0:w]
        body = np.zeros((h, w), bool)
        for _ in range(7):                            # union of puffs along a flat base
            cx = crng.uniform(0.15, 0.85) * w
            r = crng.uniform(0.25, 0.45) * h
            cy = h - r - 1 - crng.uniform(0, 0.25) * h
            body |= (xx - cx) ** 2 / (r * 1.6) ** 2 + (yy - cy) ** 2 / r ** 2 <= 1
        body[h - 2:, :] &= body[h - 3:h - 2, :].repeat(2, axis=0)   # flat underside
        img = np.zeros((h, w, 4), np.uint8)
        top = np.argmax(body, axis=0)
        for x in range(w):
            col = np.where(body[:, x])[0]
            for y0 in col:
                depth = (y0 - top[x]) / max(1, h - top[x])
                tone = tones[0] if depth < 0.2 else tones[1] if depth < 0.55 else tones[2] if depth < 0.85 else tones[3]
                img[y0, x] = (*tone, 255)
        name = f"cloud-{i + 1}.png"
        Image.fromarray(img, "RGBA").save(OUT / name)
        layers["clouds"].append({"src": f"/art/hero/{name}", "w": w, "h": h, "y": y, "duration": speed,
                                 "delay": round(-speed * (0.15 + 0.3 * i), 1)})

    layers["scene"] = {"src": "/art/scene/H-01-plate.png", "w": 640, "h": 360}
    CONFIG.write_text(json.dumps(layers, indent=2) + "\n")
    for p in sorted(OUT.iterdir()):
        print(p.name, p.stat().st_size)


if __name__ == "__main__":
    main()
