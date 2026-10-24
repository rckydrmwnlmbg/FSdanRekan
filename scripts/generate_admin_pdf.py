#!/usr/bin/env python3
"""
Generates docs/PANDUAN_ADMIN_FS_DAN_REKAN.pdf from docs/ADMIN_GUIDE.md (FR-11.4 & SK-06)
using Pillow's built-in multi-page PDF writer so no external third-party packages are needed.
"""

from __future__ import annotations

import textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT_DIR = Path(__file__).resolve().parent.parent
MD_PATH = ROOT_DIR / "docs" / "ADMIN_GUIDE.md"
PDF_PATH = ROOT_DIR / "docs" / "PANDUAN_ADMIN_FS_DAN_REKAN.pdf"


def generate_pdf() -> None:
    text = MD_PATH.read_text(encoding="utf-8")
    raw_lines = text.splitlines()

    wrapped_lines: list[str] = []
    for line in raw_lines:
        stripped = line.strip()
        if not stripped:
            wrapped_lines.append("")
        elif stripped.startswith("#"):
            wrapped_lines.append(stripped)
        else:
            wrapped_lines.extend(textwrap.wrap(stripped, width=88))

    page_w, page_h = 1240, 1754  # A4 at ~150 DPI
    margin_x, margin_y = 90, 100
    line_height = 30
    lines_per_page = (page_h - 2 * margin_y) // line_height

    font = ImageFont.load_default()
    pages: list[Image.Image] = []

    for start in range(0, max(1, len(wrapped_lines)), lines_per_page):
        chunk = wrapped_lines[start : start + lines_per_page]
        page = Image.new("RGB", (page_w, page_h), (255, 255, 255))
        draw = ImageDraw.Draw(page)

        # Header bar
        draw.rectangle([margin_x, 48, page_w - margin_x, 52], fill=(197, 168, 128))
        draw.text(
            (margin_x, 60),
            "Ferdinan Silalahi dan Rekan Law Firm - Panduan Admin (SK-06 / FR-11.4)",
            fill=(7, 30, 56),
            font=font,
        )

        y = margin_y
        for line in chunk:
            safe_line = line.encode("latin-1", "replace").decode("latin-1")
            color = (7, 30, 56) if line.startswith("#") else (20, 24, 33)
            draw.text((margin_x, y), safe_line, fill=color, font=font)
            y += line_height

        pages.append(page)

    PDF_PATH.parent.mkdir(parents=True, exist_ok=True)
    pages[0].save(
        PDF_PATH,
        "PDF",
        resolution=150.0,
        save_all=True,
        append_images=pages[1:],
    )
    print(f"Generated {PDF_PATH} ({len(pages)} pages)")


if __name__ == "__main__":
    generate_pdf()
