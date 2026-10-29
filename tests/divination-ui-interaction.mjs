import {connect} from '../../../.codex-analysis/paper-forest-2026-10-19/cdp.mjs';
import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const c=await connect(),pause=ms=>new Promise(r=>setTimeout(r,ms)),errors=[];
c.on(m=>{if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails)});
async function evaluate(text){return c.evaluate(text)}
try{
 const previous=JSON.parse(await fs.readFile(new URL('../../../.codex-analysis/zaohua-smooth-2026-10-20/before-state.json',import.meta.url),'utf8'));
 for(let i=0;i<50;i++){if(await evaluate('!!window.__WZBZ_ROUTER__'))break;await pause(200)}
 await evaluate(`window.__WZBZ_ROUTER__.replace(${JSON.stringify(previous.url.split('#')[1])}).catch(()=>{}).then(()=>true)`);await pause(2500);
 for(let i=0;i<60;i++){if(await evaluate(`!!document.querySelector('.fa-result-host')?.__vue__?.session`))break;await pause(200)}
 await evaluate(`(()=>{const host=document.querySelector('.fa-result-host').__vue__,native=window.localStorage,changes=new Map();window.__castQa={host,session:host.session,active:host.active,descriptor:Object.getOwnPropertyDescriptor(window,'localStorage'),native};const fake={getItem(k){return changes.has(k)?changes.get(k):native.getItem(k)},setItem(k,v){changes.set(k,String(v))},removeItem(k){changes.set(k,null)},key(i){return native.key(i)},get length(){return native.length}};Object.defineProperty(window,'localStorage',{value:fake,configurable:true});host.session=JSON.parse(JSON.stringify(host.session));host.session.guid='temporary-qa-cast';host._cache.clear();return true})()`);
 async function open(type){await evaluate(`(()=>{const v=window.__castQa.host;v.change('${type}');return true})()`);await pause(400);await evaluate(`document.querySelector('.fa-slide-${type} .fa-method-button').click();true`);await pause(200)}
 async function clickText(text){await evaluate(`(()=>{const b=[...document.querySelectorAll('.fa-modal button')].find(x=>x.textContent.trim()===${JSON.stringify(text)});if(!b)throw Error('button not found: '+${JSON.stringify(text)});b.click();return true})()`);await pause(120)}
 async function select(index,value){await evaluate(`(()=>{let e=document.querySelectorAll('.fa-modal select')[${index}];if(!e)throw Error('select missing');e.value=${JSON.stringify(String(value))};e.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);await pause(50)}
 async function fill(index,value){await evaluate(`(()=>{let e=document.querySelectorAll('.fa-modal input')[${index}];if(!e)throw Error('input missing');e.value=${JSON.stringify(String(value))};e.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);await pause(50)}
 async function save(){await clickText('应用并重新起卦');await pause(300);let error=await evaluate(`document.querySelector('.fa-modal .fa-error')?.innerText||''`);assert.equal(error,'');assert.equal(await evaluate(`!!document.querySelector('.fa-modal')`),false)}
 async function result(type){return evaluate(`(()=>{let r=window.__castQa.host.result('${type}');return {main:r.main.name,changed:r.changed.name,moving:r.moving,method:r.method,rows:r.rows?.map(x=>x.ganzhi),ti:r.ti?.name,mutual:r.mutual?.name}})()`)}
 await open('liuyao');await clickText('铜钱录入');for(const [i,n] of [6,7,8,9,7,8].entries())await select(i,n);await save();let r=await result('liuyao');assert.equal(r.main,'泽水困');assert.equal(r.changed,'水泽节');assert.deepEqual(r.moving,[1,4]);
 await open('liuyao');await clickText('指定卦爻');await select(0,7);await select(1,8);await save();r=await result('liuyao');assert.equal(r.main,'山地剥');assert.deepEqual(r.rows,['乙未','乙巳','乙卯','丙戌','丙子','丙寅']);
 await open('liuyao');await clickText('时间起卦');await fill(0,'2025-01-16T16:00');await save();r=await result('liuyao');assert.equal(r.main,'泽火革');assert.equal(r.changed,'泽山咸');assert.deepEqual(r.moving,[1]);
 await open('liuyao');await clickText('单数起卦');await fill(1,'5');await save();r=await result('liuyao');assert.equal(r.main,'风水涣');assert.deepEqual(r.moving,[2]);
 await open('liuyao');await clickText('报数起卦');await clickText('双数');await fill(1,'5');await fill(2,'3');await save();r=await result('liuyao');assert.equal(r.main,'风火家人');assert.deepEqual(r.moving,[2]);
 await open('meihua');await clickText('时间');await fill(0,'2025-01-16T16:00');await save();r=await result('meihua');assert.equal(r.main,'泽火革');assert.equal(r.changed,'泽山咸');assert.equal(r.mutual,'天风姤');assert.equal(r.moving,1);
 await open('meihua');await clickText('报数');await clickText('三数');await fill(1,'8');await fill(2,'16');await fill(3,'12');await save();r=await result('meihua');assert.equal(r.main,'坤为地');assert.equal(r.moving,6);
 await open('meihua');await clickText('汉字');assert.ok(await evaluate(`document.querySelector('.fa-modal').innerText.includes('简体笔画')`));await fill(1,'山水');await save();r=await result('meihua');assert.equal(r.main,'火雷噬嗑');assert.equal(r.moving,1);
 await open('meihua');await clickText('号码');assert.ok(await evaluate(`document.querySelector('.fa-modal').innerText.includes('前五位和后六位')`));await fill(1,'12345678901');await save();r=await result('meihua');assert.equal(r.main,'艮为山');assert.equal(r.changed,'火山旅');assert.equal(r.moving,4);
 await open('meihua');await clickText('终身');await save();r=await result('meihua');assert.equal(r.main,'水山蹇');assert.equal(r.moving,3);
 await open('meihua');await clickText('单数');await fill(1,'5');await save();r=await result('meihua');assert.equal(r.main,'风水涣');assert.equal(r.moving,2);
 await open('meihua');await clickText('随机');await save();r=await result('meihua');assert.equal(r.method,'random');const remembered=await evaluate(`JSON.stringify(window.__castQa.host.session.modules.meihua.randomNumbers)`);await open('meihua');await save();assert.equal(await evaluate(`JSON.stringify(window.__castQa.host.session.modules.meihua.randomNumbers)`),remembered);
 await open('meihua');await clickText('指定');await select(0,1);await select(1,5);await clickText('5爻');await save();r=await result('meihua');assert.equal(r.main,'天风姤');assert.equal(r.changed,'火风鼎');assert.equal(r.moving,5);
 await open('liuyao');await clickText('时间起卦');await fill(0,'2025-01-29T12:00');await save();
 let references=await evaluate(`document.querySelector('.fa-slide-liuyao .fa-liuyao-references').innerText`);
 assert.match(references,/红鸾\s*戌\s*（农历年支）/);assert.match(references,/天喜（年）\s*辰\s*（农历年支）/);
 assert.deepEqual(errors,[]);console.log('UI interactions passed: five Liuyao methods and eight Meihua methods, including random stability');
}finally{
 try{await evaluate(`(()=>{let q=window.__castQa;if(!q)return true;let v=q.host;if(window.FiveArtsUI.getState().popup)window.FiveArtsUI.getState().popup='';v.session=q.session;v._cache.clear();v.change(q.active);if(q.descriptor)Object.defineProperty(window,'localStorage',q.descriptor);else delete window.localStorage;delete window.__castQa;return true})()`)}catch(_){}
 c.close();
}
