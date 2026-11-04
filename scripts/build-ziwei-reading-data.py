"""Compile editorial technique readings and complete public-domain context.

Usage: python scripts/build-ziwei-reading-data.py --source-dir D:/zaohua-release-work/ziwei-knowledge-research
Text sources are maintained under content; private upstream judgment code is not imported.
"""
import argparse
import hashlib
import json
import pathlib
import re
from bs4 import BeautifulSoup

ROOT = pathlib.Path(__file__).resolve().parents[1]
PALACES = '命宫 兄弟 夫妻 子女 财帛 疾厄 迁移 仆役 官禄 田宅 福德 父母'.split()
MAJORS = '紫微 天机 太阳 武曲 天同 廉贞 天府 太阴 贪狼 巨门 天相 天梁 七杀 破军'.split()
TRAD = '紫微 天機 太陽 武曲 天同 廉貞 天府 太陰 貪狼 巨門 天相 天梁 七殺 破軍'.split()
EXTRA_TRAD = '文昌 文曲 左輔 右弼 祿存 天魁 天鉞 擎羊 陀羅 火星 鈴星 天空 地劫 化祿 化權 化科 化忌 歲君 斗君'.split()
EXTRA_NAMES = '文昌 文曲 左辅 右弼 禄存 天魁 天钺 擎羊 陀罗 火星 铃星 地空 地劫 化禄 化权 化科 化忌 岁君 斗君'.split()
parser = argparse.ArgumentParser()
parser.add_argument('--source-dir', required=True, type=pathlib.Path)
args = parser.parse_args()

def table(name, columns):
    rows = {}
    for n, line in enumerate((ROOT/'content'/name).read_text(encoding='utf-8').splitlines(), 1):
        if not line.strip() or line.startswith('#'):
            continue
        fields = line.split('|')
        assert len(fields) == len(columns)+1, (name, n, len(fields))
        key = fields[0]
        assert key and key not in rows and all(v.strip() for v in fields), (name, n)
        rows[key] = dict(zip(columns, fields[1:]))
    return rows

meta = json.loads((ROOT/'content/ziwei-techniques.json').read_text(encoding='utf-8'))
profiles = table('ziwei-palaces.tsv', PALACES)
pairs = table('ziwei-pairs.tsv', PALACES)
assert set(profiles) == set(MAJORS) and len(pairs) == 24
known = []
for key in pairs:
    names = [n for n in MAJORS if n in key]
    assert len(names) == 2 and ''.join(names) == key, key
    known.append({'stars': names, 'palaces': pairs[key]})

raw = (args.source_dir/'quanshu-二.html').read_bytes()
soup = BeautifulSoup(raw.decode('utf-8'), 'html.parser')
headings = [h for h in soup.select('.mw-parser-output h3') if '安身命例' not in h.get_text()]
assert len(headings) == 12
contexts = {}
for palace, h in zip(PALACES, headings):
    pieces = []
    for el in h.parent.next_siblings:
        if getattr(el, 'name', None) == 'div' and 'mw-heading' in el.get('class', []):
            break
        if hasattr(el, 'get_text') and el.name != 'table':
            pieces.append(el.get_text('\n', strip=True))
    text = '\n'.join(pieces)
    # Whole subject blocks are preserved. Do not infer inherited conditions
    # from punctuation as the retired 550-fragment matcher did.
    positions, seen = [], set()
    subjects = TRAD + EXTRA_TRAD
    # The 命宫 chapter interleaves poems that begin with another major's name.
    # Only the actual element/introduction lines start independent subjects.
    pattern = r'(?m)^('+'|'.join(subjects)+r')(?!同)'
    for match in re.finditer(pattern, text):
        if palace == '命宫':
            rest = text[match.end():].split('\n', 1)[0]
            if not re.match(r'(?:屬?[土木金水火]|，南斗|乃空亡|星[土木金水火]|，正月)', rest):
                continue
        if match.group(1) not in seen:
            seen.add(match.group(1)); positions.append((match.start(), match.group(1)))
    for j, (start, star) in enumerate(positions):
        body = re.sub(r'\s+', '', text[start:positions[j+1][0] if j+1 < len(positions) else len(text)])
        if body:
            modern = dict(zip(subjects, MAJORS+EXTRA_NAMES))[star]
            contexts[palace+':'+modern] = {
                'text': body, 'chapter': h.get_text(' ', strip=True).replace('[ 編輯 ]', '').strip(),
                'anchor': h.get('id'), 'star': modern,
                'id': 'quanshu2:'+palace+':'+modern,
                'source': 'quanshu', 'sourceStar': star, 'start': start,
                'end': positions[j+1][0] if j+1 < len(positions) else len(text)}

data = {
    'schemaVersion': 4, 'contentVersion': meta.pop('version'), 'palaceOrder': PALACES,
    'majorNames': MAJORS, 'profiles': profiles, 'pairs': known,
    'hua': table('ziwei-transformations.tsv', list('禄权科忌')),
    'brightness': table('ziwei-brightness.tsv', ['strong', 'weak']),
    'auxiliary': table('ziwei-auxiliary.tsv', PALACES),
    'patternMeanings': {k:v['text'] for k,v in table('ziwei-pattern-meanings.tsv', ['text']).items()},
    'details': [{'id':k,**v} for k,v in table('ziwei-details.tsv', ['palace','star','type','value','title','text']).items()],
    'contexts': contexts, 'contextSha256': hashlib.sha256(raw).hexdigest(), **meta,
}
reviewed = json.loads((ROOT/'content/ziwei-reviewed-details.json').read_text(encoding='utf-8'))
for entry in reviewed:
    assert entry['context'] in contexts and entry['quote'] in contexts[entry['context']]['text'], entry['id']
    data['details'].append({k:v for k,v in entry.items() if k not in ['context','quote']})
assert set(data['hua']) == set(PALACES)
assert len(data['auxiliary']) == 14 and len(data['brightness']) == 14
assert set(data['palaceNotes']) == set(PALACES)
assert len(contexts) >= 140

# Every editorial text gets an addressable record and explicit review status.
# A source page or adjacent ancient passage is not proof of a modern assertion.
provenance = {}
def trace(key, palace=None, stars=(), refs=('quanshu',), conditions=None):
    passages = [palace+':'+s for s in stars if palace+':'+s in contexts] if palace else []
    provenance[key] = {'id': key, 'version': data['contentVersion'], 'school': 'shared',
        'layer': 'natal', 'palace': palace, 'stars': list(stars),
        'conditions': conditions or {}, 'exclusions': [], 'center': palace,
        'sourceRefs': list(refs), 'contextKeys': passages,
        'status': 'editorial-reference',
        'note': '白话整理；所列原段为参照，未完成逐句独立审校。'}
for star in MAJORS:
    for palace in PALACES:
        trace('profile:'+palace+':'+star, palace, [star], conditions={'samePalace': [star]})
for pair in known:
    for palace in PALACES:
        trace('pair:'+palace+':'+''.join(pair['stars']),palace,pair['stars'],conditions={'samePalace':pair['stars']})
for star in data['auxiliary']:
    for palace in PALACES:
        trace('aux:'+palace+':'+star,palace,[star],('quanshu','minor'),{'samePalace':[star]})
for detail in data['details']:
    trace('detail:'+detail['id'],detail['palace'],[detail['star']],('quanshu','mutagen' if detail['type']=='mutagen' else 'stars'),{detail['type']:detail['value']})
for entry in reviewed:
    provenance['detail:'+entry['id']]['sourceQuote'] = entry['quote']
    if entry.get('brightnessValues'):
        provenance['detail:'+entry['id']]['conditions']['brightnessValues'] = entry['brightnessValues']
    provenance['detail:'+entry['id']]['note'] = '已核对原段和本条取用的条件；现代措辞为编辑转述，非现实预测的验证。'
for star in data['misc']:
    trace('misc:'+star,stars=[star],refs=('misc',),conditions={'presentStar':star})
for key in data['starMutagens']:
    trace('mutagen:'+key,stars=[key[:-1]],refs=('mutagen',),conditions={'mutagen':key[-1]})
for palace in PALACES:
    for mut in '禄权科忌':
        trace('hua:'+palace+':'+mut,palace,refs=('mutagen',),conditions={'mutagen':mut})
for star in MAJORS:
    for level in ['strong','weak']:
        trace('brightness:'+star+':'+level,stars=[star],refs=('stars',),conditions={'brightnessGroup':level})
for pattern in data['patternMeanings']:
    trace('pattern:'+pattern,refs=('upstream','pattern'),conditions={'detector':pattern})
for kind in ['self', 'incoming', 'huaPairs']:
    for key in data[kind]:
        trace(kind+':'+key,refs=('mutagen',),conditions={'relationship':kind,'mutagen':key})
for palace in PALACES:
    trace('palace:'+palace,palace,refs=('palace',),conditions={'palace':palace})
data['provenance'] = provenance
target = ROOT/'dist/static/data/ziwei-reading.json'
target.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':'))+'\n', encoding='utf-8')
print(json.dumps({'palaces': len(PALACES), 'singlePalaceTexts': 168, 'pairPalaceTexts': len(known)*12,
                  'huaPalaceTexts': 48, 'auxiliaryPalaceTexts': 168, 'brightnessTexts': 28,
                  'starMutagenTexts': len(data['starMutagens']), 'miscStars': len(data['misc']),
                  'sourceContexts': len(contexts), 'bytes': target.stat().st_size}))
