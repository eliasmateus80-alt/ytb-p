// Enriquece os vídeos de GTA 6: título original, data e views exatas (RSS) + inscritos do canal
const L = require('./lib'); const fs = require('fs');
const V = JSON.parse(fs.readFileSync('../gta6/videos.json'));
const top = Object.values(V).sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 400);
const chans = [...new Set(top.map(v => v.channelId).filter(Boolean))];
(async () => {
  await L.init(); const C = {}; let n = 0;
  await L.pool(chans, 3, async cid => {
    const out = { feed: null, subs: null };
    try { out.feed = await L.rss(cid); } catch {}
    try { const r = await L.getData(`https://www.youtube.com/channel/${cid}/videos`); const parts = L.walk(L.walk(r.data, 'pageHeaderViewModel')[0]?.metadata, 'metadataParts').flat().map(p => p.text?.content || ''); const s = parts.find(t => /subscriber/i.test(t)); out.subsText = s || null; out.subs = s ? L.num(s) : null; out.handle = parts.find(t => t.startsWith('@')) || null; } catch {}
    C[cid] = out; if (++n % 25 === 0) console.log(n, '/', chans.length);
  });
  for (const v of top) { const c = C[v.channelId]; if (!c) continue; v.subs = c.subs; v.subsText = c.subsText; v.handle = c.handle; const e = (c.feed || []).find(e => e.id === v.id);
    if (e) { v.origTitle = e.title; v.date = e.published; if (e.views != null) { v.viewsRss = e.views; } v.isShort = e.isShort; } }
  fs.writeFileSync('../gta6/videos.json', JSON.stringify(V, null, 1)); console.log('ok', top.filter(v => v.date).length, 'com data exata');
  await L.close();
})();
