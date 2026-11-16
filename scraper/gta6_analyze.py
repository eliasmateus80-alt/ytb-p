import json, re, collections
V = json.load(open('/home/user/ytb-p/gta6/videos.json'))
def lang(t):
    tl = ' ' + t.lower() + ' '
    if re.search(r'[؀-ۿऀ-ॿЀ-ӿ぀-ヿ一-鿿가-힯]', t): return 'outro'
    if re.search(r'[ğışİ]|\b(ve|bir|için|oyun)\b', tl): return 'outro'
    if re.search(r'\b(der|die|und|ist|nicht|ich|het|een|les|est|pas|une|dans|va)\b', tl) and not re.search(r'\b(the|you)\b', tl): return 'outro'
    pt = len(re.findall(r'ção|ções|ã|õ|\b(você|voce|não|nao|jogo|jogar|novo|nova|notícias?|lançamento|chegou|agora|tudo|isso|vai|pra|meu|minha|vazou|vazamento|preço|guia|já|tem|muito|galera|saiu|sem|jogue|dia|ele|ela|está|esse|essa|vão|seu|sua)\b', tl))
    es = len(re.findall(r'ñ|\b(noticias|lanzamiento|nuevo|nueva|ya|los|las|del|cómo|qué|juego|precio|filtración|tráiler|reacciona|tienes|hay|muy|sin|así|el|una|todo|antes|ver|mi|tengo|nadie|jamás|cosas|podrás|guía|compré)\b', tl))
    en = len(re.findall(r'\b(the|you|is|new|everything|need|know|of|to|this|before|and|my|first|with|it|that|what|why|how|we|are|can|just|will|be|i|its|was)\b', tl))
    m = max(pt, es, en)
    if m == 0: return 'en'
    return 'pt' if m == pt and pt > es else ('es' if m == es and es > 0 and es >= en else 'en')
TOP = {
 'Pré-load liberado / download antecipado': r'pre-?load|pré-?carreg|precarga|préchargez|downloading|baixando|descargando',
 'Lançamento iminente / contagem regressiva': r'launch day|days? left|in \d+ days|dia do lançamento|faltam|lanzamiento|launch|chegou|is here|finally',
 'Trailer de lançamento e trailer de recursos (PS5)': r'trailer|tráiler',
 'Mapa completo / guia do mapa': r'\bmap\b|mapa',
 'Novo gameplay revelado': r'gameplay',
 'Tudo o que você precisa saber (guias pré-lançamento)': r'need to know|precisa saber|tienes que saber|everything|tudo sobre|todo sobre',
 'Novidades e recursos vs GTA 5': r'gta ?5|gta ?v\b|features|recursos|flaws|never imagined|not in',
 'Screenshots, datamine e pistas de GTA Online': r'screenshot|datamin|files|online|leak|vaz|filtr',
 'Trilha sonora (GTA VI: The Album)': r'album|álbum|radio|soundtrack|feat\.|official audio',
 'Desempenho e plataformas (30 FPS, PC, PS5 Pro)': r'fps|\bpc\b|ps5 pro|performance|setup|xbox series',
 'Miami / Vice City na vida real': r'miami|vice city|florida|real life|vida real',
 'Preço / edições': r'price|preço|precio|\$\d|edition|edição',
}
from datetime import datetime, timezone
NOW = datetime(2026, 11, 16, 14, 0, tzinfo=timezone.utc)
def days(v):
    if v.get('date'): return (NOW - datetime.fromisoformat(v['date'])).total_seconds() / 86400
    m = re.search(r'(\d+)\s*(mo|y|w|d|h|m|s)', v.get('pubText') or '')
    if not m: return None
    n = int(m.group(1)); return n * {'mo': 30, 'y': 365, 'w': 7, 'd': 1, 'h': 1/24, 'm': 0, 's': 0}[m.group(2)]
for v in V.values(): v['days'] = days(v); v['dayExact'] = bool(v.get('date'))
V = {k: v for k, v in V.items() if re.search(r'gta\s*(6|vi\b)|grand theft auto (6|vi)', v.get('origTitle') or '', re.I)}
vals = [v for v in V.values() if v['days'] is not None and v['days'] <= 35]
for v in vals:
    v['viewsBest'] = v.get('viewsRss') or v['views'] or 0
    v['lang'] = lang(v.get('origTitle') or v['title'])
    v['topics'] = [k for k, r in TOP.items() if re.search(r, (v.get('origTitle') or '') + ' ' + v['title'], re.I)]
    v['ratio'] = (v['viewsBest'] / v['subs']) if v.get('subs') else None
json.dump({v['id']: v for v in vals}, open('/home/user/ytb-p/gta6/videos_enriched.json', 'w'), ensure_ascii=False, indent=1)
st = collections.defaultdict(lambda: [0, 0, 0])
for v in vals:
    for t in v['topics']: s = st[t]; s[0] += 1; s[1] += v['viewsBest']; s[2] += v['viewsBest'] if (v['days'] or 0) <= 7 else 0
for k, s in sorted(st.items(), key=lambda x: -x[1][1]): print(f'{s[1]:>12,} {s[2]:>12,} {s[0]:>4} {k}')
print(collections.Counter(v['lang'] for v in vals))
for L_ in ['pt', 'es']:
    print('==', L_)
    for v in sorted([v for v in vals if v['lang'] == L_], key=lambda v: -v['viewsBest'])[:25]: print(' ', v['viewsBest'], v['pubText'], v['lenText'], v['channel'][:20], v.get('subsText'), '|', (v.get('origTitle') or v['title'])[:90])
print('== outliers (subs<100k, ratio)')
for v in sorted([v for v in vals if v.get('subs') and v['subs'] < 100000 and v['viewsBest'] > 20000], key=lambda v: -v['ratio'])[:25]: print(' ', round(v['ratio'], 1), v['viewsBest'], v['subsText'], v['pubText'], v['lenText'], v['lang'], v['channel'][:20], '|', (v.get('origTitle') or v['title'])[:85])
