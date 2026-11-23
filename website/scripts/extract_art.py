"""Extract the Optimus pixel art from the supplied presentation boards.

The asset pack was delivered only as boards (assets/source/), not as individual files.
This script cuts every sprite and scene out of those boards, snaps it back to a native
pixel grid, reduces it to a fixed palette and writes small, crisp PNGs for the website.
Re-run it whenever a source board changes:  python -P website/scripts/extract_art.py

Native scale: the hero scene is 640x360 art pixels; hero agents are about 80 art pixels tall,
so sprites and scene share one pixel size when both are scaled by the same factor.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "assets" / "source"
OUT = ROOT / "website" / "public" / "art"

SHEET_BG = np.array([252, 246, 238])  # flat cream behind every sprite on asset-pack-sheet.png
AGENT_SCALE = 80 / 146                  # the standing Contract agent (146 board px) becomes 80 art px
EYE = (125, 247, 249)                   # the agents' cyan eyes, sampled from the board
LID = (66, 150, 168)                    # closed-eye lid line


def load_rgb(name: str) -> np.ndarray:
    return np.asarray(Image.open(SRC / name).convert("RGB")).astype(np.int32)


def regrid(rgb: np.ndarray, alpha: np.ndarray | None, size: tuple[int, int], colours: int) -> Image.Image:
    """Area-average down to the native grid, then snap colours and alpha so every art pixel is solid."""
    h, w = rgb.shape[:2]
    if alpha is None:
        img = Image.fromarray(rgb.astype(np.uint8), "RGB").resize(size, Image.BOX)
        return img.quantize(colours, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
    a = alpha.astype(np.float32)
    premult = (rgb * a[..., None]).astype(np.float32)
    small_rgb = np.asarray(Image.fromarray(premult.astype(np.uint8), "RGB").resize(size, Image.BOX)).astype(np.float32)
    small_a = np.asarray(Image.fromarray((a * 255).astype(np.uint8), "L").resize(size, Image.BOX)).astype(np.float32) / 255
    solid = small_a >= 0.5
    colour = np.where(small_a[..., None] > 0, small_rgb / np.maximum(small_a[..., None], 1e-6), 0)
    colour = np.clip(colour, 0, 255).astype(np.uint8)
    q = Image.fromarray(colour, "RGB").quantize(colours, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
    rgba = np.dstack([np.asarray(q), np.where(solid, 255, 0).astype(np.uint8)])
    return Image.fromarray(rgba, "RGBA")


def key_sprite(rgb: np.ndarray) -> np.ndarray:
    """Alpha mask: everything except the cream board *connected to the crop's edges* and the
    soft grey floor shadow. Flood filling keeps enclosed near-white parts (clipboard paper)."""
    from PIL import ImageDraw

    diff = np.abs(rgb - SHEET_BG).sum(axis=2)
    # .copy(): fromarray can share the NumPy buffer, and floodfill must write into its own pixels.
    near_bg = Image.fromarray(np.where(diff <= 48, 255, 0).astype(np.uint8), "L").copy()
    h, w = diff.shape
    border = [(x, 0) for x in range(w)] + [(x, h - 1) for x in range(w)] + [(0, y) for y in range(h)] + [(w - 1, y) for y in range(h)]
    for point in border:
        if near_bg.getpixel(point) == 255:
            ImageDraw.floodfill(near_bg, point, 128)
    alpha = (np.asarray(near_bg) != 128).astype(np.float32)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    spread = rgb.max(axis=2) - rgb.min(axis=2)
    light_grey = (spread < 28) & (rgb.min(axis=2) > 150)
    floor = np.zeros_like(alpha, dtype=bool)
    floor[int(rgb.shape[0] * 0.86):, :] = True
    alpha[light_grey & floor] = 0
    return alpha


def blink(sprite: Image.Image) -> Image.Image:
    """Closed-eye frame made from the open-eye frame, so both frames match pixel for pixel."""
    a = np.asarray(sprite).copy()
    r, g, b = (a[..., i].astype(int) for i in range(3))
    dark = (a[..., 3] > 0) & (r < 60) & (g < 60) & (b < 80)
    # An eye is cyan surrounded by the dark visor; lens glints and code tiles are not.
    pad = np.pad(dark, 3)
    h, w = dark.shape
    dark_share = sum(pad[dy:dy + h, dx:dx + w] for dy in range(7) for dx in range(7)) / 49
    eyes = (a[..., 3] > 0) & np.all(a[..., :3] == EYE, axis=2) & (dark_share >= 0.4)
    if eyes.any():
        visor = a[dark]
        dark = visor[:, :3].mean(axis=0).astype(np.uint8) if len(visor) else np.array([24, 22, 34], np.uint8)
        a[eyes, :3] = dark
        ys, xs = np.where(eyes)
        for x in np.unique(xs):
            a[ys[xs == x].max(), x, :3] = LID
    return Image.fromarray(a, "RGBA")


def crop_sprite(sheet: np.ndarray, box: tuple[int, int, int, int]) -> Image.Image:
    x0, y0, x1, y1 = box
    rgb = sheet[y0:y1, x0:x1]
    alpha = key_sprite(rgb)
    size = (max(1, round((x1 - x0) * AGENT_SCALE)), max(1, round((y1 - y0) * AGENT_SCALE)))
    img = regrid(rgb, alpha, size, 32)
    # Pin the cyan eyes: averaging blends them into the dark visor and drifts them green.
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    eye_mask = ((g > 200) & (b > 200) & (r < 175) & (g - r > 55)).astype(np.uint8) * 255
    cover = np.asarray(Image.fromarray(eye_mask, "L").resize(size, Image.BOX)) / 255
    a = np.asarray(img).copy()
    a[(cover >= 0.3) & (a[..., 3] > 0), :3] = EYE
    # Remove cream specks left on the outline: board-coloured pixels touching transparency.
    solid = a[..., 3] > 0
    pad = np.pad(solid, 1, constant_values=False)
    touches_clear = ~(pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:])
    creamy = np.abs(a[..., :3].astype(int) - SHEET_BG).sum(axis=2) < 70
    a[solid & touches_clear & creamy, 3] = 0
    img = Image.fromarray(a, "RGBA")
    bbox = img.getbbox()
    return img.crop(bbox) if bbox else img


def strip(frames: list[Image.Image]) -> tuple[Image.Image, dict]:
    """Bottom-centred frames on one shared canvas, laid out left to right."""
    w = max(f.width for f in frames) + 2
    h = max(f.height for f in frames) + 1
    out = Image.new("RGBA", (w * len(frames), h), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        out.paste(f, (i * w + (w - f.width) // 2, h - 1 - f.height), f)
    return out, {"frameWidth": w, "frameHeight": h, "frames": len(frames)}


def split_pair(sheet: np.ndarray, x0: int, x1: int, y0: int, y1: int) -> tuple[tuple, tuple]:
    """Two touching sprites: cut at the emptiest column in the middle third."""
    mask = np.abs(sheet[y0:y1, x0:x1] - SHEET_BG).sum(axis=2) > 48
    cols = mask.sum(axis=0)
    third = (x1 - x0) // 3
    cut = third + int(np.argmin(cols[third:2 * third]))
    return (x0, y0, x0 + cut, y1), (x0 + cut, y0, x1, y1)


def main() -> None:
    (OUT / "agents").mkdir(parents=True, exist_ok=True)
    (OUT / "editorial").mkdir(parents=True, exist_ok=True)
    (OUT / "scene").mkdir(parents=True, exist_ok=True)
    sheet = load_rgb("asset-pack-sheet.png")
    manifest: dict[str, dict] = {}

    # Boxes measured by column projection against the cream board (y 42-200 band).
    runner_main, runner_blink = split_pair(sheet, 289, 528, 60, 200)
    evidence_main, evidence_blink = split_pair(sheet, 548, 802, 60, 200)
    pairs = {
        "contract": ((25, 44, 150, 200), (166, 44, 268, 200)),
        "runner": (runner_main, runner_blink),
        "evidence": (evidence_main, evidence_blink),
        "verdict": ((824, 40, 955, 200), (964, 40, 1092, 200)),
    }
    # The board's own blink drawings are smaller than the main poses, so a swap would make the
    # character shrink. Blink frames are synthesised from the main frame instead.
    for name, (main_box, _board_blink) in pairs.items():
        main_frame = crop_sprite(sheet, main_box)
        img, meta = strip([main_frame, blink(main_frame)])
        img.save(OUT / "agents" / f"{name}.png")
        manifest[name] = meta | {"source": "asset-pack-sheet.png", "box": main_box, "note": "frame 2 = synthesised blink"}

    smith_idle = crop_sprite(sheet, (1150, 44, 1326, 204))
    smith_work = crop_sprite(sheet, (1336, 70, 1518, 204))
    img, meta = strip([smith_idle, blink(smith_idle)])
    img.save(OUT / "agents" / "smith.png")
    manifest["smith"] = meta | {"source": "asset-pack-sheet.png", "note": "blink frame synthesised from the idle pose"}
    smith_work.save(OUT / "agents" / "smith-work.png")
    manifest["smith-work"] = {"frameWidth": smith_work.width, "frameHeight": smith_work.height, "frames": 1}

    # Editorial scenes: inset past the board's rounded corners and label pills.
    tiles = {
        "E-01-contract": (14, 287, 379, 493),
        "E-02-evidence": (404, 287, 761, 493),
        "E-03-verdicts": (786, 287, 1142, 493),
        "E-04-repair": (1168, 287, 1524, 493),
    }
    for name, (x0, y0, x1, y1) in tiles.items():
        w = 320
        h = round(w * (y1 - y0) / (x1 - x0))
        regrid(sheet[y0:y1, x0:x1], None, (w, h), 48).save(OUT / "editorial" / f"{name}.png")
        manifest[name] = {"width": w, "height": h, "source": "asset-pack-sheet.png", "box": [x0, y0, x1, y1]}

    # Dusk scene for the final call to action: the mockup board holds the only full frame.
    kit = load_rgb("website-kit-mockup.png")
    x0, y0, x1, y1 = 14, 738, 650, 990
    w = 480
    h = round(w * (y1 - y0) / (x1 - x0))
    regrid(kit[y0:y1, x0:x1], None, (w, h), 48).save(OUT / "scene" / "F-01-dusk.png")
    manifest["F-01-dusk"] = {"width": w, "height": h, "source": "website-kit-mockup.png", "box": [x0, y0, x1, y1]}

    # Hero plate: the clean observatory image without agents, snapped to 640x360.
    plate = load_rgb("observatory-plate.png")
    regrid(plate, None, (640, 360), 96).save(OUT / "scene" / "H-01-plate.png")
    manifest["H-01-plate"] = {"width": 640, "height": 360, "source": "observatory-plate.png"}

    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({k: {kk: v[kk] for kk in v if kk in ("frameWidth", "frameHeight", "width", "height")} for k, v in manifest.items()}))


if __name__ == "__main__":
    main()
