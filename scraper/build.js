// Gera ../index.html a partir de data/channels.json + data/annotations.json + data/summary.json
const fs = require('fs');
const ch = JSON.parse(fs.readFileSync('../data/channels.json'));
const ann = fs.existsSync('../data/annotations.json') ? JSON.parse(fs.readFileSync('../data/annotations.json')) : {};
const sum = fs.existsSync('../data/summary.json') ? JSON.parse(fs.readFileSync('../data/summary.json')) : null;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = n => n == null ? 'não confirmado' : n.toLocaleString('pt-BR');
const d = s => s ? new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : null;
const LANG = { pt: 'Português', es: 'Espanhol', en: 'Inglês' };
const list = Object.values(ch).filter(c => ['pass', 'unconfirmed'].includes(c.status) && ann[c.channelId] && !ann[c.channelId].exclude)
  .map(c => ({ ...c, a: ann[c.channelId], best: Math.max(...c.top.map(v => v.views || 0)), ratio: c.subs ? Math.max(...c.top.map(v => v.views || 0)) / c.subs : null }))
  .sort((x, y) => (y.a.score ?? 0) - (x.a.score ?? 0) || (y.ratio ?? 0) - (x.ratio ?? 0));
const checked = Object.values(ch).length, passed = Object.values(ch).filter(c => ['pass','unconfirmed'].includes(c.status)).length;
const dots = n => Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('');
const card = c => {
  const f = c.firstVideo; const lang = c.a.lang || c.langs[0];
  return `<article class="card" id="${esc(c.channelId)}">
  <header class="card-h">
    <div class="who"><span class="lane">${esc(LANG[lang] || lang)}</span>
      <h3><a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.name)}</a></h3>
      <a class="url" href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.handle || c.url.replace('https://www.', ''))}</a></div>
    <div class="ratio" title="Views do melhor vídeo ÷ inscritos"><b>${c.ratio != null ? (c.ratio >= 10 ? Math.round(c.ratio) : c.ratio.toFixed(1)) + '×' : '—'}</b><span>views/inscritos</span></div>
  </header>
  <dl class="facts">
    <div><dt>Inscritos</dt><dd>${c.subs != null ? fmt(c.subs) : 'não confirmado'}</dd></div>
    <div><dt>1º vídeo</dt><dd>${f.date ? d(f.date) : 'não confirmado' + (f.approx ? ` (≈ ${esc(f.approx)})` : '')}</dd></div>
    <div><dt>Vídeos longos</dt><dd>${c.nLong} de ${c.nVideos}</dd></div>
  </dl>
  <p class="sub"><span>Subnicho</span>${esc(c.a.subniche)}</p>
  <table class="top"><thead><tr><th>Top 3 vídeos longos</th><th>Views</th><th>Duração</th><th>Data</th></tr></thead><tbody>
  ${c.top.map(v => `<tr><td><a href="https://www.youtube.com/watch?v=${esc(v.id)}" target="_blank" rel="noopener">${esc(v.title)}</a></td><td class="n">${fmt(v.views)}</td><td class="n">${esc(v.lenText)}</td><td class="n">${v.date ? d(v.date) : 'não confirmado'}</td></tr>`).join('')}
  </tbody></table>
  <div class="notes">
    <p><span>Padrão de título</span>${esc(c.a.pattern)}</p>
    <p><span>Mídia</span>${esc(c.a.media)}</p>
    <p class="adapt"><span>Facilidade de adaptar</span><em class="dots" aria-label="${c.a.adapt} de 5">${dots(c.a.adapt)}</em> ${c.a.adapt}/5 — ${esc(c.a.adaptWhy)}</p>
  </div>
  <footer class="src">Data do 1º vídeo: ${esc(f.src)}${f.isShort ? ' · o 1º upload foi um short' : ''}. Checado em ${d(c.checkedAt)}.</footer>
</article>`;
};
const summary = sum ? `<section class="summary" id="resumo">
  <h2>Os 5 melhores subnichos</h2>
  <ol class="niches">${sum.niches.map(n => `<li><h4>${esc(n.name)}</h4><p>${esc(n.why)}</p></li>`).join('')}</ol>
  <h2>10 títulos adaptados para o português do Brasil</h2>
  <ol class="titles">${sum.titles.map(t => `<li><b>${esc(t.pt)}</b><span>Baseado em: ${esc(t.from)}</span></li>`).join('')}</ol>
</section>` : `<section class="summary pending"><h2>Resumo final</h2><p>Os 5 melhores subnichos e os 10 títulos adaptados aparecem aqui quando a varredura terminar.</p></section>`;
const html = `<title>Nichfinder Corrida &amp; Disciplina</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap">
<style>
/* Layout: "pista de atletismo" — faixa de cabeçalho com raias, cards em grade de 2 colunas, cada card numa raia com o idioma como número de raia */
:root{--bg:#f3f5f4;--panel:#ffffff;--ink:#14201c;--muted:#5d6b66;--line:#d9e0dd;--track:#b8442c;--field:#1f5a46;--chip:#e7eeeb;
--display:"Barlow Condensed","Arial Narrow",system-ui,sans-serif;--body:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;--mono:"JetBrains Mono",ui-monospace,Menlo,monospace}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0f1714;--panel:#16211d;--ink:#e6efeb;--muted:#9aaba4;--line:#2a3833;--track:#e0694f;--field:#5fbf99;--chip:#203029;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#0f1714;--panel:#16211d;--ink:#e6efeb;--muted:#9aaba4;--line:#2a3833;--track:#e0694f;--field:#5fbf99;--chip:#203029;color-scheme:dark}
*{box-sizing:border-box}
body{background:var(--bg);color:var(--ink);font:15px/1.55 var(--body)}
.wrap{max-width:1180px;margin:0 auto;padding-block:28px 64px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));display:grid;gap:28px}
.hero{display:grid;gap:10px;border-bottom:6px double var(--track);padding-bottom:20px}
.hero h1{font:800 clamp(34px,6vw,58px)/0.95 var(--display);letter-spacing:.01em;text-transform:uppercase;margin:0;text-wrap:balance}
.hero p{margin:0;max-width:70ch;color:var(--muted)}
.stats{display:flex;flex-wrap:wrap;gap:8px 18px;font:500 13px var(--mono);color:var(--muted)}
.stats b{color:var(--ink)}
.crit{display:flex;flex-wrap:wrap;gap:6px}
.crit span{background:var(--chip);border-radius:3px;padding:2px 8px;font-size:12.5px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,520px),1fr));gap:18px}
.card{background:var(--panel);border:1px solid var(--line);border-top:4px solid var(--field);border-radius:6px;padding:16px 18px;display:grid;gap:12px;min-width:0}
.card-h{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
.who{min-width:0;display:grid;gap:2px}
.lane{font:700 12px var(--display);letter-spacing:.12em;text-transform:uppercase;color:var(--track)}
.card h3{font:700 25px/1.05 var(--display);margin:0;text-wrap:balance}
.card a{color:inherit;text-decoration-color:var(--line);text-underline-offset:3px}
.card a:hover,.card a:focus-visible{text-decoration-color:var(--track)}
a:focus-visible{outline:2px solid var(--track);outline-offset:2px}
.url{font:500 12.5px var(--mono);color:var(--muted)!important;overflow-wrap:anywhere}
.ratio{text-align:right;flex:none;display:grid}
.ratio b{font:800 34px/1 var(--display);color:var(--track);font-variant-numeric:tabular-nums}
.ratio span{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}
.facts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0}
.facts div{border-left:2px solid var(--line);padding-left:8px}
.facts dt{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.facts dd{margin:0;font:500 14px var(--mono);font-variant-numeric:tabular-nums}
.sub{margin:0;font-weight:600}
.sub span,.notes span{display:block;font:600 11px var(--body);text-transform:uppercase;letter-spacing:.07em;color:var(--muted)}
.top{width:100%;border-collapse:collapse;font-size:13.5px;display:block;overflow-x:auto}
.top thead,.top tbody{display:table;width:100%;table-layout:auto}
.top th{font:600 11px var(--body);text-transform:uppercase;letter-spacing:.06em;color:var(--muted);text-align:left;padding:4px 6px;border-bottom:1px solid var(--line)}
.top td{padding:6px;border-bottom:1px solid var(--line);vertical-align:top}
.top td:first-child{width:58%}
.top .n{font:500 12.5px var(--mono);white-space:nowrap;font-variant-numeric:tabular-nums}
.notes{display:grid;gap:8px}.notes p{margin:0}
.dots{display:inline-flex;gap:3px;vertical-align:middle}
.dots i{width:10px;height:10px;border-radius:50%;border:1.5px solid var(--field)}
.dots i.on{background:var(--field)}
.src{font-size:12px;color:var(--muted);border-top:1px dashed var(--line);padding-top:8px}
.summary{display:grid;gap:14px;background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:20px}
.summary h2{font:800 30px/1 var(--display);text-transform:uppercase;margin:0}
.summary ol{margin:0;padding-left:22px;display:grid;gap:10px}
.niches h4{margin:0;font:700 19px var(--display)} .niches p{margin:2px 0 0;color:var(--muted);max-width:75ch}
.titles b{display:block;font-weight:600} .titles span{font-size:12.5px;color:var(--muted)}
.pending p{margin:0;color:var(--muted)}
.empty{color:var(--muted)}
@media (max-width:480px){.facts{grid-template-columns:1fr 1fr}.ratio b{font-size:28px}}
</style>
<div class="wrap">
<section class="hero">
  <h1>Nichfinder: corrida, esporte e disciplina</h1>
  <p>Canais novos de vídeos longos que estão performando agora. Encontrados por scraping de buscas no YouTube em português, espanhol e inglês, com filtros "esta semana" e "este mês", e confirmados abrindo cada canal.</p>
  <div class="crit"><span>1º vídeo há ≤ 3 semanas (desde ${d(new Date(Date.parse('2026-11-16') - 21*864e5))})</span><span>vídeos &gt; 8 min</span><span>views altas em relação a inscritos</span><span>PT · ES · EN</span></div>
  <div class="stats"><span>Atualizado: <b>${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })}</b></span><span>Canais verificados: <b>${checked}</b></span><span>Aprovados nos critérios: <b>${passed}</b></span><span>Cards publicados: <b>${list.length}</b></span></div>
</section>
${list.length ? '' : '<p class="empty">Varredura em andamento. Os primeiros canais aparecem aqui assim que forem confirmados.</p>'}
<section class="grid">${list.map(card).join('\n')}</section>
${summary}
<p class="src">Métrica do card: views do melhor vídeo longo ÷ inscritos. Datas exatas vêm do feed RSS público do canal; quando não foi possível confirmar, está escrito "não confirmado". Mídia e padrões de título foram avaliados a partir das miniaturas, títulos e descrições.</p>
</div>`;
fs.writeFileSync('../index.html', html); console.log('cards', list.length, 'checked', checked, 'passed', passed);
