# Generates the ADHDad app icons (rounded coral tile with "AD").
from PIL import Image, ImageDraw, ImageFont
BG = (232, 115, 74); INK = (255, 255, 255); DARK = (17, 19, 18)
FONT = "/usr/share/fonts/truetype/sand-box/google/Inter/Inter-VariableFont_opsz,wght.ttf"
def font(px):
    f = ImageFont.truetype(FONT, px)
    try: f.set_variation_by_axes([32, 800])
    except Exception:
        try: f.set_variation_by_name("ExtraBold")
        except Exception: pass
    return f
def tile(size, rounded, scale):
    S = size * 4
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    if rounded: d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.23), fill=BG)
    else: d.rectangle([0, 0, S, S], fill=BG)
    f = font(int(S * 0.42 * scale))
    txt = "AD"
    bb = d.textbbox((0, 0), txt, font=f)
    w, h = bb[2] - bb[0], bb[3] - bb[1]
    x = (S - w) / 2 - bb[0]; y = (S - h) / 2 - bb[1] - S * 0.05 * scale
    d.text((x, y), txt, font=f, fill=INK)
    # little "kid" dot + "dad" bar under the letters: a simple family mark
    bw = w * 0.62; by = y + bb[3] + S * 0.07 * scale; bh = S * 0.045 * scale
    d.rounded_rectangle([S / 2 - bw / 2, by, S / 2 + bw * 0.18, by + bh], radius=bh / 2, fill=INK)
    r = bh * 0.75; cx = S / 2 + bw * 0.36; cy = by + bh / 2
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=DARK)
    return im.resize((size, size), Image.LANCZOS)
tile(192, True, 1).save("public/icons/icon-192.png")
tile(512, True, 1).save("public/icons/icon-512.png")
tile(192, False, 0.78).save("public/icons/icon-maskable-192.png")
tile(512, False, 0.78).save("public/icons/icon-maskable-512.png")
tile(180, False, 0.9).convert("RGB").save("public/icons/apple-touch-icon.png")
tile(48, True, 1).save("public/icons/favicon-48.png")
prev = Image.new("RGB", (760, 300), (244, 246, 245))
prev.paste(tile(256, True, 1), (20, 22), tile(256, True, 1)); prev.paste(tile(256, False, 0.78), (296, 22)); prev.paste(tile(180, False, 0.9), (572, 60))
prev.save("/tmp/icon-preview.png"); print("ok")
