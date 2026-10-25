"""Fictieve spelersportretten met FLUX.2 [klein] 4B (Apache 2.0), lokaal op CPU.
Fase 1: prompts coderen (tekst-encoder), fase 2: beelden genereren (transformer + VAE).
Gebruik: python gen.py jobs.json [uitvoermap]   (lijst van {id, prompt, seed, width, height})"""
import gc, json, os, sys, time, torch
from diffusers import Flux2KleinPipeline
REPO = 'black-forest-labs/FLUX.2-klein-4B'
torch.set_num_threads(4)
jobs = json.load(open(sys.argv[1]))
OUT = sys.argv[2] if len(sys.argv) > 2 else 'out'
os.makedirs(OUT, exist_ok=True)
dt = torch.bfloat16

t = time.time()
enc = Flux2KleinPipeline.from_pretrained(REPO, transformer=None, vae=None, torch_dtype=dt)
embeds = {}
with torch.inference_mode():
    for j in jobs:
        pe = enc.encode_prompt(prompt=j['prompt'], device='cpu')
        embeds[j['id']] = pe[0] if isinstance(pe, tuple) else pe
del enc; gc.collect()
print(f'encode {time.time()-t:.0f}s', flush=True)

t = time.time()
pipe = Flux2KleinPipeline.from_pretrained(REPO, text_encoder=None, tokenizer=None, torch_dtype=dt)
print(f'load {time.time()-t:.0f}s', flush=True)
for j in jobs:
    t = time.time()
    with torch.inference_mode():
        img = pipe(prompt_embeds=embeds[j['id']], height=j.get('height', 640), width=j.get('width', 512),
                   guidance_scale=1.0, num_inference_steps=4,
                   generator=torch.Generator('cpu').manual_seed(j['seed'])).images[0]
    img.save(f"{OUT}/{j['id']}.png")
    print(f"{j['id']} {time.time()-t:.0f}s", flush=True)
