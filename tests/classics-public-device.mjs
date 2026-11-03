// Explicitly forwarded app emulator only. Fetches public pages, records counts, never saves book text or alters cases.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {connectBrowser} from './helpers/browser-cdp.mjs';
const b=await connectBrowser(process.env.ZAOHUA_CDP_PORT||'9331'),jobs=[];
const gan='甲乙丙丁戊己庚辛壬癸',zhi='子丑寅卯辰巳午未申酉戌亥',months='寅卯辰巳午未申酉戌亥子丑';
function caseFor(stem,hour,month='丑',day){return ['庚','辰','己',month,gan[stem],day||zhi[stem%12],gan[(stem%5*2+hour)%10],zhi[hour]];}
for(let stem=0;stem<10;stem++)for(let hour=0;hour<12;hour++)jobs.push({id:3,tab:0,cases:Array.from({length:6},(_,n)=>caseFor(stem,hour,'丑',zhi[(stem+n*10)%12]))});
for(const month of months)for(let stem=0;stem<10;stem++)jobs.push({id:4,tab:0,cases:Array.from({length:12},(_,h)=>caseFor(stem,h,month))});
for(let stem=0;stem<10;stem++)jobs.push({id:3,tab:1,cases:[caseFor(stem,0)]});
jobs.push({id:3,tab:2,cases:Array.from(months).flatMap(month=>Array.from({length:10},(_,s)=>caseFor(s,0,month)))});
for(const stem of [0,2,4,6,8])jobs.push({id:3,tab:3,cases:[caseFor(stem,0)]});
const result={source:'public article pages fetched by installed app HTTP client; synthetic pillar combinations',jobs:jobs.length,passed:0,generalDaySections:0,failures:[]};
try{
 await b.wait(`document.getElementById('classics-diagnostic')?.contentWindow?.BaziPublicClassics`);
 for(let start=0;start<jobs.length;start+=4){
  const rows=await b.evaluate(`(async()=>{const api=document.getElementById('classics-diagnostic').contentWindow.BaziPublicClassics;return Promise.all(${JSON.stringify(jobs.slice(start,start+4))}.map(async job=>{let passed=0,generalDaySections=0,failures=[];for(const bz of job.cases){try{const view={books:[[{id:job.id,name:job.id===3?'三命通会':'八字提要'}]],swiperDex:0,swiperDex2:0,tabs:[{index:job.tab,value:'source-validation'}],tabsDex:0,gjData:{bzArr:bz}},source=api.resolve(view),text=await api.fetchText(source),entry=api.extract(text,source);if(!entry.blocks.length)throw Error('empty');if(entry.level==='stem-hour')generalDaySections++;passed++;}catch(e){failures.push({book:job.id,tab:job.tab,bazi:bz.join(''),error:e.message});}}return {passed,generalDaySections,failures}}))})()`);
  for(const row of rows){result.passed+=row.passed;result.generalDaySections+=row.generalDaySections;result.failures.push(...row.failures);}
  if(start%40===0)console.log(JSON.stringify({jobsChecked:Math.min(start+4,jobs.length),passed:result.passed,failures:result.failures.length}));
 }
 fs.mkdirSync('docs/home-simplification-2026-11-03',{recursive:true});
 fs.writeFileSync('docs/home-simplification-2026-11-03/public-source-validation.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result,null,2));assert.equal(result.failures.length,0,'Public source mismatch; see validation report');
}finally{b.close();}
