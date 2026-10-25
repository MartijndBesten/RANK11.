"""Hervatbare batch: genereer (FLUX.2 [klein] 4B) en snijd uit (IS-Net) voor alle opdrachten.
Gebruik: python batch.py jobs.json ruwmap webpmap
Bestaande webp-bestanden worden overgeslagen; na iedere speler staat het resultaat direct klaar."""
import gc, json, os, sys, time, torch
from diffusers import Flux2KleinPipeline
from PIL import Image
from rembg import new_session, remove

REPO = 'black-forest-labs/FLUX.2-klein-4B'
jobs_path, raw_dir, webp_dir = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(raw_dir, exist_ok=True); os.makedirs(webp_dir, exist_ok=True)
torch.set_num_threads(4)
jobs = [j for j in json.load(open(jobs_path)) if not os.path.exists(f"{webp_dir}/{j['id']}.webp")]
print(f'te doen: {len(jobs)}', flush=True)
if not jobs: sys.exit(0)

t = time.time()
enc = Flux2KleinPipeline.from_pretrained(REPO, transformer=None, vae=None, torch_dtype=torch.bfloat16)
embeds = {}
with torch.inference_mode():
    for j in jobs:
        pe = enc.encode_prompt(prompt=j['prompt'], device='cpu')
        embeds[j['id']] = pe[0] if isinstance(pe, tuple) else pe
del enc; gc.collect()
print(f'gecodeerd in {time.time()-t:.0f}s', flush=True)

pipe = Flux2KleinPipeline.from_pretrained(REPO, text_encoder=None, tokenizer=None, torch_dtype=torch.bfloat16)
session = new_session('isnet-general-use')
for n, j in enumerate(jobs, 1):
    t = time.time()
    raw = f"{raw_dir}/{j['id']}.png"
    if not os.path.exists(raw):
        with torch.inference_mode():
            img = pipe(prompt_embeds=embeds[j['id']], height=j['height'], width=j['width'], guidance_scale=1.0,
                       num_inference_steps=4, generator=torch.Generator('cpu').manual_seed(j['seed'])).images[0]
        img.save(raw)
    img = Image.open(raw).convert('RGB')
    out = remove(img, session=session, post_process_mask=True)
    bbox = out.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox()
    if bbox:
        out = out.crop((max(0, bbox[0] - 8), max(0, bbox[1] - 8), min(out.width, bbox[2] + 8), out.height))
    w = 560
    out = out.resize((w, round(out.height * w / out.width)), Image.LANCZOS)
    out.save(f"{webp_dir}/{j['id']}.webp", 'WEBP', quality=84, method=6)
    print(f"{n}/{len(jobs)} {j['id']} {time.time()-t:.0f}s", flush=True)
