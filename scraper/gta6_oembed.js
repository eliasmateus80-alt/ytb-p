const L = require('./lib'); const fs = require('fs');
const V = JSON.parse(fs.readFileSync('../gta6/videos.json'));
(async () => { await L.init();
  const ids = Object.keys(V); const res = await L.oembedMany(ids);
  let ok = 0; for (const id of ids) if (res[id]) { V[id].origTitle = res[id]; ok++; }
  fs.writeFileSync('../gta6/videos.json', JSON.stringify(V, null, 1)); console.log('oembed ok', ok, '/', ids.length); await L.close(); })();
