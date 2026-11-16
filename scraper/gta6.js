// GTA 6: vídeos mais vistos do último mês e da última semana (busca ordenada por views), PT/ES/EN
const L = require('./lib'); const fs = require('fs');
const TERMS = {
  en: ['GTA 6','GTA 6 news','GTA VI','GTA 6 trailer 3','GTA 6 trailer','GTA 6 leak','GTA 6 release date','GTA 6 delay','GTA 6 gameplay','GTA 6 price','Rockstar GTA 6 update','GTA 6 map'],
  pt: ['GTA 6 notícias','GTA 6 novidades','GTA 6 trailer','GTA 6 vazamento','GTA 6 lançamento','GTA 6 adiado','GTA 6 preço','GTA 6 gameplay'],
  es: ['GTA 6 noticias','GTA 6 filtración','GTA 6 fecha de lanzamiento','GTA 6 nuevo tráiler','GTA 6 retraso','GTA 6 precio']
};
const SP = { month: 'CAMSBAgEEAE%3D', week: 'CAMSBAgDEAE%3D' }; // sort=view count + type=video + período
const GL = { pt: 'BR', es: 'MX', en: 'US' };
(async () => {
  await L.init();
  const jobs = []; for (const lang in TERMS) for (const t of TERMS[lang]) for (const f in SP) jobs.push({ lang, t, f });
  const vids = {}; let done = 0;
  await L.pool(jobs, 2, async ({ lang, t, f }) => {
    let r; for (let a = 0; a < 3; a++) { try { r = await L.getData(`https://www.youtube.com/results?search_query=${encodeURIComponent(t)}&sp=${SP[f]}&gl=${GL[lang]}`, { pages: 2, endpoint: 'search' }); break; } catch (e) { await new Promise(z => setTimeout(z, 15000 * (a + 1))); } }
    if (!r) return;
    for (const v of L.walk([r.data, r.cont], 'videoRenderer')) {
      const title = L.txt(v.title); if (!/gta\s*(6|vi\b)|grand theft auto (6|vi)/i.test(title + ' ' + L.txt(v.detailedMetadataSnippets?.[0]?.snippetText))) continue;
      const x = vids[v.videoId] ||= { id: v.videoId, title, channel: L.txt(v.ownerText), channelId: v.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId, lenText: L.txt(v.lengthText), len: L.secs(L.txt(v.lengthText)), views: L.num(L.txt(v.viewCountText)), pubText: L.txt(v.publishedTimeText), days: L.relDays(L.txt(v.publishedTimeText)), langs: [], terms: [], periods: [] };
      if (!x.langs.includes(lang)) x.langs.push(lang); if (!x.terms.includes(t)) x.terms.push(t); if (!x.periods.includes(f)) x.periods.push(f);
    }
    console.log(`${++done}/${jobs.length} ${lang}/${f} ${t} → ${Object.keys(vids).length}`);
  });
  fs.writeFileSync('../gta6/videos.json', JSON.stringify(vids, null, 1)); console.log('videos', Object.keys(vids).length);
  await L.close();
})();
