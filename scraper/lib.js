const { chromium } = require('playwright');
let browser, ctx, rssPage;
async function init() {
  browser = await chromium.launch();
  ctx = await browser.newContext({ locale: 'en-US', userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' });
  await ctx.addCookies([{ name: 'SOCS', value: 'CAI', domain: '.youtube.com', path: '/' }, { name: 'PREF', value: 'hl=en&gl=US', domain: '.youtube.com', path: '/' }]);
  await ctx.route('**/*', r => { const t = r.request().resourceType(); if (['image','media','font','stylesheet'].includes(t)) return r.abort(); const u=r.request().url(); if(/googlevideo|doubleclick|googleads|play\.google|accounts\.google|googlesyndication|gstatic\.com|www\.google\.com|c\.youtube\.com|ggpht/.test(u)) return r.abort(); r.continue(); });
}
// load page, return ytInitialData (+player), and follow up to `pages` continuations via in-page innertube fetch
async function getData(url, { pages = 0, player = false, endpoint = 'browse' } = {}) {
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForFunction(() => window.ytInitialData && window.ytcfg, null, { timeout: 25000 });
    const out = { data: await page.evaluate(() => window.ytInitialData), cont: [] };
    if (player) out.player = await page.evaluate(() => { const p = window.ytInitialPlayerResponse; return p && { videoDetails: p.videoDetails, microformat: p.microformat, storyboards: p.storyboards, playability: p.playabilityStatus && p.playabilityStatus.status }; });
    let token = lastToken(out.data);
    for (let i = 0; i < pages && token; i++) {
      const j = await page.evaluate(async ([tok, ep]) => { const r = await fetch(`/youtubei/v1/${ep}?prettyPrint=false`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ context: ytcfg.get('INNERTUBE_CONTEXT'), continuation: tok }) }); return r.json(); }, [token, endpoint]);
      out.cont.push(j); token = lastToken(j);
    }
    return out;
  } finally { await page.close(); }
}
function lastToken(o) {
  const lists = [...walk(o, 'richGridRenderer').map(r => r.contents), ...walk(o, 'appendContinuationItemsAction').map(a => a.continuationItems), ...walk(o, 'reloadContinuationItemsCommand').map(a => a.continuationItems), ...walk(o, 'sectionListRenderer').map(r => r.contents)].filter(Array.isArray);
  const t = lists.map(l => l.at(-1)?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token).filter(Boolean); return t[t.length - 1]; }
function walk(o, key, acc = []) { if (!o || typeof o !== 'object') return acc; if (Array.isArray(o)) { o.forEach(x => walk(x, key, acc)); return acc; } for (const k of Object.keys(o)) { if (k === key) acc.push(o[k]); walk(o[k], key, acc); } return acc; }
const txt = t => !t ? '' : t.simpleText || (t.runs || []).map(r => r.text).join('') || t.content || '';
function num(s) { if (!s) return null; s = String(s).replace(/,/g, '').trim(); if (/^no /i.test(s)) return 0; const m = s.match(/([\d.]+)\s*([KMB])?/i); if (!m) return null; const mult = { K: 1e3, M: 1e6, B: 1e9 }[(m[2] || '').toUpperCase()] || 1; return Math.round(parseFloat(m[1]) * mult); }
function secs(s) { if (!s) return null; const p = s.split(':').map(Number); if (p.some(isNaN)) return null; return p.reduce((a, b) => a * 60 + b, 0); }
// relative "3 weeks ago" -> approx days
function relDays(s) { if (!s) return null; const m = s.match(/(\d+)\s*(second|minute|hour|day|week|month|year)/i); if (!m) return null; const n = +m[1]; return n * { second: 0, minute: 0, hour: 0, day: 1, week: 7, month: 30, year: 365 }[m[2].toLowerCase()]; }
async function pool(items, n, fn) { const res = []; let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; try { res[k] = await fn(items[k], k); } catch (e) { res[k] = { error: String(e).slice(0, 200) }; } } })); return res; }
async function rss(cid) {
  for (let a = 0; a < 3; a++) {
    if (!rssPage) { rssPage = await ctx.newPage(); await rssPage.goto('https://www.youtube.com/robots.txt'); }
    const x = await rssPage.evaluate(async u => { try { const r = await fetch(u); return r.ok ? r.text() : null; } catch { return null; } }, `https://www.youtube.com/feeds/videos.xml?channel_id=${cid}`);
    if (x) { return [...x.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m => { const e = m[1]; const g = re => (e.match(re) || [])[1]; return { id: g(/<yt:videoId>([^<]+)/), title: (g(/<media:title>([^<]*)/) || '').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'"), published: g(/<published>([^<]+)/), views: g(/views="(\d+)"/) != null ? +g(/views="(\d+)"/) : null, likes: g(/count="(\d+)"/) != null ? +g(/count="(\d+)"/) : null, isShort: /\/shorts\//.test(g(/<link rel="alternate" href="([^"]+)/) || '') }; }); }
    await new Promise(z => setTimeout(z, 5000 * (a + 1)));
  }
  return null;
}
async function oembedMany(ids) {
  if (!rssPage) { rssPage = await ctx.newPage(); await rssPage.goto('https://www.youtube.com/robots.txt'); }
  return rssPage.evaluate(async ids => { const out = {}; let i = 0;
    await Promise.all(Array.from({ length: 8 }, async () => { while (i < ids.length) { const id = ids[i++]; try { const r = await fetch(`/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`); if (r.ok) out[id] = (await r.json()).title; } catch {} } }));
    return out; }, ids);
}
module.exports = { oembedMany, rss, init, getData, walk, txt, num, secs, relDays, pool, close: () => browser.close() };
