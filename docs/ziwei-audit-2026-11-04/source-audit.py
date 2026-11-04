"""Read-only reproduction of the last-major-star context segmentation defect."""
from pathlib import Path
import hashlib
import json
import re
from bs4 import BeautifulSoup

root = Path(__file__).resolve().parents[2]
data = json.loads((root/'dist/static/data/ziwei-reading.json').read_text(encoding='utf-8'))
source = Path('D:/zaohua-release-work/ziwei-knowledge-research/quanshu-二.html')
raw = source.read_bytes()
assert hashlib.sha256(raw).hexdigest() == data['contextSha256']
soup = BeautifulSoup(raw.decode('utf-8'), 'html.parser')
headings = [h for h in soup.select('.mw-parser-output h3') if '安身命例' not in h.get_text()]
trad = '紫微 天機 太陽 武曲 天同 廉貞 天府 太陰 貪狼 巨門 天相 天梁 七殺 破軍'.split()
results = []
for palace, heading in zip(data['palaceOrder'], headings):
    pieces = []
    for el in heading.parent.next_siblings:
        if getattr(el, 'name', None) == 'div' and 'mw-heading' in el.get('class', []):
            break
        if hasattr(el, 'get_text'):
            pieces.append(el.get_text('\n', strip=True))
    text = '\n'.join(pieces)
    positions, seen = [], set()
    for match in re.finditer(r'(?m)^('+'|'.join(trad)+r')(?!同)', text):
        if match.group(1) not in seen:
            seen.add(match.group(1)); positions.append((match.start(), match.group(1)))
    if not positions:
        continue
    start, star = positions[-1]
    tail = text[start:]
    aux = re.findall(r'(?m)^(文昌|文曲|左輔|右弼|祿存|擎羊|陀羅|火星|鈴星)', tail)
    if aux:
        results.append({'palace': palace, 'lastMajor': star,
                        'independentAuxiliaryHeadingsInBlock': aux,
                        'tailPreview': re.sub(r'\s+', '', tail)[-200:]})
result = {'contaminatedLastMajorBlocks': results, 'allContextCount': len(data['contexts']),
          'sourceHashMatchesBundle': True}
(Path(__file__).parent/'source-results.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(json.dumps({'chaptersWithMixedContext': len(results), 'sourceHashMatchesBundle': True}))
