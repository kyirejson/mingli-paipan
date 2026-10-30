import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {connectBrowser} from './helpers/browser-cdp.mjs';
const b=await connectBrowser(),{call,evaluate:ev,wait}=b,origin='http://localhost:9988',out='docs/calendar-input-2026-10-30',errors=[],requests=[];
b.on(m=>{if(m.method==='Network.requestWillBeSent')requests.push(m.params.request.url.split('?')[0]);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params.args.map(a=>a.description||a.value).join(' '));});
async function screenshot(name){
 if(await ev(`!!document.querySelector('.pf-calendar-footer')`))await wait(`document.querySelector('.pf-calendar-footer').getBoundingClientRect().bottom<=innerHeight+1`);
 let p=await call('Page.captureScreenshot',{format:'png'});await fs.writeFile(out+'/'+name,Buffer.from(p.data,'base64'));
}
const find=`function find(v,name){if((v.$options.name||v.$options._componentTag)===name)return v;for(const c of v.$children||[]){const r=find(c,name);if(r)return r;}}`;
async function bind(){return ev(`(()=>{${find}const form=find(document.getElementById('app').__vue__,'FormBox');window.__calendarTest={form,picker:form.$refs.formDatetimeRef};return true})()`);}
async function clickOption(text){await wait(`[...document.querySelectorAll('.pf-sizhu-options button')].some(b=>b.textContent==='${text}')`);await ev(`(()=>{[...document.querySelectorAll('.pf-sizhu-options button')].find(b=>b.textContent==='${text}').click();return true})()`);}
async function tab(text){await ev(`(()=>{[...document.querySelectorAll('.pf-calendar-tabs button')].find(b=>b.textContent==='${text}').click();return true})()`);await ev(`window.__calendarTest.picker.$nextTick().then(()=>true)`);}
try{
 await fs.mkdir(out,{recursive:true});await call('Page.enable');await call('Runtime.enable');await call('Network.enable');await call('Network.setCacheDisabled',{cacheDisabled:true});await call('Emulation.setCPUThrottlingRate',{rate:1});await call('Emulation.setDeviceMetricsOverride',{width:430,height:932,deviceScaleFactor:1,mobile:true});
 await call('Storage.clearDataForOrigin',{origin,storageTypes:'all'});await call('Runtime.discardConsoleEntries');errors.length=0;requests.length=0;await call('Page.navigate',{url:origin});await wait(`[...document.querySelectorAll('button')].some(b=>b.textContent==='四柱')`);
 await ev(`(()=>{[...document.querySelectorAll('button')].find(b=>b.textContent==='四柱').click();return true})()`);await wait(`!!document.querySelector('.pf-calendar-sheet')`);await bind();
 for(const value of ['丙','午','戊戌','丙','子','甲午'])await clickOption(value);
 await wait(`!window.__calendarTest.picker.$refs.sizhuBox.isDatetimeLoading&&document.querySelectorAll('.pf-sizhu-match').length>0`);
 const matches=await ev(`window.__calendarTest.picker.$refs.sizhuBox.datetimeList.map(x=>x.solar)`);assert.ok(matches.includes('2026-10-29 12:00:00'));assert.ok(matches.some(x=>x.startsWith('2086-')));
 await ev(`(()=>{document.querySelector('.pf-calendar-confirm').click();return true})()`);await wait(`document.querySelector('.pf-calendar-content .pf-calendar-error')?.innerText.includes('四柱已填完整')`);
 assert.match(await ev(`document.querySelector('.pf-calendar-content .pf-calendar-error').innerText`),/四柱已填完整/);
 await ev(`(()=>{[...document.querySelectorAll('.pf-sizhu-match')].find(b=>b.textContent.includes('2026-10-29')).click();return true})()`);await screenshot('four-pillars-matches.png');
 await ev(`(()=>{document.querySelector('.pf-calendar-confirm').click();return true})()`);await wait(`!window.__calendarTest.form.datetimeData.show&&!window.__calendarTest.form.isConfirmingDatetime`);
 const four=await ev(`({birthday:window.__calendarTest.form.infoData.birthday,manual:window.__calendarTest.form.datetimeData.isManual,text:document.querySelector('.pf-birth-summary').innerText})`);assert.equal(four.manual,true);assert.ok(four.birthday.startsWith('2026-10-29 12:00'));assert.match(four.text,/对应公历/);await screenshot('home-four-pillars.png');
 await ev(`(()=>{[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='开始排盘').click();return true})()`);await wait(`!!document.querySelector('.fa-result-host')?.__vue__?.session&&!document.querySelector('.fa-result-host').__vue__.owner.chartPending`);
 assert.ok((await ev(`document.querySelector('.fa-result-host').__vue__.session.baseTime`)).startsWith('2026-10-29 12:00'));
 assert.equal(requests.some(u=>u.includes('/szbz.php')),false);
 await ev(`window.__WZBZ_ROUTER__.replace('/main/wznavigation/wzindex').catch(()=>{}).then(()=>true)`);await wait(`!!document.querySelector('.pf-birth-summary')`);
 await ev(`(()=>{[...document.querySelectorAll('.pf-calendar-row button')].find(b=>b.textContent==='公历').click();return true})()`);await wait(`!!document.querySelector('.pf-calendar-quick input')`);await bind();
 await ev(`(()=>{let e=document.querySelector('.pf-calendar-quick input');e.value='2024-01-31T14:37';e.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);
 await wait(`window.__calendarTest.picker.getConfirmSolar()?.value==='2024-01-31 14:37'`);
 await ev(`(async()=>{const p=window.__calendarTest.picker,k=p.$refs.solarBox.$refs.pickerRef;k.setColumnIndex(1,1);await p.onChangeSolar(k,k.getValues(),1);return true})()`);
 assert.equal(await ev(`window.__calendarTest.picker.getConfirmSolar().value`),'2024-02-29 14:37');await screenshot('solar-time-picker.png');
 for(const [width,height] of [[320,640],[360,740],[430,932]]){
  await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
  const rect=await ev(`(()=>{const e=document.querySelector('.pf-calendar-sheet'),r=e.getBoundingClientRect(),f=document.querySelector('.pf-calendar-footer').getBoundingClientRect();return {left:r.left,right:r.right,width:innerWidth,bottom:f.bottom,height:innerHeight}})()`);assert.ok(rect.left>=-1&&rect.right<=rect.width+1&&rect.bottom<=rect.height+1,JSON.stringify(rect));
 }
 await ev(`(()=>{document.querySelector('.pf-calendar-cancel').click();return true})()`);await wait(`!window.__calendarTest.form.datetimeData.show`);
 assert.equal(await ev(`window.__calendarTest.form.datetimeData.index`),2);assert.ok((await ev(`window.__calendarTest.form.infoData.birthday`)).startsWith('2026-10-29'));
 await ev(`(()=>{[...document.querySelectorAll('.pf-calendar-row button')].find(b=>b.textContent==='公历').click();return true})()`);await wait(`!!document.querySelector('.pf-calendar-quick input')`);await bind();
 await ev(`(()=>{let e=document.querySelector('.pf-calendar-quick input');e.value='2023-03-22T10:20';e.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);await wait(`window.__calendarTest.picker.getConfirmSolar()?.value==='2023-03-22 10:20'`);await tab('农历');
 await wait(`window.__calendarTest.picker.getConfirmLunar()?.value.includes('2023年闰二月初一')`);await screenshot('lunar-leap-picker.png');
 await ev(`(async()=>{const p=window.__calendarTest.picker,k=p.$refs.lunarBox.$refs.pickerRef;k.setColumnIndex(0,2024-p.YearStartForPicker);await p.onChangeLunar(k,k.getValues(),0);return true})()`);
 assert.equal(await ev(`window.__calendarTest.picker.$refs.lunarBox.$refs.pickerRef.getValues()[1]`),'二月');
 await tab('公历');await ev(`(()=>{let e=document.querySelector('.pf-calendar-quick input');e.value='2024-02-29T23:45';e.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);await wait(`window.__calendarTest.picker.getConfirmSolar()?.value==='2024-02-29 23:45'`);
 await ev(`(()=>{document.querySelector('.pf-calendar-confirm').click();return true})()`);await wait(`!window.__calendarTest.form.datetimeData.show&&!window.__calendarTest.form.isConfirmingDatetime`);
 const confirmed=await ev(`window.__calendarTest.form.infoData.birthday`);assert.equal(confirmed,'2024-02-29 23:45');assert.equal(await ev(`window.__calendarTest.form.refreshCurrentTime(true)`),false);assert.equal(await ev(`window.__calendarTest.form.infoData.birthday`),confirmed);
 const bridge=await ev(`(async()=>{let forwarded=false;const r=await window.__WZBZ_AXIOS_INTERCEPT__({url:'https://bzapi3.iwzbz.com/szbz.php',params:{bz:'丙午戊戌丙子甲午'}},()=>{forwarded=true;throw Error('must stay local')});return {forwarded,dates:r.data}})()`);assert.equal(bridge.forwarded,false);assert.ok(bridge.dates.includes('2026-10-29 12:00:00'));
 const recordId=await ev(`JSON.parse(localStorage.getItem('wzbz_local_userlist_v14')).find(x=>x.timetype===2&&x.birthDay.startsWith('2026-10-29')).guid`);
 await ev(`window.__WZBZ_ROUTER__.push({path:'/main/paipan/edit',query:{id:${JSON.stringify(recordId)}}}).catch(()=>{}).then(()=>true)`);
 await wait(`!![...document.querySelectorAll('.pf-form')].find(e=>e.isConnected&&e.getBoundingClientRect().height>0)`);
 await ev(`(()=>{${find}function active(v){if((v.$options.name||v.$options._componentTag)==='FormBox'&&v.$el?.isConnected&&!v._inactive)return v;for(const c of v.$children||[]){const r=active(c);if(r)return r;}}const form=active(document.getElementById('app').__vue__);window.__calendarEdit=form;form.onShowDatetime(2);return true})()`);
 await wait(`window.__calendarEdit?.$refs.formDatetimeRef?.$refs.sizhuBox?.datetimeList.length>0&&!window.__calendarEdit.$refs.formDatetimeRef.$refs.sizhuBox.isDatetimeLoading`);
 assert.ok((await ev(`window.__calendarEdit.$refs.formDatetimeRef.getConfirmSizhu().dateStr`)).startsWith('2026-10-29'));
 await ev(`(()=>{document.querySelector('.pf-calendar-confirm').click();return true})()`);await wait(`!window.__calendarEdit.datetimeData.show&&!window.__calendarEdit.isConfirmingDatetime`);
 await ev(`(()=>{window.__calendarEdit.$el.querySelector('.form_confirm').click();return true})()`);await wait(`!location.hash.includes('/paipan/edit')`);
 const saved=await ev(`JSON.parse(localStorage.getItem('wzbz_local_userlist_v14')).find(x=>x.guid===${JSON.stringify(recordId)})`);assert.equal(saved.timetype,2);assert.ok(saved.birthDay.startsWith('2026-10-29'));
 assert.deepEqual(errors,[]);const result={passed:true,four,matchedDates:matches,confirmedSolar:confirmed,recordEdit:{calendarType:saved.timetype,birthday:saved.birthDay},checks:['four-pillar input through actual buttons','clear missing-date message','correct date persisted and used to chart','reverse lookup stays local','solar month-end clamp','320/360/430 layout','cancel restores confirmed calendar','2023 leap second month','year change retains lunar month name','manual date immune to automatic clock refresh','saved four-pillar record reopens and edits correctly'],errors};await fs.writeFile(out+'/browser-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}catch(error){console.error(JSON.stringify({message:error.message,errors,page:await ev(`({url:location.href,text:document.body.innerText.slice(-1600)})`)},null,2));throw error;}finally{b.close();}
