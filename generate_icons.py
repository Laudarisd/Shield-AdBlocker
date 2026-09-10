from pathlib import Path

from PIL import Image, ImageDraw


# Forest palette shared with popup/popup.css.
FOREST = (31, 169, 102, 255)       # #1FA966
FOREST_DARK = (12, 108, 67, 255)   # #0C6C43
CREAM = (248, 252, 248, 255)       # #F8FCF8
SIZES = [16, 32, 48, 128]
SUPERSAMPLE = 8


def rounded_line(
    draw: ImageDraw.ImageDraw,
    start: tuple[float, float],
    end: tuple[float, float],
    width: int,
    fill: tuple[int, int, int, int],
) -> None:
    """Draw a line with true round caps so it stays polished when downscaled."""
    radius = width / 2
    draw.line((start, end), fill=fill, width=width)
    for x, y in (start, end):
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=fill)


def draw_icon(size: int) -> Image.Image:
    canvas = size * SUPERSAMPLE
    image = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    # Keep square artwork inside Chrome Web Store's recommended 75% footprint:
    # 96x96 artwork with 16px transparent padding in the 128px store icon.
    inset = canvas * 0.125
    outer_end = canvas - inset
    inner_end = outer_end - canvas * 0.02
    draw.rounded_rectangle(
        (inset, inset, outer_end, outer_end),
        radius=canvas * 0.19,
        fill=FOREST_DARK,
    )
    draw.rounded_rectangle(
        (inset, inset, inner_end, inner_end),
        radius=canvas * 0.18,
        fill=FOREST,
    )

    # Universal block/no-entry mark. The ring and slash use the same optical
    # weight, with enough negative space to remain recognizable at 16x16.
    center = canvas * 0.49
    radius = canvas * 0.215
    stroke = max(2, round(canvas * 0.068))
    draw.ellipse(
        (center - radius, center - radius, center + radius, center + radius),
        outline=CREAM,
        width=stroke,
    )
    diagonal = canvas * 0.158
    rounded_line(
        draw,
        (center - diagonal, center + diagonal),
        (center + diagonal, center - diagonal),
        stroke,
        CREAM,
    )

    return image.resize((size, size), Image.Resampling.LANCZOS)


icons_dir = Path(__file__).parent / "icons"
icons_dir.mkdir(exist_ok=True)
for icon_size in SIZES:
    output_path = icons_dir / f"icon{icon_size}.png"
    draw_icon(icon_size).save(output_path)
    print(f"{output_path} -> {icon_size}x{icon_size}")
