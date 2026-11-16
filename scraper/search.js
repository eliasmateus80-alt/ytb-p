// Fase 1: busca por termos nos 3 idiomas, filtros "esta semana" e "este mês", ordenado por data
const L = require('./lib'); const fs = require('fs');
const TERMS = {
  pt: ['motivação para correr','motivação corrida iniciante','motivação maratona','corrida de rua motivação','motivação para acordar cedo','disciplina motivação','motivação para treinar','motivação academia','história de superação esporte','superação atleta','mentalidade de atleta','motivação treino de madrugada','motivação ultramaratona','motivação ciclismo','disciplina diária hábitos','motivação para não desistir','motivação luta boxe','motivação treino noturno'],
  es: ['motivación para correr','motivación running principiantes','motivación maratón','disciplina motivación','motivación para levantarse temprano','historias de superación deportistas','motivación gimnasio','mentalidad de campeón','motivación ultramaratón','motivación ciclismo','motivación para entrenar','superación personal deporte','motivación para no rendirse'],
  en: ['running motivation','beginner runner motivation','marathon motivation','ultramarathon motivation','discipline motivation','wake up early motivation','5am discipline','gym motivation speech','athlete mindset','sports comeback story','never give up motivational speech','night workout motivation','cycling motivation','boxing motivation','marathon training story','self discipline documentary','stoic discipline']
};
const SP = { week: 'CAISBAgDEAE%3D', month: 'CAISBAgEEAE%3D' }; // sort=upload date + type=video + (this week|this month)
const GL = { pt: 'BR', es: 'MX', en: 'US' };
(async () => {
  await L.init();
  const jobs = []; for (const lang in TERMS) for (const t of TERMS[lang]) for (const f in SP) jobs.push({ lang, t, f });
  const cands = fs.existsSync('../data/candidates.json') ? JSON.parse(fs.readFileSync('../data/candidates.json')) : {};
  let done = 0;
  await L.pool(jobs, 2, async ({ lang, t, f }) => {
    let r; for (let a = 0; a < 3; a++) { try { r = await L.getData(`https://www.youtube.com/results?search_query=${encodeURIComponent(t)}&sp=${SP[f]}&gl=${GL[lang]}`, { pages: 2, endpoint: 'search' }); break; } catch (e) { console.log('retry', t, String(e).slice(0,80)); await new Promise(z => setTimeout(z, 15000 * (a + 1))); } }
    if (!r) return;
    const vids = L.walk([r.data, r.cont], 'videoRenderer');
    for (const v of vids) {
      const len = L.secs(L.txt(v.lengthText)); if (!len || len <= 480) continue;
      const cid = v.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId; if (!cid) continue;
      const c = cands[cid] ||= { channelId: cid, name: L.txt(v.ownerText), langs: [], terms: [], hits: 0 };
      c.hits++; if (!c.langs.includes(lang)) c.langs.push(lang); if (!c.terms.includes(t)) c.terms.push(t);
    }
    if (++done % 5 === 0) fs.writeFileSync('../data/candidates.json', JSON.stringify(cands, null, 1));
    console.log(`${done}/${jobs.length} [${lang}/${f}] ${t}: ${vids.length} results`);
  });
  fs.writeFileSync('../data/candidates.json', JSON.stringify(cands, null, 1));
  console.log('candidates', Object.keys(cands).length);
  await L.close();
})();
