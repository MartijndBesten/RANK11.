"""Achtergrond verwijderen (rembg, BiRefNet-portrait, MIT) en bijsnijden tot het onderwerp.
Gebruik: python cutout.py in.png out.webp [model]"""
import sys, time
from PIL import Image
from rembg import new_session, remove
src, dst = sys.argv[1], sys.argv[2]
model = sys.argv[3] if len(sys.argv) > 3 else 'birefnet-portrait'
t = time.time()
img = Image.open(src).convert('RGB')
out = remove(img, session=new_session(model), post_process_mask=True)
bbox = out.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox()
out = out.crop((max(0, bbox[0] - 8), max(0, bbox[1] - 8), min(out.width, bbox[2] + 8), out.height))
w = 640
out = out.resize((w, round(out.height * w / out.width)), Image.LANCZOS)
out.save(dst, 'WEBP', quality=86, method=6)
print(f'{dst} {out.size} {time.time()-t:.0f}s')
