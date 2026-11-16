import json, os, sys
d = json.load(open('/home/user/ytb-p/data/channels.json'))
ann = json.load(open('/home/user/ytb-p/data/annotations.json')) if os.path.exists('/home/user/ytb-p/data/annotations.json') else {}
for x in d.values():
    if x['status'] in ('pass', 'unconfirmed') and x['channelId'] not in ann:
        f = x['firstVideo']; best = max([v['views'] or 0 for v in x['top']] or [0])
        print('##', x['channelId'], '|', x['name'], '|', x['subsText'], '| tot', x.get('videoCountTotal'), '| long', x['nLong'], '/', x['nVideos'], '| 1st', (f.get('date') or '')[:10] or f.get('approx'), f['src'][:12], '| best', best)
        for v in x['top']: print('   ', v['views'], v['lenText'], (v['date'] or '')[:10], v['title'][:95])
        print('   D:', x['description'][:140].replace('\n', ' '))
        print('   T:', ' || '.join(sorted(set(a['title'][:60] for a in x['allTitles'])))[:330])
