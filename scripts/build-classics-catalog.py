"""Build source-address metadata only; no modern translations are redistributed."""
import argparse
import json
import pathlib
import re
from bs4 import BeautifulSoup

ROOT = pathlib.Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--sources', required=True, type=pathlib.Path)
args = parser.parse_args()
catalog = {}
for code in ['001', '002', '003', '004', '006', '007', '008', '010', '013']:
    soup = BeautifulSoup((args.sources / (code+'.html')).read_text(encoding='utf-8'), 'html.parser')
    entries = []
    for link in soup.select('a[href]'):
        path = link['href']
        if not re.fullmatch('/bazi/'+code+r'/\d{3}/', path):
            continue
        chapter = int(path.rstrip('/').split('/')[-1])
        if chapter == 0:
            continue
        title = re.sub(r'^\d+\s*', '', link.get_text(' ', strip=True))
        title = re.sub(r'\s+译$', '', title).strip()
        if chapter not in [o['chapter'] for o in entries]:
            entries.append({'chapter': chapter, 'title': title, 'url': 'https://luckclub.cn'+path})
    assert entries, code
    catalog[code] = entries
soup = BeautifulSoup((args.sources/'tianyuan-wuxian-jing.html').read_text(encoding='utf-8'), 'html.parser')
entries = []
for link in soup.select('a[href]'):
    if not re.fullmatch(r'/zh-CN/learn/books/tianyuan-wuxian-jing/\d+', link['href']):
        continue
    chapter = int(link['href'].split('/')[-1])
    if chapter in [o['chapter'] for o in entries] or link.get_text(strip=True) == '开始阅读':
        continue
    title = re.sub(r'^\d+\s*', '', link.get_text(' ', strip=True))
    title = re.sub(r'\s*\d+\s*字$', '', title).strip()
    entries.append({'chapter': chapter, 'title': title, 'url': 'https://tianjihq.com'+link['href']})
assert len(entries) == 43
catalog['tianyuan'] = entries
payload = {'version': '2026-11-04.1', 'books': catalog}
canonical = ROOT/'content/bazi-public-catalog.json'
canonical.write_text(json.dumps(payload, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
(ROOT/'dist/static/newguji/catalog.js').write_text(
    '/* Source catalogue addresses, not book or translation text. */\nwindow.BaziPublicCatalog='+
    json.dumps(payload, ensure_ascii=False, separators=(',', ':'))+';\n', encoding='utf-8')
print(json.dumps({'catalogues': len(catalog), 'chapters': sum(map(len, catalog.values())), 'textBundled': False}))
