#!/usr/bin/env python3
"""
M0 Asset Pipeline:
1. Processes images/logo.png (without modifying the original) into:
   - public/logo-seal-transparent.png (transparent seal emblem)
   - public/logo-seal.webp (optimized WebP seal emblem, EXIF stripped)
   - public/favicon.ico & public/icon.png (center shield with FS monogram on #071e38 navy background, DESIGN.md 3A)
   - public/og-default.webp (1200x630 Open Graph image)
2. Fetches and optimizes background/editorial images from https://fhspdemo.vercel.app/images/
   into public/images/*.webp with all EXIF metadata stripped.
"""

from __future__ import annotations

import io
import math
import urllib.request
from pathlib import Path
from PIL import Image, ImageDraw

ROOT_DIR = Path(__file__).resolve().parent.parent
IMAGES_DIR = ROOT_DIR / "images"
PUBLIC_DIR = ROOT_DIR / "public"
PUBLIC_IMAGES_DIR = PUBLIC_DIR / "images"

DEMO_BASE_URL = "https://fhspdemo.vercel.app/images/"
DEMO_IMAGE_NAMES = [
    "hero-bg.jpg",
    "practice-corporate.jpg",
    "article-land.jpg",
    "lady-justice.jpg",
    "hero-slide-courtroom.jpg",
    "practice-ip.jpg",
    "practice-labor.jpg",
    "practice-bankruptcy.jpg",
    "gavel-banner.jpg",
    "practice-banking.jpg",
    "article-family.jpg",
]


def process_logo() -> None:
    logo_src = IMAGES_DIR / "logo.png"
    if not logo_src.exists():
        raise FileNotFoundError(f"Missing {logo_src}")

    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)

    with Image.open(logo_src) as raw:
        rgba = raw.convert("RGBA")
        w, h = rgba.size

        # Make outer corners outside the circular seal transparent if near-white
        pixels = rgba.load()
        cx, cy = w / 2.0, h / 2.0
        max_r = min(w, h) * 0.485
        for y in range(h):
            for x in range(w):
                r, g, b, a = pixels[x, y]
                dist = math.hypot(x - cx, y - cy)
                if dist > max_r and r > 235 and g > 235 and b > 235:
                    pixels[x, y] = (r, g, b, 0)

        seal_512 = rgba.resize((512, 512), Image.Resampling.LANCZOS)
        clean_seal = Image.frombytes("RGBA", (512, 512), seal_512.tobytes())
        clean_seal.save(PUBLIC_DIR / "logo-seal-transparent.png", format="PNG", optimize=True)
        clean_seal.save(PUBLIC_DIR / "logo-seal.webp", format="WEBP", quality=90, method=6)

        # Extract center shield ("FS" monogram) for favicon (DESIGN.md Section 3A)
        # Center ~42% of the seal contains the shield with monogram FS
        crop_box = (
            int(w * 0.29),
            int(h * 0.28),
            int(w * 0.71),
            int(h * 0.72),
        )
        shield_crop = rgba.crop(crop_box)
        icon_bg = Image.new("RGBA", (192, 192), (7, 30, 56, 255))  # #071e38 (--color-navy)
        shield_resized = shield_crop.resize((164, 164), Image.Resampling.LANCZOS)
        icon_bg.paste(shield_resized, (14, 14), shield_resized)

        clean_icon = Image.frombytes("RGBA", (192, 192), icon_bg.tobytes())
        clean_icon.save(PUBLIC_DIR / "icon.png", format="PNG", optimize=True)

        favicon_32 = clean_icon.resize((32, 32), Image.Resampling.LANCZOS)
        favicon_32.save(PUBLIC_DIR / "favicon.ico", format="ICO", sizes=[(32, 32)])

        # Generate 1200x630 Open Graph image
        og_img = Image.new("RGB", (1200, 630), (8, 9, 12))  # #08090C
        draw = ImageDraw.Draw(og_img)
        # Subtle gold border frame
        draw.rectangle([28, 28, 1172, 602], outline=(197, 168, 128), width=2)
        seal_og = clean_seal.resize((340, 340), Image.Resampling.LANCZOS)
        og_img.paste(seal_og, ((1200 - 340) // 2, (630 - 340) // 2), seal_og)
        og_img.save(PUBLIC_DIR / "og-default.webp", format="WEBP", quality=88, method=6)


def fetch_and_optimize_demo_images() -> None:
    PUBLIC_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    for name in DEMO_IMAGE_NAMES:
        stem = Path(name).stem
        out_webp = PUBLIC_IMAGES_DIR / f"{stem}.webp"
        if out_webp.exists():
            continue
        url = DEMO_BASE_URL + name
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        data = urllib.request.urlopen(req, timeout=20).read()
        with Image.open(io.BytesIO(data)) as img:
            rgb = img.convert("RGB")
            clean = Image.frombytes("RGB", rgb.size, rgb.tobytes())
            clean.save(out_webp, format="WEBP", quality=82, method=6)
            print(f"Optimized {name} -> {out_webp.name} ({rgb.size})")


def main() -> None:
    process_logo()
    fetch_and_optimize_demo_images()
    print("All M0 visual assets processed successfully.")


if __name__ == "__main__":
    main()
