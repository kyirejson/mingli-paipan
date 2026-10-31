import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {connectBrowser} from '../../tests/helpers/browser-cdp.mjs';
const out=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(out,'../..');
const manifest=JSON.parse(await fs.readFile(path.join(out,'evidence-manifest.json'),'utf8'));
for(const f of manifest.files){const bytes=await fs.readFile(path.join(root,f.file));if(createHash('sha256').update(bytes).digest('hex')!==f.sha256)throw Error('Hash mismatch: '+f.file);}
const files=await fs.readdir(out);
for(const f of files.filter(f=>f.endsWith('.mjs'))){const r=spawnSync(process.execPath,['--check',path.join(out,f)],{encoding:'utf8'});if(r.status!==0)throw Error(f+': '+r.stderr);}
const report=path.join(root,'docs/2026-10-30_UI显示深度审核报告.md'),text=await fs.readFile(report,'utf8');
let links=0;for(const [,target] of text.matchAll(/\]\(([^)]+)\)/g)){if(/^https?:/.test(target))continue;const clean=target.replace(/:\d+$/,'');await fs.access(path.isAbsolute(clean)?clean:path.resolve(path.dirname(report),clean));links++;}
const b=await connectBrowser();
try{
 await b.call('Page.enable');await b.call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await b.call('Page.navigate',{url:pathToFileURL(path.join(out,'index.html')).href});
 await b.wait(`document.querySelectorAll('article').length===${manifest.screenshots}`);
 const initial=await b.evaluate(`[...document.querySelectorAll('article')].filter(e=>!e.hidden).length`);if(initial!==8)throw Error('Expected 8 issue cards');
 await b.evaluate(`(()=>{document.querySelector('#issues').checked=false;document.querySelector('#issues').dispatchEvent(new Event('change'));document.querySelectorAll('img').forEach(e=>e.loading='eager');return true})()`);
 await b.wait(`[...document.images].every(i=>i.complete&&i.naturalWidth>0)`,20000);
 const total=await b.evaluate(`[...document.querySelectorAll('article')].filter(e=>!e.hidden).length`);if(total!==88)throw Error('Expected 88 screenshots');
 await b.evaluate(`(()=>{const e=document.querySelector('#search');e.value='UI-03';e.dispatchEvent(new Event('input'));return true})()`);
 const filtered=await b.evaluate(`[...document.querySelectorAll('article')].filter(e=>!e.hidden).length`);if(filtered!==1)throw Error('Search failed');
 await b.evaluate(`(()=>{document.querySelector('#search').value='';document.querySelector('#issues').checked=true;document.querySelector('#issues').dispatchEvent(new Event('change'));return true})()`);
 const image=await b.call('Page.captureScreenshot',{format:'png'});await fs.writeFile('D:/zaohua-release-work/ui-audit-gallery-verified.png',Buffer.from(image.data,'base64'));
 console.log(JSON.stringify({hashes:manifest.files.length,links,syntax:files.filter(f=>f.endsWith('.mjs')).length,gallery:{initial,total,filtered,imagesLoaded:total}},null,2));
}finally{await b.call('Browser.close').catch(()=>{});b.close();}
