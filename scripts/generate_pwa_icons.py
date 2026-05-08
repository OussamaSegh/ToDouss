from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_DIR = ROOT / "apps" / "web" / "public"
PUBLIC_DIR.mkdir(parents=True, exist_ok=True)


def make_icon(size: int, maskable: bool = False) -> Image.Image:
    img = Image.new("RGBA", (size, size))
    draw = ImageDraw.Draw(img)
    for y in range(size):
        t = y / max(size - 1, 1)
        r = int(66 + (45 - 66) * t)
        g = int(99 + (21 - 99) * t)
        b = int(235 + (191 - 235) * t)
        draw.line([(0, y), (size, y)], fill=(r, g, b, 255))

    radius = int(size * 0.24 if maskable else size * 0.18)
    margin = int(size * 0.09 if maskable else size * 0.12)
    panel = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    pdraw = ImageDraw.Draw(panel)
    pdraw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=radius,
        fill=(255, 255, 255, 42),
        outline=(255, 255, 255, 95),
        width=max(1, int(size * 0.012)),
    )
    glow = panel.filter(ImageFilter.GaussianBlur(radius=max(2, int(size * 0.02))))
    img.alpha_composite(glow)
    img.alpha_composite(panel)

    c = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    cdraw = ImageDraw.Draw(c)
    stroke = max(3, int(size * 0.065))
    x1, y1 = int(size * 0.30), int(size * 0.56)
    x2, y2 = int(size * 0.46), int(size * 0.70)
    x3, y3 = int(size * 0.74), int(size * 0.38)
    cdraw.line([(x1, y1), (x2, y2), (x3, y3)], fill=(255, 255, 255, 240), width=stroke, joint="curve")
    c = c.filter(ImageFilter.GaussianBlur(radius=max(1, int(size * 0.004))))
    img.alpha_composite(c)

    tdraw = ImageDraw.Draw(img)
    line_w = max(2, int(size * 0.015))
    for i, alpha in enumerate((140, 115, 90), start=1):
        y = int(size * (0.34 + i * 0.11))
        tdraw.line(
            [(int(size * 0.28), y), (int(size * 0.72), y)],
            fill=(255, 255, 255, alpha),
            width=line_w,
        )

    return img


for sz, name in [
    (512, "icon-512.png"),
    (192, "icon-192.png"),
]:
    make_icon(sz, maskable=False).save(PUBLIC_DIR / name, format="PNG")

for sz, name in [
    (512, "icon-maskable-512.png"),
    (192, "icon-maskable-192.png"),
]:
    make_icon(sz, maskable=True).save(PUBLIC_DIR / name, format="PNG")

apple = make_icon(180, maskable=False)
apple.save(PUBLIC_DIR / "apple-touch-icon.png", format="PNG")

fav = make_icon(64, maskable=False).convert("RGBA")
fav.save(
    PUBLIC_DIR / "favicon.ico",
    format="ICO",
    sizes=[(16, 16), (32, 32), (48, 48), (64, 64)],
)

print("Generated PWA icon assets in", PUBLIC_DIR)
