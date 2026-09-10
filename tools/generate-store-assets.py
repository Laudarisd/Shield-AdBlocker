from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "store-assets"
ICON_PATH = ROOT / "icons" / "icon128.png"

INK = "#10271D"
INK_RAISED = "#173A2A"
GREEN = "#1FA966"
GREEN_DARK = "#0C6C43"
MINT = "#70D99A"
CREAM = "#F8FCF8"
PALE = "#EAF5EE"
MUTED = "#71907E"
LINE = "#2A543F"

FONT_REGULAR = Path("C:/Windows/Fonts/segoeui.ttf")
FONT_SEMIBOLD = Path("C:/Windows/Fonts/seguisb.ttf")
FONT_BOLD = Path("C:/Windows/Fonts/segoeuib.ttf")


def font(size: int, weight: str = "regular") -> ImageFont.FreeTypeFont:
    candidates = {
        "regular": FONT_REGULAR,
        "semibold": FONT_SEMIBOLD,
        "bold": FONT_BOLD,
    }
    path = candidates[weight]
    if not path.exists():
        return ImageFont.truetype("DejaVuSans.ttf", size)
    return ImageFont.truetype(str(path), size)


def paste_icon(canvas: Image.Image, box: tuple[int, int, int, int]) -> None:
    icon = Image.open(ICON_PATH).convert("RGBA").resize(
        (box[2] - box[0], box[3] - box[1]), Image.Resampling.LANCZOS
    )
    canvas.paste(icon, (box[0], box[1]), icon)


def rounded_shadow(
    canvas: Image.Image,
    box: tuple[int, int, int, int],
    radius: int,
    fill: str,
    shadow_offset: tuple[int, int] = (0, 12),
    shadow_blur: int = 20,
) -> None:
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    x1, y1, x2, y2 = box
    dx, dy = shadow_offset
    shadow_draw.rounded_rectangle(
        (x1 + dx, y1 + dy, x2 + dx, y2 + dy),
        radius=radius,
        fill=(7, 50, 29, 55),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(shadow_blur))
    canvas.paste(shadow, (0, 0), shadow)
    ImageDraw.Draw(canvas).rounded_rectangle(box, radius=radius, fill=fill)


def draw_check(draw: ImageDraw.ImageDraw, x: int, y: int, label: str) -> None:
    draw.ellipse((x, y, x + 26, y + 26), fill=GREEN)
    draw.line((x + 7, y + 13, x + 11, y + 18, x + 20, y + 8), fill=CREAM, width=3)
    draw.text((x + 40, y - 2), label, font=font(24, "semibold"), fill=INK)


def draw_switch(draw: ImageDraw.ImageDraw, x: int, y: int, enabled: bool = True) -> None:
    draw.rounded_rectangle((x, y, x + 46, y + 26), radius=13, fill=GREEN if enabled else MUTED)
    knob_x = x + 24 if enabled else x + 4
    draw.ellipse((knob_x, y + 4, knob_x + 18, y + 22), fill=CREAM)


def draw_popup(canvas: Image.Image, x: int, y: int, width: int, height: int) -> None:
    rounded_shadow(canvas, (x, y, x + width, y + height), 24, INK, (0, 16), 24)
    draw = ImageDraw.Draw(canvas)
    pad = 28

    paste_icon(canvas, (x + pad, y + 26, x + pad + 48, y + 74))
    draw.text((x + 90, y + 27), "SHIELD-ADBLOCKER", font=font(14, "bold"), fill=MINT)
    draw.text((x + 90, y + 48), "Protecting this browser", font=font(20, "semibold"), fill=CREAM)

    button_y = y + 98
    draw.rounded_rectangle(
        (x + pad, button_y, x + width - pad, button_y + 48),
        radius=13,
        fill=INK_RAISED,
        outline=LINE,
        width=2,
    )
    draw.ellipse((x + width // 2 - 31, button_y + 18, x + width // 2 - 19, button_y + 30), fill=MINT)
    draw.text((x + width // 2 - 10, button_y + 12), "On", font=font(18, "semibold"), fill=CREAM)

    count_y = y + 170
    # Use a neutral initial value instead of an invented blocking result.
    count_text = "0"
    count_box = draw.textbbox((0, 0), count_text, font=font(62, "bold"))
    draw.text((x + (width - (count_box[2] - count_box[0])) // 2, count_y), count_text, font=font(62, "bold"), fill=MINT)
    label = "requests blocked on this tab"
    label_box = draw.textbbox((0, 0), label, font=font(15))
    draw.text((x + (width - (label_box[2] - label_box[0])) // 2, count_y + 72), label, font=font(15), fill="#91A99B")

    site_y = y + 277
    draw.line((x + pad, site_y, x + width - pad, site_y), fill=LINE, width=2)
    draw.text((x + pad, site_y + 12), "CURRENT WEBSITE", font=font(11, "bold"), fill="#80A990")
    draw.text((x + pad, site_y + 31), "example.com", font=font(14, "semibold"), fill="#D5E3DA")
    draw.rounded_rectangle((x + width - 124, site_y + 19, x + width - pad, site_y + 47), radius=7, fill=INK_RAISED, outline=LINE)
    draw.text((x + width - 113, site_y + 25), "Pause here", font=font(11, "semibold"), fill=CREAM)

    line_y = y + 340
    draw.line((x + pad, line_y, x + width - pad, line_y), fill=LINE, width=2)
    draw.text((x + pad, line_y + 18), "PROTECTION OPTIONS", font=font(13, "bold"), fill="#80A990")

    options = [
        "Ads & trackers",
        "Third-party cookies",
        "YouTube cleanup",
        "Cookie banners",
        "Hide empty ad spaces",
    ]
    option_y = line_y + 56
    for label in options:
        draw.text((x + pad, option_y + 3), label, font=font(17), fill="#D5E3DA")
        draw_switch(draw, x + width - pad - 46, option_y, True)
        option_y += 39

    footer = "2 network rule sets active"
    footer_box = draw.textbbox((0, 0), footer, font=font(13))
    draw.text((x + (width - (footer_box[2] - footer_box[0])) // 2, y + height - 31), footer, font=font(13), fill="#6F927E")


def screenshot() -> Image.Image:
    image = Image.new("RGB", (1280, 800), PALE)
    draw = ImageDraw.Draw(image)

    # Quiet geometric background details reinforce the blocking motif.
    draw.ellipse((-120, 570, 330, 1020), fill="#D9EDDF")
    draw.ellipse((1050, -170, 1390, 170), fill="#D8EFE1")
    draw.rounded_rectangle((72, 64, 1208, 736), radius=34, fill="#F8FCF9", outline="#D5E9DC", width=2)

    paste_icon(image, (118, 112, 190, 184))
    draw.text((210, 119), "SHIELD-ADBLOCKER", font=font(21, "bold"), fill=GREEN_DARK)
    draw.text((118, 231), "A cleaner web,", font=font(58, "bold"), fill=INK)
    draw.text((118, 296), "without the noise.", font=font(58, "bold"), fill=GREEN)
    draw.text(
        (121, 388),
        "Lightweight protection with simple controls\nfor ads, trackers, cookies, and YouTube.",
        font=font(25),
        fill=MUTED,
        spacing=10,
    )

    draw_check(draw, 122, 506, "Reduces common ads and trackers")
    draw_check(draw, 122, 557, "Stops third-party cookies")
    draw_check(draw, 122, 608, "Custom controls for every feature")

    # The card mirrors the actual extension popup and its five controls.
    draw_popup(image, 770, 80, 360, 640)
    return image


def small_promo() -> Image.Image:
    image = Image.new("RGB", (440, 280), INK)
    draw = ImageDraw.Draw(image)
    draw.ellipse((305, -90, 520, 125), fill=INK_RAISED)
    draw.ellipse((-80, 195, 95, 370), fill=INK_RAISED)
    paste_icon(image, (42, 50, 132, 140))
    draw.text((154, 55), "Shield", font=font(48, "bold"), fill=CREAM)
    draw.text((156, 112), "AD BLOCKER", font=font(20, "bold"), fill=MINT)
    draw.rounded_rectangle((42, 184, 398, 226), radius=21, fill=GREEN_DARK)
    tagline = "Clean. Private. Lightweight."
    box = draw.textbbox((0, 0), tagline, font=font(20, "semibold"))
    draw.text(((440 - (box[2] - box[0])) // 2, 192), tagline, font=font(20, "semibold"), fill=CREAM)
    return image


def marquee_promo() -> Image.Image:
    image = Image.new("RGB", (1400, 560), INK)
    draw = ImageDraw.Draw(image)
    draw.ellipse((1080, -310, 1660, 270), fill=INK_RAISED)
    draw.ellipse((950, 330, 1330, 710), fill=GREEN_DARK)
    draw.rounded_rectangle((70, 64, 1330, 496), radius=42, fill="#123022", outline=LINE, width=2)

    paste_icon(image, (126, 126, 294, 294))
    draw.text((342, 127), "Shield-AdBlocker", font=font(60, "bold"), fill=CREAM)
    draw.text((346, 208), "Clean browsing. Strong protection.", font=font(31, "semibold"), fill=MINT)
    draw.text(
        (346, 266),
        "Reduce common ads and trackers, limit third-party cookies,\nand hide common cookie pop-ups.",
        font=font(24),
        fill="#B8CDBF",
        spacing=8,
    )

    pills = ["LOCAL-FIRST", "NO ANALYTICS", "CUSTOM CONTROLS"]
    pill_x = 346
    for label in pills:
        label_box = draw.textbbox((0, 0), label, font=font(15, "bold"))
        pill_width = label_box[2] - label_box[0] + 34
        draw.rounded_rectangle((pill_x, 386, pill_x + pill_width, 424), radius=19, fill=GREEN_DARK)
        draw.text((pill_x + 17, 395), label, font=font(15, "bold"), fill=CREAM)
        pill_x += pill_width + 14

    # A large block symbol on the right balances the copy without extra text.
    cx, cy, radius = 1170, 280, 105
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), outline=CREAM, width=24)
    draw.line((cx - 73, cy + 73, cx + 73, cy - 73), fill=CREAM, width=24)
    draw.ellipse((cx - 85, cy + 61, cx - 61, cy + 85), fill=CREAM)
    draw.ellipse((cx + 61, cy - 85, cx + 85, cy - 61), fill=CREAM)
    return image


def save_rgb(image: Image.Image, filename: str) -> None:
    OUTPUT.mkdir(exist_ok=True)
    output_path = OUTPUT / filename
    image.convert("RGB").save(output_path, format="PNG", optimize=True)
    print(f"{output_path} -> {image.size}, mode=RGB")


save_rgb(screenshot(), "screenshot-1280x800.png")
save_rgb(small_promo(), "small-promo-440x280.png")
save_rgb(marquee_promo(), "marquee-promo-1400x560.png")
