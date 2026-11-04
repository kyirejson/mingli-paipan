// Build the pinned MIT upstream pattern detectors, without server imports or AI.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {stripTypeScriptTypes} from 'node:module';
const root=new URL('../',import.meta.url),dir=new URL('vendor/ziwei-doushu/',root);
const pin=JSON.parse(fs.readFileSync(new URL('UPSTREAM.json',dir),'utf8'));
const raw=fs.readFileSync(new URL('patterns.ts',dir));
if(crypto.createHash('sha256').update(raw).digest('hex')!==pin.files['patterns.ts'].sha256)throw Error('Pinned upstream pattern source changed');
let source=raw.toString('utf8').replace(/^import 'server-only';\r?\n/m,'');
// Keep the vendored source byte-identical. Local corrections are explicit,
// function-scoped and fail closed when the pinned upstream shape changes.
const fixes=[];
function fix(fn,from,to){
 const start=source.indexOf('function '+fn+'('),end=source.indexOf('\nfunction ',start+1);
 if(start<0)throw Error('Missing detector '+fn);
 const block=source.slice(start,end<0?source.length:end);
 if(block.split(from).length!==2)throw Error('Ambiguous local correction '+fn);
 source=source.slice(0,start)+block.replace(from,to)+source.slice(end<0?source.length:end);fixes.push(fn);
}
for(const [fn,anchor] of [['detectZiFu','ziwei'],['detectLianXiang','lian'],['detectTongLiang','tong']])
 fix(fn,'sanFangAllStars(chart)','localSurroundingStars(chart, '+anchor+'.branch)');
fix('detectRiYueTongGong',"sanFangAllStars(chart).has('文昌') && sanFangAllStars(chart).has('文曲')","localSurroundingStars(chart, sun.branch).has('文昌') && localSurroundingStars(chart, sun.branch).has('文曲')");
fix('detectWuTan',"sanFangAllStars(chart).has('火星') || sanFangAllStars(chart).has('铃星')","localSurroundingStars(chart, tan.branch).has('火星') || localSurroundingStars(chart, tan.branch).has('铃星')");
fix('detectKeQuanShuangHui',"if (s.type === 'major' && s.siHua === '科')","if (s.siHua === '科')");
fix('detectKeQuanShuangHui',"if (s.type === 'major' && s.siHua === '权')","if (s.siHua === '权')");
source+='\nfunction localSurroundingStars(chart: ZiweiChart, branch: number) { return new Set(chart.palaces.filter(p => [0,4,6,8].includes((p.branch-branch+12)%12)).flatMap(p => p.stars.map(s => s.name))); }\n';
source=stripTypeScriptTypes(source,{mode:'strip'}).replace(/^export function /gm,'function ');
if(/^import\s/m.test(source)||/^export\s/m.test(source))throw Error('Unexpected runtime dependency in pattern source');
const result='/* MIT: Renhuai123/ziwei-doushu @ '+pin.commit+'; local corrections: scripts/build-ziwei-patterns.mjs; see static/licenses/ziwei-doushu.txt */\n(function(global){\n"use strict";\n'+source+'\nglobal.WZBZPatternRules=Object.freeze({detect:detectPatterns,commit:'+JSON.stringify(pin.commit)+',localCorrections:'+JSON.stringify([...new Set(fixes)])+'});\n})(window);\n';
fs.writeFileSync(new URL('dist/static/js/ziwei-patterns.js',root),result);
fs.mkdirSync(new URL('dist/static/licenses/',root),{recursive:true});
fs.copyFileSync(new URL('LICENSE',dir),new URL('dist/static/licenses/ziwei-doushu.txt',root));
console.log(JSON.stringify({commit:pin.commit,bytes:Buffer.byteLength(result)}));
