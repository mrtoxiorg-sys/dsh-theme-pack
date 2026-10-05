# Renders the theme-pack palette preview used by the README (`docs/preview.png`).
#
#   node export-theme-palettes.mjs > theme-pack-palettes.json
#   python make-theme-preview.py
#
# It reads the palette dump produced by the plugin's own engine, so the picture
# cannot drift from what the plugin actually applies.
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
# Accept both layouts: run from the package root, or from the directory that
# holds the package (`<repo>/dsh-theme-pack`).
PACKAGE = HERE if (HERE / "client.js").exists() else HERE / "dsh-theme-pack"
SOURCE = PACKAGE / "theme-pack-palettes.json"
OUTPUT = PACKAGE / "docs" / "preview.png"

BG = (255, 255, 255)
INK = (26, 26, 32)
MUTED = (118, 118, 128)
FRAME = (214, 214, 220)

# Big chips first, then thin bars.
CHIPS = [
    "--dsw-alias-bg-base",
    "--dsw-alias-bg-layer-1",
    "--dsw-alias-bg-layer-2",
    "--dsw-specific-sidebar-fill",
]
BARS = [
    ("--dsw-alias-label-primary", "text"),
    ("--dsw-alias-label-secondary", "muted"),
    ("--dsw-alias-label-tertiary", "faint"),
    ("--dsw-alias-brand-primary", "brand"),
    ("--dsw-alias-button-primary-fill", "action"),
    ("--dsw-alias-border-l2", "border"),
    ("--dsw-alias-markdown-code-block", "code"),
    ("--dsw-alias-scrollbar-bg-l1", "scroll"),
]


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    names = ("segoeuib.ttf", "arialbd.ttf") if bold else ("segoeui.ttf", "arial.ttf", "DejaVuSans.ttf")
    for name in names:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def rgb(value: str) -> tuple[int, int, int]:
    digits = value.lstrip("#")
    return tuple(int(digits[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def draw_palette(
    draw: ImageDraw.ImageDraw, tokens: dict[str, str], x: int, y: int, width: int, label: str
) -> int:
    """Draw one scheme block; returns the y coordinate just below it."""
    draw.text((x, y), label, fill=MUTED, font=font(11, bold=True))
    y += 16

    chip_w = (width - 3 * 4) // 4
    for index, token in enumerate(CHIPS):
        color = rgb(tokens[token]) if token in tokens else (240, 240, 240)
        left = x + index * (chip_w + 4)
        draw.rounded_rectangle([left, y, left + chip_w, y + 26], radius=5, fill=color, outline=FRAME, width=1)
    y += 30

    label_w = 74
    bar_w = width - label_w
    for token, caption in BARS:
        color = rgb(tokens[token]) if token in tokens else (240, 240, 240)
        draw.rounded_rectangle([x, y, x + bar_w, y + 11], radius=3, fill=color, outline=FRAME, width=1)
        draw.text((x + bar_w + 6, y - 1), caption, fill=MUTED, font=font(10))
        y += 13
    return y + 8


def main() -> None:
    # `utf-8-sig` tolerates the BOM PowerShell writes when redirecting the export.
    data = json.loads(SOURCE.read_text(encoding="utf-8-sig"))
    themes = [theme for theme in data["themes"] if theme["light"]]
    columns = 4
    rows = (len(themes) + columns - 1) // columns

    cell_w, cell_h = 336, 356
    margin, gap, header = 20, 14, 56
    width = margin * 2 + columns * cell_w + (columns - 1) * gap
    height = margin * 2 + header + rows * cell_h + (rows - 1) * gap

    image = Image.new("RGB", (width, height), BG)
    draw = ImageDraw.Draw(image)

    draw.text((margin, margin), "DSH theme pack", fill=INK, font=font(20, bold=True))
    draw.text(
        (margin + 196, margin + 8),
        f"{len(themes)} skins, each with a light and a dark palette "
        f"(dumped from {data['generatedFrom']})",
        fill=MUTED,
        font=font(12),
    )

    for index, theme in enumerate(themes):
        column = index % columns
        row = index // columns
        x = margin + column * (cell_w + gap)
        y = margin + header + row * (cell_h + gap)

        draw.rounded_rectangle(
            [x, y, x + cell_w, y + cell_h], radius=10, fill=(252, 252, 253), outline=FRAME, width=1
        )
        # English leads: the README and the repository are written in English,
        # so the Russian name is the secondary line. Flip these two lines to
        # render the figure for a Russian-language README instead.
        draw.text((x + 12, y + 8), theme["label"]["en"], fill=INK, font=font(14, bold=True))
        draw.text((x + 12, y + 27), theme["label"]["ru"], fill=MUTED, font=font(11))

        inner_x = x + 12
        inner_w = cell_w - 24
        cursor = draw_palette(draw, theme["light"], inner_x, y + 48, inner_w, "LIGHT")
        draw_palette(draw, theme["dark"], inner_x, cursor, inner_w, "DARK")

    image.save(OUTPUT)
    print(f"wrote {OUTPUT} ({image.width}x{image.height}, {len(themes)} themes)")


if __name__ == "__main__":
    main()
