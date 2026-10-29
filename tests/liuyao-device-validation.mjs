import {connect} from '../../../.codex-analysis/paper-forest-2026-10-19/cdp.mjs';
import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const c=await connect(),pause=ms=>new Promise(r=>setTimeout(r,ms)),errors=[];
c.on(x=>{if(x.method==='Runtime.exceptionThrown')errors.push(x.params.exceptionDetails)});
try{
 const previous=JSON.parse(await fs.readFile(new URL('../../../.codex-analysis/zaohua-smooth-2026-10-20/before-state.json',import.meta.url),'utf8'));
 for(let i=0;i<50;i++){if(await c.evaluate('!!window.__WZBZ_ROUTER__'))break;await pause(200)}
 await c.evaluate(`window.__WZBZ_ROUTER__.replace(${JSON.stringify(previous.url.split('#')[1])}).catch(()=>{}).then(()=>true)`);await pause(2500);
 for(let i=0;i<60;i++){if(await c.evaluate(`!!document.querySelector('.fa-result-host')?.__vue__?.session && !document.querySelector('.fa-result-host').__vue__.owner.chartPending`))break;await pause(200)}
 for(const data of [{name:'艮为山',upper:7,lower:7,want:['丙辰','丙午','丙申','丙戌','丙子','丙寅']},{name:'山地剥',upper:7,lower:8,want:['乙未','乙巳','乙卯','丙戌','丙子','丙寅']}]){
  await c.evaluate(`(()=>{const v=document.querySelector('.fa-result-host').__vue__,o=v.session.modules.liuyao;Object.assign(o,{method:'specified',upper:${data.upper},lower:${data.lower},moving:[]});v._cache.clear();v.change('liuyao');return true})()`);await pause(700);
  const r=await c.evaluate(`(()=>{const v=document.querySelector('.fa-result-host').__vue__,r=v.result('liuyao'),pane=document.querySelector('.fa-slide-liuyao');return {name:r.main.name,rows:r.rows.map(x=>x.ganzhi),dom:[...pane.querySelectorAll('.fa-liuyao-pair')].map(x=>x.querySelector('.fa-liuyao-half .fa-yao-left strong').innerText).reverse(),note:pane.innerText.includes('六亲按本卦')}})()`);
  assert.equal(r.name,data.name);assert.deepEqual(r.rows,data.want);assert.equal(r.note,true);r.dom.forEach((text,i)=>assert.ok(text.includes(data.want[i]),`${data.name} row ${i+1}: ${text}`));console.log(data.name,r.rows.join(' '),'DOM ok');
 }
 assert.deepEqual(errors,[]);console.log('emulator hexagram display verified');
}finally{c.close()}
