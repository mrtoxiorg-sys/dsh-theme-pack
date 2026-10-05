# Renders the token-coverage figure: which shell element each overridden alias
# token paints, and the colour every skin gives it.
#
#   node export-theme-palettes.mjs > theme-pack-palettes.json
#   python make-token-diagram.py
#
# The point of the figure is that no row is left at the stock colour: every
# surface, border, state and glyph the shell draws is carried by the skin.
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
# The dump sits next to this script in the package, or one level up in the
# workspace layout.
_CANDIDATES = [HERE / "theme-pack-palettes.json", HERE.parent / "theme-pack-palettes.json"]
SOURCE = next((path for path in _CANDIDATES if path.exists()), _CANDIDATES[0])
OUTPUT = HERE / "token-coverage.png"

BG = (255, 255, 255)
INK = (26, 26, 32)
MUTED = (120, 120, 130)
FRAME = (216, 216, 222)

# token -- what it paints -- which skins to show
ROWS = [
    ("--dsw-alias-bg-base", "app canvas", ["stock", "cyber", "nord", "gruvbox", "paper"]),
    ("--dsw-alias-bg-layer-1", "raised surface", ["stock", "cyber", "nord", "gruvbox", "paper"]),
    ("--dsw-alias-bg-layer-2", "nested surface", ["stock", "cyber", "nord", "gruvbox", "paper"]),
    ("--dsw-alias-bg-layer-3", "deep surface", ["stock", "cyber", "nord", "gruvbox", "paper"]),
    ("--dsw-alias-bg-layer-4", "composer / footer", ["stock", "cyber", "nord", "gruvbox", "paper"]),
    ("--dsw-specific-sidebar-fill", "sidebar column", ["stock", "cyber", "nord", "gruvbox", "paper"]),
    ("--dsw-alias-markdown-code-block", "code blocks", ["stock", "cyber", "nord", "gruvbox", "paper"]),
    ("--dsw-alias-border-l4", "elevated stroke", ["stock", "cyber", "nord", "gruvbox", "paper"]),
    ("--dsw-alias-label-primary", "primary text", ["stock", "cyber", "nord", "gruvbox", "paper"]),
    ("--dsw-alias-label-secondary", "secondary text", ["stock", "cyber", "nord", "gruvbox", "paper"]),
    ("--dsw-alias-label-caption", "captions", ["stock", "cyber", "nord", "gruvbox", "paper"]),
    ("--dsw-alias-brand-primary", "brand accent", ["stock", "cyber", "nord", "gruvbox", "paper"]),
    ("--dsw-alias-button-primary-fill", "primary button", ["stock", "cyber", "nord", "gruvbox", "paper"]),
    ("--dsw-alias-state-success-primary", "success", ["stock", "cyber", "nord", "gruvbox", "paper"]),
    ("--dsw-alias-state-warn-primary", "warning", ["stock", "cyber", "nord", "gruvbox", "paper"]),
    ("--dsw-alias-state-error-primary", "error", ["stock", "cyber", "nord", "gruvbox", "paper"]),
    ("--dsw-alias-scrollbar-bg-l1", "scrollbar", ["stock", "cyber", "nord", "gruvbox", "paper"]),
    ("--dsw-alias-tooltip-bg", "tooltip", ["stock", "cyber", "nord", "gruvbox", "paper"]),
    ("--dsw-alias-bg-multi-select", "selection fill", ["stock", "cyber", "nord", "gruvbox", "paper"]),
    ("--dsw-alias-bg-skeleton", "loading skeleton", ["stock", "cyber", "nord", "gruvbox", "paper"]),
]


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    names = ("segoeuib.ttf", "arialbd.ttf") if bold else ("segoeui.ttf", "arial.ttf", "DejaVuSans.ttf")
    for name in names:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def swatch(draw: ImageDraw.ImageDraw, value: str, x: int, y: int, w: int, h: int, label: str) -> None:
    """Draw one colour cell; `value` may be hex or rgba()."""
    fill = (240, 240, 242)
    try:
        if value.startswith("#"):
            digits = value.lstrip("#")
            if len(digits) == 8:
                digits = digits[:6]
            fill = tuple(int(digits[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[assignment]
        elif value.startswith("rgba"):
            parts = [p.strip() for p in value[value.index("(") + 1 : value.index(")")].split(",")]
            rgb = [int(p) for p in parts[:3]]
            # Composite over white so a translucent fill reads as the light
            # wash it is, instead of looking like an opaque dark colour.
            alpha = float(parts[3]) if len(parts) > 3 else 1.0
            fill = tuple(round(channel * alpha + 255 * (1 - alpha)) for channel in rgb)  # type: ignore[assignment]
    except ValueError:
        fill = (240, 240, 242)
    draw.rounded_rectangle([x, y, x + w, y + h], radius=5, fill=fill, outline=FRAME, width=1)
    draw.text((x + 6, y + h + 3), label, fill=MUTED, font=font(9))


def main() -> None:
    data = json.loads(SOURCE.read_text(encoding="utf-8-sig"))
    by_id = {theme["id"]: theme for theme in data["themes"]}
    sample = next(theme for theme in data["themes"] if theme["id"] == "nord")
    token_count = sample.get("tokenCount", len(sample["all"]["light"]))

    # Use the actual current stock values, so the picture tells the truth about
    # what is being replaced.
    stock = data["stock"]

    columns = ["stock"] + [id for id in ROWS[0][2] if id != "stock"]
    cell_w, cell_h, gap = 172, 46, 8
    label_w, name_w = 210, 190
    margin, header = 22, 64
    width = margin * 2 + label_w + name_w + len(columns) * (cell_w + gap)
    height = margin * 2 + header + len(ROWS) * (cell_h + gap) + 60

    image = Image.new("RGB", (width, height), BG)
    draw = ImageDraw.Draw(image)

    draw.text((margin, margin), "Every shell colour a skin carries", fill=INK, font=font(19, bold=True))
    draw.text(
        (margin, margin + 26),
        f"{token_count} alias tokens per skin (light + dark). Stock values are the shipped palette; "
        f"each column is one skin's dark palette.",
        fill=MUTED,
        font=font(12),
    )

    head_y = margin + header
    draw.text((margin, head_y), "token", fill=MUTED, font=font(11, bold=True))
    draw.text((margin + label_w, head_y), "paints", fill=MUTED, font=font(11, bold=True))
    for index, id in enumerate(columns):
        x = margin + label_w + name_w + index * (cell_w + gap)
        title = "stock" if id == "stock" else by_id[id]["label"]["en"]
        draw.text((x, head_y), title, fill=INK, font=font(11, bold=True))

    y = head_y + 24
    for token, paints, _ in ROWS:
        draw.text((margin, y + 6), token.replace("--dsw-alias-", "").replace("--dsw-specific-", ""), fill=INK, font=font(11))
        draw.text((margin + label_w, y + 6), paints, fill=MUTED, font=font(11))
        for index, id in enumerate(columns):
            x = margin + label_w + name_w + index * (cell_w + gap)
            if id == "stock":
                value = stock["light"].get(token, stock["dark"].get(token, "#ffffff"))
                caption = "stock"
            else:
                theme = by_id[id]
                value = theme["all"]["dark"].get(token, "#ffffff")
                caption = theme["label"]["ru"]
            swatch(draw, value, x, y, cell_w, cell_h - 14, caption)
        y += cell_h + gap

    note = (
        "The checker fails if any of these tokens is missing from a skin, or if the shipped design system grows one the pack does not map."
    )
    draw.text((margin, height - margin - 18), note, fill=MUTED, font=font(11))

    image.save(OUTPUT)
    print(f"wrote {OUTPUT} ({image.width}x{image.height}, {len(ROWS)} rows x {len(columns)} columns)")


if __name__ == "__main__":
    main()
