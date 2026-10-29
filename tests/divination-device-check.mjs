import {connect} from '../../../.codex-analysis/paper-forest-2026-10-19/cdp.mjs';
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const c=await connect(),pause=ms=>new Promise(r=>setTimeout(r,ms)),errors=[];
c.on(x=>{if(x.method==='Runtime.exceptionThrown')errors.push(x.params.exceptionDetails)});
try{
 const old=JSON.parse(await fs.readFile(new URL('../../../.codex-analysis/zaohua-smooth-2026-10-20/before-state.json',import.meta.url),'utf8'));
 for(let i=0;i<50;i++){if(await c.evaluate('!!window.__WZBZ_ROUTER__'))break;await pause(200)}
 await c.evaluate(`window.__WZBZ_ROUTER__.replace(${JSON.stringify(old.url.split('#')[1])}).catch(()=>{}).then(()=>true)`);await pause(2500);
 for(let i=0;i<50;i++){if(await c.evaluate(`!!document.querySelector('.fa-result-host')?.__vue__?.session && !document.querySelector('.fa-result-host').__vue__.owner.chartPending`))break;await pause(200)}
 for(const type of ['liuyao','meihua']){
  await c.evaluate(`(()=>{let v=document.querySelector('.fa-result-host').__vue__;v.$set(v.session.modules.${type},'time','2026-10-29 23:30');v.$set(v.session.modules.${type},'method','time');v._cache.clear();v.change('${type}');return true})()`);await pause(800);
  const data=await c.evaluate(`(()=>{let v=document.querySelector('.fa-result-host').__vue__,r=v.result('${type}'),pane=document.querySelector('.fa-slide-${type}');return {active:v.active,day:r.calendar.pillars[2],hour:r.calendar.pillars[3],void:r.calendar.hourVoid,rendered:pane.innerText.includes('戊子'),policy:pane.innerText.includes('午夜换日'),method:r.method}})()`);
  console.log(type,data);assert.equal(data.day,'丙子');assert.equal(data.hour,'戊子');assert.equal(data.rendered,true);assert.equal(data.policy,true);assert.equal(data.method,'time');
 }
 assert.deepEqual(errors,[]);console.log('emulator page checks passed');
}finally{c.close()}
