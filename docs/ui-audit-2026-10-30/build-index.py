"""Build a local evidence gallery and integrity manifest; does not change app files."""
from pathlib import Path
from html import escape
import hashlib
import json
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
REPORT = ROOT / 'docs/2026-10-30_UI显示深度审核报告.md'
inventory = json.loads((OUT / 'inventory.json').read_text(encoding='utf-8'))
issues = [
    ('UI-01', 'P1', '小屏紫微：宫盘与运限不能同屏', 'ziwei-fresh-qintian-selected-320'),
    ('UI-02', 'P1', '夜间模式：浅底配浅字，主题错配', 'night-mode-event-confirmed-430'),
    ('UI-03', 'P2', '断事笔记：保存栏覆盖正文', 'notes-occlusion-430x500'),
    ('UI-04', 'P2', '设置头部：竖排挤压、默认按钮外观', 'settings-320'),
    ('UI-05', 'P2', '宽度变化：八字时柱被挤出屏幕', 'bazi-resize-confirmed-320'),
    ('UI-06', 'P2', '梅花逐爻：点击高度仅 5 px', 'meihua-interactive-lines-320'),
    ('UI-07', 'P3', '记录列表：长姓名直接裁断', 'records-name-confirmed-320'),
    ('UI-08', 'P3', '基本信息：原始占位符直接显示', 'bazi-0-320'),
]
issues_by_name = {item[3]: item for item in issues}
cards = []
ordered = [next(s for s in inventory['screens'] if s['name'] == i[3]) for i in issues]
ordered += [s for s in inventory['screens'] if s['name'] not in issues_by_name]
for screen in ordered:
    name = screen['name']
    issue = issues_by_name.get(name)
    title = ' · '.join(issue[:3]) if issue else name
    tag = issue[1] if issue else '留档'
    cards.append(f'''<article data-search="{escape(title + ' ' + name, quote=True)}" data-issue="{'yes' if issue else 'no'}">
    <h2><span class="tag {tag}">{tag}</span> {escape(title)}</h2>
    <a href="{escape(name)}.png" target="_blank"><img loading="lazy" src="{escape(name)}.png" alt="{escape(title)}"></a>
    <p>{screen['width']} × {screen['height']} CSS px</p>
    <p><a href="{escape(name)}.png" target="_blank">原尺寸截图</a> · <a href="{escape(name)}.json" target="_blank">DOM / 尺寸记录</a></p>
    </article>''')
html = '''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>造化元钥 · UI 审核证据</title><style>
:root{color-scheme:light;font:15px/1.7 system-ui,sans-serif;color:#23483b;background:#f5f1e9}body{max-width:1440px;margin:auto;padding:28px}h1{font-family:serif;margin:0 0 10px;font-size:30px}header{margin-bottom:24px}a{color:#23483b;text-underline-offset:3px}nav{display:flex;gap:16px;flex-wrap:wrap;margin:16px 0}input{padding:10px;border:1px solid #b5c1b8;border-radius:5px;background:#fffdf8;font:inherit;min-width:220px}label{padding:8px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:20px;align-items:start}article{padding:14px;border:1px solid #d4d8ce;border-radius:8px;background:#fffdf8;min-width:0}article[hidden]{display:none}h2{font-size:14px;min-height:48px;margin:0 0 12px;overflow-wrap:anywhere}img{display:block;width:100%;height:420px;object-fit:contain;object-position:top;background:#e6e6de}p{margin:8px 0}.tag{display:inline-block;padding:1px 6px;border-radius:4px;background:#e7ebe3}.P1{background:#f5d8ce;color:#8a3b26}.P2{background:#f1e7cd;color:#6c571f}.P3{background:#dce9df}small{color:#566b61}#count{font-weight:bold}
</style><header><h1>造化元钥 · UI 显示深度审核</h1>
<p>2026-10-30 · v1.0.12 对照 · 8 项已确认问题 + 伴随主题异常 + 待设备复核风险</p>
<p><strong>范围：</strong>当前项目在 Windows Chrome 移动视口的运行证据，尚未在 Android 设备复测。自动几何计数不是缺陷数量。日主和旺衰正文实际正常显示，未列为空白故障。</p>
<nav><a href="../2026-10-30_UI显示深度审核报告.md">详细审核报告</a><a href="evidence-manifest.json">哈希与版本核对</a><a href="inventory.json">截图清单</a><a href="layout-check.json">窗口变化 / 夜间模式证据</a></nav>
<input id="search" aria-label="搜索页面或问题" placeholder="搜索：紫微、UI-03、notes…"><label><input type="checkbox" id="issues" checked>只看已确认问题</label> <span id="count"></span>
<p><small>点击图片打开原尺寸；各图片均附尺寸快照。下方筛选可查看全部 __COUNT__ 组留档。</small></p></header><main>__CARDS__</main>
<script>const search=document.querySelector('#search'),only=document.querySelector('#issues'),cards=[...document.querySelectorAll('article')];function filter(){let count=0;for(const c of cards){c.hidden=(only.checked&&c.dataset.issue!=='yes')||!c.dataset.search.toLowerCase().includes(search.value.trim().toLowerCase());if(!c.hidden)count++}document.querySelector('#count').textContent=count+' / '+cards.length}search.addEventListener('input',filter);only.addEventListener('change',filter);filter();</script></html>'''
(OUT / 'index.html').write_text(html.replace('__COUNT__', str(len(ordered))).replace('__CARDS__', '\n'.join(cards)), encoding='utf-8')

def sha(data):
    return hashlib.sha256(data).hexdigest()

sources = [ROOT / 'dist/static/css/fivearts.css', ROOT / 'dist/static/css/paper-forest.css',
           ROOT / 'dist/static/css/paper-forest-details.css', ROOT / 'dist/static/js/fivearts-ui.js',
           ROOT / 'dist/static/js/paper-forest-details.js', ROOT / 'dist/static/js/paper-forest.js',
           ROOT / 'dist/static/js/2.22f599c1df781213e096.js']
apk = ROOT / 'release/android/zaohua-v1.0.12.apk'
with zipfile.ZipFile(apk) as z:
    apk_comparison = []
    for file in sources[:5]:
        internal = 'assets/public/' + file.relative_to(ROOT / 'dist').as_posix()
        archive_hash, local_hash = sha(z.read(internal)), sha(file.read_bytes())
        apk_comparison.append({'file': file.relative_to(ROOT).as_posix(), 'apk_entry': internal,
                               'local_sha256': local_hash, 'apk_sha256': archive_hash, 'identical': archive_hash == local_hash})
files = sorted([p for p in OUT.iterdir() if p.is_file() and p.name != 'evidence-manifest.json'] + [REPORT] + sources)
manifest = {
    'date': '2026-10-30', 'baseline_commit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
    'scope': 'Windows Chrome 140 mobile viewport of current dist; no connected Android device; documentation-only audit',
    'screenshots': len(inventory['screens']), 'confirmed_ui_findings': 8, 'companion_exception': 'D-01',
    'apk': {'file': apk.relative_to(ROOT).as_posix(), 'bytes': apk.stat().st_size, 'sha256': sha(apk.read_bytes())},
    'apk_resource_comparison': apk_comparison,
    'files': [{'file': p.relative_to(ROOT).as_posix(), 'bytes': p.stat().st_size, 'sha256': sha(p.read_bytes())} for p in files],
    'manifest_note': 'This manifest excludes its own hash. Geometry candidate counters are not confirmed defect totals.',
}
(OUT / 'evidence-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'screenshots': len(ordered), 'files': len(files), 'apk_resources_identical': all(x['identical'] for x in apk_comparison)}, ensure_ascii=False))
