// Inspect source in-memory or the actual installed bundle; never clear app data.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {connectBrowser} from './helpers/browser-cdp.mjs';
const installed=process.argv.includes('--installed'),leaveOpen=process.argv.includes('--leave-open');
const b=await connectBrowser('9331'),out=path.resolve('docs/ziwei-remediation-2026-11-04/'+(installed?'installed':'preview')),errors=[];
await fs.mkdir(out,{recursive:true});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const keys=['wzbz_local_userlist_v14','wzbz_local_notes_v14','wzbz_note_drafts_v1'];
const read=()=>b.evaluate(`Object.fromEntries(${JSON.stringify(keys)}.map(k=>[k,localStorage.getItem(k)]))`);
const finder=`function find(v,name){if((v.$options.name||v.$options._componentTag)===name&&v.$el?.isConnected&&!v._inactive)return v;for(const c of v.$children||[]){const r=find(c,name);if(r)return r;}}`;
let originalSetting;
b.on(m=>{if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);});
async function capture(name){await pause(120);const s=await b.call('Page.captureScreenshot',{format:'jpeg',quality:88});await fs.writeFile(path.join(out,name+'.jpg'),Buffer.from(s.data,'base64'));}
try{
 assert.equal(await b.evaluate('location.origin'),'https://localhost');await b.call('Runtime.enable');await b.call('Page.enable');
 if(installed){await b.call('Network.enable');await b.call('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});await b.call('Page.reload',{ignoreCache:true});}
 await b.wait(`!!document.getElementById('app')?.__vue__`);const before=await read();
 originalSetting=await b.evaluate(`({dark:!!document.getElementById('app').__vue__.$store.state.setting.isDark})`);
 if(!installed){
  const json=await fs.readFile('dist/static/data/ziwei-reading.json','utf8'),css=await fs.readFile('dist/static/css/ziwei-reading.css','utf8');
  await b.evaluate(`(()=>{window.__readingOriginalFetch=window.fetch.bind(window);window.fetch=function(input,options){const u=typeof input==='string'?input:input.url;if(u==='https://localhost/static/data/ziwei-reading.json')return Promise.resolve(new Response(${JSON.stringify(json)},{status:200,headers:{'Content-Type':'application/json'}}));return window.__readingOriginalFetch(input,options);};const style=document.createElement('style');style.textContent=${JSON.stringify(css)};document.head.appendChild(style);return true})()`);
  for(const n of ['ziwei-patterns','ziwei-interpretation','ziwei-reading','fivearts-ui'])await b.evaluate((await fs.readFile('dist/static/js/'+n+'.js','utf8'))+'\ntrue');
 }
 await b.evaluate(`(()=>{const r=window.__WZBZ_ROUTER__||document.getElementById('app').__vue__.$router;window.__routeTask=r.replace('/main/wznavigation/wzuserlist').catch(()=>{});return true})()`);
 await b.wait(`(()=>{${finder}return !!find(document.getElementById('app').__vue__,'WZUserList')})()`);
 await b.evaluate(`(()=>{${finder}const v=find(document.getElementById('app').__vue__,'WZUserList'),row=JSON.parse(localStorage.getItem('wzbz_local_userlist_v14')||'[]').find(x=>x.name==='upgrade-retention-fixture');if(!row)throw Error('Missing existing synthetic case');v.isDetail=true;v.onDetail(row);return true})()`);
 await b.wait(`!!document.querySelector('.fa-result-host')?.__vue__?.session&&!document.querySelector('.fa-result-host').__vue__.owner.chartPending`);
 const originalMode=await b.evaluate(`document.querySelector('.fa-result-host').__vue__.session.ziweiMode`);
 await b.evaluate(`(()=>{document.querySelector('.fa-result-host').__vue__.owner.$forceUpdate();document.querySelector('.fa-result-host').__vue__.change('ziwei');return true})()`);
 await b.wait(`!!document.querySelector('.ziwei-reading')?.__vue__`);
 await b.evaluate(`document.querySelector('.ziwei-reading').scrollIntoView({block:'start'})`);
 await b.wait(`document.querySelector('.ziwei-reading')?.__vue__?.status==='ready'`);
 assert.equal(await b.evaluate(`document.querySelector('.ziwei-reading').__vue__.bank.schemaVersion`),4);
 const expectedBank=JSON.parse(await fs.readFile('dist/static/data/ziwei-reading.json','utf8'));
 const bankState=await b.evaluate(`(()=>{const d=document.querySelector('.ziwei-reading').__vue__.bank;return {version:d.contentVersion,provenance:Object.keys(d.provenance).length}})()`);assert.equal(bankState.version,expectedBank.contentVersion);assert.equal(bankState.provenance,Object.keys(expectedBank.provenance).length);
 const layouts=[];
 for(const width of [320,430]){
  await b.call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:true});
  for(const dark of [false,true]){
   await b.evaluate(`(()=>{const s=document.getElementById('app').__vue__.$store.state.setting;s.isDark=${dark};document.body.setAttribute('data-theme','${dark?'dark':'light'}');document.documentElement.setAttribute('data-theme','${dark?'dark':'light'}');const k=document.querySelector('.ziwei-reading').__vue__;k.tab='palace';k.allPalaces=false;document.querySelector('.ziwei-reading').scrollIntoView({block:'start'});return true})()`);await pause(120);
   const info=await b.evaluate(`(()=>{const el=document.querySelector('.ziwei-reading'),k=el.__vue__,p=el.querySelector('.zr-card>p:not(.zr-tag):not(.zr-evidence)');return {width:innerWidth,dark:${dark},palaces:k.readings.length,palaceButtons:el.querySelectorAll('.zr-palaces button').length,tabs:Array.from(el.querySelectorAll('.zr-tabs button'),x=>x.innerText),allTabsVisible:Array.from(el.querySelectorAll('.zr-tabs button')).every(x=>{const r=x.getBoundingClientRect(),n=x.parentElement.getBoundingClientRect();return r.left>=n.left-1&&r.right<=n.right+1}),overflow:el.scrollWidth>el.clientWidth+1,font:getComputedStyle(p).fontSize,firstTitle:el.querySelector('.zr-card h5').innerText,oldModernCards:el.querySelectorAll('.zr-modern').length}})()`);
   assert.equal(info.palaces,12);assert.equal(info.palaceButtons,12);assert.equal(info.tabs.length,5);assert.equal(info.allTabsVisible,true);assert.equal(info.overflow,false);assert.equal(info.font,'16px');assert.equal(info.oldModernCards,0);layouts.push(info);await capture('palace-'+width+'-'+(dark?'dark':'light'));
  }
 }
 await b.evaluate(`(()=>{document.getElementById('app').__vue__.$store.state.setting.isDark=false;document.body.setAttribute('data-theme','light');document.documentElement.setAttribute('data-theme','light');const k=document.querySelector('.ziwei-reading').__vue__;k.choose(k.readings.find(r=>r.name==='财帛').index);return true})()`);await pause(100);
 const sync=await b.evaluate(`(()=>{const k=document.querySelector('.ziwei-reading').__vue__,host=document.querySelector('.fa-result-host').__vue__;return {reader:k.view.current.name,boardIndex:host.ziweiPalace,readerIndex:k.view.current.index,core:k.view.current.cards[0].text}})()`);assert.equal(sync.reader,'财帛');assert.equal(sync.boardIndex,sync.readerIndex);
 await b.evaluate(`document.querySelector('.ziwei-reading').scrollIntoView({block:'start'})`);await capture('wealth-palace-430-light');
 const tabResults=[];
 for(const tab of ['relations','patterns','hua']){
  await b.evaluate(`(()=>{document.querySelector('.ziwei-reading').__vue__.tab='${tab}';return true})()`);await pause(100);
  const info=await b.evaluate(`(()=>{const el=document.querySelector('.ziwei-reading');return {tab:'${tab}',headings:Array.from(el.querySelectorAll('h5'),x=>x.innerText),related:el.querySelectorAll('[data-related-index]').length,conditionAlignments:Array.from(el.querySelectorAll('.zr-pattern-factors li'),x=>getComputedStyle(x).textAlign),overflow:el.scrollWidth>el.clientWidth+1}})()`);assert.equal(info.overflow,false);if(tab==='relations')assert.equal(info.related,4);else assert.ok(info.headings.length);if(tab==='patterns'){assert.ok(info.conditionAlignments.length);assert.ok(info.conditionAlignments.every(x=>x==='left'));}tabResults.push(info);await capture(tab+'-430-light');
 }
 await b.evaluate(`(()=>{const h=document.querySelector('.fa-result-host').__vue__;h.session.ziweiMode='qintian';return true})()`);
 await b.wait(`document.querySelector('.ziwei-reading').__vue__.mode==='qintian'`);
 const flying=await b.evaluate(`(()=>{const k=document.querySelector('.ziwei-reading').__vue__;k.tab='hua';return {count:k.view.flights.length,techniques:[...new Set(k.view.flights.map(x=>x.technique))]}})()`);assert.ok(flying.count>=4);await capture('qintian-flying-430-light');
 const previousScope=await b.evaluate(`document.querySelector('.fa-result-host').__vue__.flowScope`);
 await b.evaluate(`(()=>{document.querySelector('.fa-result-host').__vue__.flowScope='yearly';document.querySelector('.ziwei-reading').__vue__.tab='life';return true})()`);
 await b.wait(`document.querySelector('.ziwei-reading').__vue__.flowScope==='yearly'`);
 const flows=await b.evaluate(`(()=>{const k=document.querySelector('.ziwei-reading').__vue__;return {cards:k.view.life.map(x=>x.title),flow:k.view.life.filter(x=>x.technique==='运限四化').length}})()`);assert.equal(flows.flow,4);await capture('flow-430-light');
 assert.match(await b.evaluate(`document.querySelector('.zr-layer-note').innerText`),/当前选中流年.*仍读本命/);
 const timing=await b.evaluate(`(()=>{const k=document.querySelector('.ziwei-reading').__vue__,times=[];for(let i=0;i<10;i++){const t=performance.now();WZBZInterpretation.analyse(k.bank,k.chart,{selected:k.selected,mode:k.mode});times.push(performance.now()-t);}return {medianMs:times.slice().sort((a,b)=>a-b)[5],maxMs:Math.max(...times)}})()`);
 await b.evaluate(`(()=>{const h=document.querySelector('.fa-result-host').__vue__;h.flowScope=${JSON.stringify(previousScope)};h.session.ziweiMode=${JSON.stringify(originalMode)};const k=document.querySelector('.ziwei-reading').__vue__;k.tab='palace';k.allPalaces=true;return true})()`);await pause(120);assert.equal(await b.evaluate(`document.querySelectorAll('.ziwei-reading .zr-palace').length`),12);
 const misc=await b.evaluate(`(()=>{const k=document.querySelector('.ziwei-reading').__vue__;return {expected:k.view.rows.filter(r=>r.misc.length).length,rendered:document.querySelectorAll('[data-misc-palace]').length}})()`);assert.equal(misc.rendered,misc.expected);assert.ok(misc.rendered>1);
 await b.evaluate(`(()=>{const k=document.querySelector('.ziwei-reading').__vue__;k.allPalaces=false;document.querySelector('.ziwei-reading').scrollIntoView({block:'start'});return true})()`);
 assert.deepEqual(await read(),before);assert.equal(errors.length,0);
 const evidence={installedApk:installed,offline:installed,bankState,layouts,sync,tabResults,flying,flows,misc,timing,protectedDataUnchanged:true,protectedHash:crypto.createHash('sha256').update(JSON.stringify(before)).digest('hex'),errors,passed:true};
 await fs.writeFile(path.join(out,'device-results.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
}catch(error){console.error(JSON.stringify({errors,state:await b.evaluate(`({url:location.href,reader:!!document.querySelector('.ziwei-reading'),status:document.querySelector('.ziwei-reading')?.__vue__?.status})`)}));throw error;}
finally{
 try{await b.call('Emulation.clearDeviceMetricsOverride');if(installed)await b.call('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});if(originalSetting)await b.evaluate(`(()=>{document.getElementById('app').__vue__.$store.state.setting.isDark=${originalSetting.dark};document.body.setAttribute('data-theme','${originalSetting.dark?'dark':'light'}');document.documentElement.setAttribute('data-theme','${originalSetting.dark?'dark':'light'}');return true})()`);if(!leaveOpen)await b.call('Page.reload',{ignoreCache:true});}
 finally{b.close();}
}
