"""Generate MintFaceoff's square coin image from simple brand shapes."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

SIZE = 1200
SCALE = 2
N = SIZE * SCALE
GREEN = "#a7fb69"
PURPLE = "#b58cff"

def box(coords):
    return tuple(int(n * SCALE) for n in coords)

image = Image.new("RGB", (N, N), "#090f1c")

# A restrained glow leaves the central emblem readable in small thumbnails.
glow = Image.new("RGBA", (N, N), (0, 0, 0, 0))
g = ImageDraw.Draw(glow)
g.ellipse(box((-120, 155, 650, 980)), fill=(167, 251, 105, 95))
g.ellipse(box((550, 155, 1320, 980)), fill=(181, 140, 255, 95))
glow = glow.filter(ImageFilter.GaussianBlur(125 * SCALE))
image = Image.alpha_composite(image.convert("RGBA"), glow)

d = ImageDraw.Draw(image)
d.ellipse(box((76, 76, 1124, 1124)), fill="#1a2534", outline="#6d7e91", width=14 * SCALE)
d.ellipse(box((118, 118, 1082, 1082)), fill="#0b1322", outline="#27364a", width=8 * SCALE)
d.arc(box((128, 128, 1072, 1072)), 102, 258, fill=GREEN, width=22 * SCALE)
d.arc(box((128, 128, 1072, 1072)), 282, 438, fill=PURPLE, width=22 * SCALE)

# Two facing arrows express the faceoff without relying on small lettering.
d.polygon([box((184, 378)), box((515, 378)), box((677, 600)), box((515, 822)), box((184, 822)), box((357, 600))], fill=GREEN)
d.polygon([box((1016, 378)), box((685, 378)), box((523, 600)), box((685, 822)), box((1016, 822)), box((843, 600))], fill=PURPLE)

# Dark plate keeps the VS legible on both bright halves.
d.polygon([box((322, 331)), box((878, 331)), box((992, 600)), box((878, 869)), box((322, 869)), box((208, 600))], fill="#101827")
d.line([box((322, 331)), box((878, 331)), box((992, 600)), box((878, 869)), box((322, 869)), box((208, 600)), box((322, 331))], fill="#445267", width=8 * SCALE, joint="curve")

font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Black.ttf", 337 * SCALE)
text = "VS"
left, top, right, bottom = d.textbbox((0, 0), text, font=font, stroke_width=0)
x = (N - (right - left)) / 2 - left
y = (N - (bottom - top)) / 2 - top - 23 * SCALE
d.text((x + 7 * SCALE, y + 9 * SCALE), text, font=font, fill="#00000088")
d.text((x, y), text, font=font, fill="#f5f7fb")

image = image.convert("RGB").resize((SIZE, SIZE), Image.Resampling.LANCZOS)
output = Path(__file__).with_name("coin-icon.png")
image.save(output, optimize=True)
print(f"{output}: {image.width}x{image.height}, {output.stat().st_size:,} bytes")
