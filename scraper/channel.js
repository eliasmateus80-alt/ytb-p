// Fase 2: abre cada canal candidato, lista todos os vídeos longos, confirma data do 1º vídeo e os 3 melhores na página do vídeo
const L = require('./lib'); const fs = require('fs');
const TODAY = new Date('2026-11-16T00:00:00Z'); const CUTOFF = new Date(TODAY - 21 * 864e5); // 3 semanas
const OUT = '../data/channels.json';
const cands = Object.values(JSON.parse(fs.readFileSync('../data/candidates.json')));
const res = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT)) : {};
const save = () => { fs.writeFileSync(OUT + '.tmp', JSON.stringify(res, null, 1)); fs.renameSync(OUT + '.tmp', OUT); };
function parseLockups(o) {
  return L.walk(o, 'lockupViewModel').filter(l => l.contentType === 'LOCKUP_CONTENT_TYPE_VIDEO').map(l => {
    const md = l.metadata?.lockupMetadataViewModel; const parts = L.walk(md?.metadata, 'metadataParts').flat();
    const badge = L.walk(l.contentImage, 'thumbnailBadgeViewModel').map(b => b.text).find(t => /\d:\d/.test(t || ''));
    const viewsP = parts.find(p => /view/i.test(p.accessibilityLabel || p.text?.content || '')); const pubP = parts.find(p => /ago|Streamed|Premiered/i.test(p.text?.content || ''));
    return { id: l.contentId, title: md?.title?.content, viewsText: viewsP?.accessibilityLabel || viewsP?.text?.content, views: L.num((viewsP?.accessibilityLabel || viewsP?.text?.content || '').replace(/ thousand/i,'K').replace(/ million/i,'M')), lenText: badge, len: L.secs(badge), pubText: pubP?.text?.content, days: L.relDays(pubP?.accessibilityLabel || pubP?.text?.content) };
  });
}
async function watch(id) { return { publishDate: null, views: null, src: "não confirmado" }; }
async function watchOld(id) {
  for (let a = 0; a < 2; a++) { try {
    const r = await L.getData(`https://www.youtube.com/watch?v=${id}`, { player: true });
    const vp = L.walk(r.data, 'videoPrimaryInfoRenderer')[0]; const d = L.txt(vp?.dateText);
    const dt = d ? new Date(d.replace(/^(Premiered|Streamed live on|Started streaming on)\s*/,'') + ' UTC') : null;
    return { publishDate: r.player?.microformat?.playerMicroformatRenderer?.publishDate || (dt && !isNaN(dt) ? dt.toISOString().slice(0,10) : null), views: r.player?.videoDetails?.viewCount ? +r.player.videoDetails.viewCount : L.num(L.txt(vp?.viewCount?.videoViewCountRenderer?.viewCount)), src: 'watch' };
  } catch (e) { await new Promise(z => setTimeout(z, 10000)); } }
  return { publishDate: null, views: null, src: 'falhou' };
}
(async () => {
  await L.init();
  const todo = cands.filter(c => !res[c.channelId]).sort((a, b) => b.hits - a.hits);
  console.log('to check', todo.length);
  let n = 0;
  await L.pool(todo, 6, async c => {
    const out = { ...c, checkedAt: new Date().toISOString() };
    try {
      let r = await L.getData(`https://www.youtube.com/channel/${c.channelId}/videos`, { pages: 0 });
      const vc0 = L.walk(L.walk(r.data, 'pageHeaderViewModel')[0]?.metadata, 'metadataParts').flat().map(p => p.text?.content || '').find(t => /video/i.test(t));
      const nTotal = vc0 ? L.num(vc0) : null; out.videoCountTotal = nTotal;
      if (nTotal != null && nTotal > 120) { out.status = 'reject'; out.reason = `canal com ${nTotal} vídeos, não é novo`; out.name = c.name; return; }
      if (nTotal == null || nTotal > 30) r = await L.getData(`https://www.youtube.com/channel/${c.channelId}/videos`, { pages: 4 });
      const meta = L.walk(r.data, 'channelMetadataRenderer')[0] || {};
      const hdrParts = L.walk(L.walk(r.data, 'pageHeaderViewModel')[0]?.metadata, 'metadataParts').flat().map(p => p.text?.content || '');
      out.name = meta.title || c.name; out.handle = hdrParts.find(t => t.startsWith('@')) || null; out.url = meta.vanityChannelUrl || `https://www.youtube.com/channel/${c.channelId}`;
      out.subsText = hdrParts.find(t => /subscriber/i.test(t)) || null; out.subs = out.subsText ? L.num(out.subsText) : null; out.videoCountText = hdrParts.find(t => /video/i.test(t)) || null;
      out.description = (meta.description || '').slice(0, 500); out.keywords = (meta.keywords || '').slice(0, 300);
      const vids = parseLockups([r.data, r.cont]); out.nVideos = vids.length; out.moreThanFetched = !!L.walk(r.cont.at(-1) || r.data, 'continuationItemRenderer').length && r.cont.length === 4;
      out.nLong = vids.filter(v => v.len > 480).length; out.totalViews = vids.reduce((a, v) => a + (v.views || 0), 0);
      const longs = vids.filter(v => v.len > 480); out.longShare = vids.length ? longs.length / vids.length : 0;
      if (!vids.length) { out.status = 'reject'; out.reason = 'sem vídeos na aba Vídeos'; return; }
      if (out.moreThanFetched) { out.status = 'reject'; out.reason = 'canal com muitos vídeos (>120), não é novo'; return; }
      const oldest = vids[vids.length - 1]; out.oldestText = oldest.pubText;
      if (oldest.days == null || oldest.days > 27) { out.status = 'reject'; out.reason = `vídeo mais antigo da aba Vídeos: ${oldest.pubText}`; return; }
      if (!longs.length) { out.status = 'reject'; out.reason = 'nenhum vídeo > 8 min'; return; }
      if (out.totalViews === 0) { out.status = 'reject'; out.reason = 'tudo zerado'; return; }
      const feed = await L.rss(c.channelId); out.rssCount = feed ? feed.length : null;
      const byId = Object.fromEntries((feed || []).map(e => [e.id, e]));
      // 1º vídeo: se o RSS tem < 15 entradas, ele contém TODO o histórico (inclui shorts)
      let first = null, firstSrc = null;
      if (feed && feed.length && feed.length < 15) { first = feed.reduce((m, e) => e.published < m.published ? e : m); firstSrc = 'RSS (histórico completo)'; }
      else if (byId[oldest.id]) { first = byId[oldest.id]; firstSrc = 'RSS (vídeo longo mais antigo; canal pode ter shorts anteriores)'; }
      else { const w = await watch(oldest.id); if (w.publishDate) { first = { id: oldest.id, title: oldest.title, published: w.publishDate }; firstSrc = 'página do vídeo'; } }
      out.firstVideo = first ? { id: first.id, title: first.title, date: first.published, src: firstSrc, isShort: !!first.isShort } : { id: oldest.id, title: oldest.title, date: null, approx: oldest.pubText, src: 'não confirmado' };
      if (first && new Date(first.published) < CUTOFF) { out.status = 'reject'; out.reason = `1º vídeo em ${first.published.slice(0, 10)} (>3 semanas)`; return; }
      if (!first) { out.status = 'unconfirmed'; out.reason = 'data do 1º vídeo não confirmada'; }
      const top = longs.sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 3);
      out.top = []; for (const v of top) { const e = byId[v.id]; let date = e?.published || null, views = e?.views ?? v.views, src = e ? 'RSS' : 'aba Vídeos';
        if (!date) { const w = await watch(v.id); date = w.publishDate; if (w.views != null) views = w.views; src = w.src; }
        out.top.push({ id: v.id, title: e?.title || v.title, views, lenText: v.lenText, len: v.len, date, approx: v.pubText, src }); }
      out.allTitles = vids.map(v => ({ title: v.title, views: v.views, len: v.lenText, pub: v.pubText }));
      out.nShortsInRss = (feed || []).filter(e => e.isShort).length;
      out.status ||= 'pass';
    } catch (e) { out.status = 'error'; out.reason = String(e).slice(0, 200); }
    finally { res[c.channelId] = out; if (++n % 10 === 0) { save(); console.log(n, 'checked; pass:', Object.values(res).filter(x => x.status === 'pass').length); } }
  });
  save(); await L.close();
  const v = Object.values(res); console.log('done', v.length, 'pass', v.filter(x => x.status === 'pass').length, 'unconf', v.filter(x => x.status === 'unconfirmed').length, 'err', v.filter(x => x.status === 'error').length);
})();
