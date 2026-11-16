import json, re, html
from datetime import datetime
V = json.load(open('/home/user/ytb-p/gta6/videos_enriched.json'))
E = html.escape
OFFICIAL = re.compile(r'^(Rockstar Games.*|PlayStation|XBOX|IGN|YouTube|Atlantic Records.*|Justice.*|GTA VI Radio)$')
rows = []
for v in V.values():
    rows.append(dict(id=v['id'], t=v.get('origTitle') or v['title'], c=v['channel'], h=v.get('handle'), s=v.get('subs'), st=v.get('subsText'),
        v=v['viewsBest'], ex=bool(v.get('viewsRss')), d=round(v['days'], 1), dx=v['dayExact'], date=(v.get('date') or '')[:10], p=v['pubText'],
        len=v['lenText'], ls=v['len'] or 0, live=v['pubText'].startswith('Streamed'), lang=v['lang'], off=bool(OFFICIAL.match(v['channel'].strip()))))
rows.sort(key=lambda r: -r['v'])
TOPICS = [
 ('preload', r'pre-?load|pré-?carreg|precarga|préchargez|tamanho|\bsize\b|cuanto pesa', 'Pré-load liberado', 'A Rockstar publicou o vídeo "Pre-Load Now" em vários idiomas há 5–6 dias. É o vídeo mais visto do período. Em volta dele surgiram vídeos sobre o tamanho oficial do jogo e a data do pré-download.'),
 ('launch', r'launch day|days? left|in \d+ days|dia 19|faltam|chegou meu|ya tengo|unboxing|mídia física|caixa física|livestream|24 hour|first day|primeiro dia|day 1', 'Lançamento a poucos dias', 'Os títulos falam em "dia 19", "2 Days Left" e "in 4 days". O YouTube anunciou uma live de 24 horas no dia do lançamento, e unboxings da mídia física já estão viralizando (BRKsEDU, Tecnonauta, Gameplayrj).'),
 ('trailer', r'trailer|tráiler|adelanto', 'Trailer de recursos do PS5 e trailer de lançamento', 'O "Features Trailer" do PS5 saiu há 5 dias. O "Launch Trailer" (PlayStation/Xbox) tem cerca de 1 mês. Os vídeos de análise destacam a menção a 30 FPS ("30 FPS Confirmed", TGG).'),
 ('gameplay', r'gameplay', 'Gameplay novo "realista demais"', 'Reações dizendo que o gameplay parece falso ou feito por IA ("se cree que es IA", "Everyone Thought it Was Fake"). Também viralizou o gameplay de GTA 6 exibido dentro de um episódio de South Park.'),
 ('vs5', r'gta ?5|gta ?v\b|never imagined|not in gta|que gta 6 va', 'O que muda do GTA 5 para o GTA 6', 'Listas comparando os dois jogos. É o formato em que canais pequenos mais explodiram: GTAbites fez 5 milhões de views com 4,5 mil inscritos e NahuRo GTA fez 2 milhões com 1,9 mil.'),
 ('map', r'\bmap\b|mapa', 'Mapa: guias completos e "mapa vazado"', 'Guias do mapa "para ver antes do lançamento" estão entre os vídeos longos mais vistos (RoddyGames, 5,6 milhões com 16,8 mil inscritos). No Brasil, a Gameplayrj fala em mapa vazado.'),
 ('shots', r'screenshot|imagens|imágenes|captura|gallery|datamin|game files|\bonline\b', 'Novas imagens, datamine e pistas do GTA Online', '12 screenshots novas, uma "Launch Gallery" com 40 imagens e arquivos do jogo minerados com pistas do GTA 6 Online. A TGG domina o tema em inglês.'),
 ('pc', r'\bpc\b|fps|ps5 pro|rendimiento|performance|requisitos', 'PC, desempenho e PS5 Pro', 'Há rumores de versão para PC antes do previsto (Linus Tech Tips, TecnoArt: "sairá para PC em breve"), a discussão dos 30 FPS no console e testes no PS5 Pro. Setups "temáticos de GTA 6" também viralizam.'),
 ('music', r'album|álbum|tove lo|justice|radio', 'Trilha sonora: GTA VI The Album', 'Faixas oficiais do álbum (Tove Lo, Justice com Gesaffelstein) passam de 2 milhões de views cada. Há também vídeos sobre novas estações de rádio e um suposto vazamento do álbum.'),
 ('piracy', r'pirat|take.?two', 'Pirataria e declarações da Take-Two', 'Tema menor, mas forte no Brasil: "GTA 6 vai ser PIRATEADO, admite presidente da TAKE TWO" (Gameplayrj) e "Sony lança atualização por medo de pirataria".'),
]
topics = []
for key, rx, name, desc in TOPICS:
    vs = [r for r in rows if re.search(rx, r['t'], re.I)]
    topics.append(dict(key=key, name=name, desc=desc, n=len(vs), tot=sum(r['v'] for r in vs), wk=sum(r['v'] for r in vs if r['d'] <= 7), top=vs[:3]))
topics.sort(key=lambda t: -t['tot'])
fmt = lambda n: f'{n:,}'.replace(',', '.')
def short(n):
    return (f'{n/1e6:.1f} mi' if n >= 1e6 else f'{n/1e3:.0f} mil' if n >= 1e3 else str(n)).replace('.', ',')
def relpt(p):
    p = re.sub(r'^Streamed ', 'live ', p)
    for a, b in [(r'(\d+)\s*mo ago', r'há \1 mês'), (r'(\d+)\s*w ago', r'há \1 sem.'), (r'(\d+)\s*d ago', r'há \1 d'), (r'(\d+)\s*h ago', r'há \1 h')]: p = re.sub(a, b, p)
    return p
def vlink(r): return f'<a href="https://www.youtube.com/watch?v={r["id"]}" target="_blank" rel="noopener">{E(r["t"])}</a>'
topic_html = '\n'.join(f'''<article class="news">
  <div class="rank">{i+1:02d}</div>
  <div class="news-b"><h3>{E(t["name"])}</h3><p>{E(t["desc"])}</p>
  <div class="meter"><span><b>{short(t["tot"])}</b> views somadas</span><span><b>{short(t["wk"])}</b> na última semana</span><span><b>{t["n"]}</b> vídeos</span></div>
  <ol class="mini">{''.join(f'<li>{vlink(r)} <em>{E(r["c"])} · {short(r["v"])} · {E(relpt(r["p"]))}</em></li>' for r in t["top"])}</ol></div>
</article>''' for i, t in enumerate(topics))
small = [r for r in rows if r['s'] and r['s'] < 20000 and r['v'] >= 200000 and not r['off'] and r['ls'] > 60]
small.sort(key=lambda r: -r['v'] / r['s'])
small_html = ''.join(f'<tr><td>{vlink(r)}<div class="sub">{E(r["c"])} · {E(r["lang"].upper())}</div></td><td class="n">{fmt(r["v"])}</td><td class="n">{E(r["st"] or "")}</td><td class="n x">{round(r["v"]/r["s"])}×</td><td class="n">{E(r["len"])}</td><td class="n">{E(relpt(r["p"]))}</td></tr>' for r in small[:20])
TITLES = [
 ('GTA 6: 15 coisas que você NUNCA pôde fazer no GTA 5', 'GTAbites / BreeZe GTA / NahuRo GTA (listas GTA 5 × GTA 6)'),
 ('NÃO comece GTA 6 sem ver esse guia do mapa', 'RoddyGames / jumaboi / GTA EXPLICADO (guias do mapa)'),
 ('12 coisas para fazer no PRIMEIRO DIA de GTA 6', 'BreeZe GTA: "12 THINGS You NEED To Do On DAY 1"'),
 ('O novo gameplay de GTA 6 é TÃO REAL que parece IA', 'TGG / reações do Rubius ("se cree que es IA")'),
 ('GTA 6: tudo o que você precisa saber antes de jogar (guia completo)', 'TGG / GrandGecko / JTM ("O GUIA COMPLETO ANTES DE JOGAR")'),
 ('GTA 6 no PC: quando sai e se o SEU PC vai rodar', 'Linus Tech Tips / TecnoArt (rumores de PC)'),
 ('30 FPS no GTA 6? O que já se sabe sobre o desempenho no PS5 e PS5 Pro', 'TGG: "30 FPS Confirmed" / IlloReacts: rendimiento en PS5 PRO'),
 ('Analisei as 40 novas imagens de GTA 6 e achei detalhes que ninguém viu', 'TGG: "The Launch Gallery (40 NEW Screenshots)"'),
 ('Os arquivos de GTA 6 foram minerados: as pistas do GTA 6 Online', 'TGG: "Game Files DATAMINED & GTA 6 Online Hints"'),
 ('Como explicar o hype de GTA 6 para quem não joga', 'Scumbucket: "How I\'d Explain the GTA 6 Hype to a Normie" (1,2 mi com 1 mil inscritos)'),
]
titles_html = ''.join(f'<li><b>{E(a)}</b><span>Inspirado em: {E(b)}</span></li>' for a, b in TITLES)
nwk = sum(1 for r in rows if r['d'] <= 7)
data = json.dumps(rows, ensure_ascii=False).replace('</', '<\\/')
page = open('/home/user/ytb-p/scraper/gta6_template.html').read()
for k, val in {'%TOPICS%': topic_html, '%SMALL%': small_html, '%TITLES%': titles_html, '%DATA%': data, '%N%': str(len(rows)), '%NWK%': str(nwk), '%NMO%': str(len(rows) - nwk),
               '%UPDATED%': datetime.now().strftime('%d/%m/%Y %H:%M') + ' UTC', '%TOP1%': short(rows[0]['v'])}.items():
    page = page.replace(k, val)
open('/home/user/ytb-p/gta6/index.html', 'w').write(page); print('ok', len(rows), len(small))
