# Monta uma folha com as miniaturas dos top-3 vídeos de cada canal aprovado ainda não anotado (para classificar mídia)
import json, os, sys, urllib.request, io
from PIL import Image, ImageDraw
D = '/home/user/ytb-p/data'; OUT = sys.argv[1]
ch = json.load(open(f'{D}/channels.json')); ann = json.load(open(f'{D}/annotations.json')) if os.path.exists(f'{D}/annotations.json') else {}
todo = [c for c in ch.values() if c['status'] in ('pass', 'unconfirmed') and c['channelId'] not in ann]
rows = []
for c in todo[:8]:
    ims = []
    for v in c['top'][:3]:
        try: ims.append(Image.open(io.BytesIO(urllib.request.urlopen(f"https://i.ytimg.com/vi/{v['id']}/mqdefault.jpg", timeout=20).read())).resize((320, 180)))
        except Exception: ims.append(Image.new('RGB', (320, 180), 'gray'))
    rows.append((c['name'], ims))
if not rows: print('nada'); sys.exit()
sheet = Image.new('RGB', (960, len(rows) * 200), 'white'); dr = ImageDraw.Draw(sheet)
for i, (n, ims) in enumerate(rows):
    dr.text((4, i * 200 + 2), f"{i+1}. {n}", fill='black')
    for j, im in enumerate(ims): sheet.paste(im, (j * 320, i * 200 + 18))
sheet.save(OUT); print([n for n, _ in rows])
