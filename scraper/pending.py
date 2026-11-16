# Lista aprovados ainda não anotados; auto-exclui os fracos (maioria shorts, <100 views no melhor vídeo, ou views < 2x inscritos)
import json
d = json.load(open('../data/channels.json')); A = json.load(open('../data/annotations.json'))
auto = 0
for x in d.values():
    if x['status'] not in ('pass', 'unconfirmed') or x['channelId'] in A: continue
    best = max([v['views'] or 0 for v in x['top']] or [0])
    weak = x['nLong'] / max(x['nVideos'], 1) < 0.5 or best < 100 or (x['subs'] and best < 2 * x['subs'])
    if weak:
        A[x['channelId']] = {'exclude': True, 'auto': 'fraco: shorts/views baixas'}; auto += 1; continue
    f = x['firstVideo']
    print(x['channelId'][-6:], '|', x['name'][:28], '|', x['subs'], '|', best, '|', x.get('videoCountTotal'), x['nLong'], '|', (f.get('date') or '')[:10] or f.get('approx'), '|', ' // '.join(v['title'][:55] for v in x['top'][:3]))
    print('     D:', x['description'][:110].replace('\n', ' '))
json.dump(A, open('../data/annotations.json', 'w'), ensure_ascii=False, indent=1); print('auto-excluídos', auto)
