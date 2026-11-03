// App-owned emulator WebView only; uses synthetic fixture and never clears storage.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {connectBrowser} from './helpers/browser-cdp.mjs';
const directory='docs/data-preservation-2026-11-03',b=await connectBrowser(process.env.ZAOHUA_CDP_PORT||'9331');
const results={source:'installed final v1.0.15 APK, emulator WebView',ziwei:[],viewports:[]};
async function capture(name){const value=await b.call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(directory+'/'+name+'.png',Buffer.from(value.data,'base64'));}
async function route(path){await b.evaluate(`(()=>{__WZBZ_ROUTER__.push(${JSON.stringify(path)}).catch(function(){});return true})()`);}
try{
 assert.equal(await b.evaluate('location.origin'),'https://localhost');
 await b.wait('window.WZBZDataProtection&&WZBZDataProtection.status.ready');
 assert.equal(await b.evaluate('(async()=> (await Capacitor.Plugins.GitHubUpdater.getStatus()).currentVersion)()'),'1.0.15');
 await route('/main/wznavigation/wzuserlist');await b.wait(`document.body.innerText.includes('upgrade-re')`);
 await b.evaluate(`(()=>{Array.from(document.querySelectorAll('.useritemblock')).find(e=>e.textContent.includes('upgrade-re')).click();return true})()`);
 await b.wait(`!!document.querySelector('.fa-global-tab')`);
 await b.evaluate(`(()=>{Array.from(document.querySelectorAll('.fa-global-tab')).find(e=>e.textContent==='紫微').click();return true})()`);
 await b.wait(`!!document.querySelector('.fa-ziwei-grid')`);
 for(const [mode,name] of [['三合','sanhe'],['钦天·四化','qintian'],['飞星','feixing']]){
  await b.evaluate(`(()=>{Array.from(document.querySelectorAll('.fa-ziwei-modebar button')).find(e=>e.textContent===${JSON.stringify(mode)}).click();return true})()`);
  await new Promise(r=>setTimeout(r,250));
  const value=await b.evaluate(`(()=>{var r=document.querySelector('.fa-ziwei-grid').getBoundingClientRect(),luck=document.querySelector('.fa-ziwei-bazi-luck'),legend=document.querySelector('.fa-self-legend');return {mode:${JSON.stringify(mode)},width:r.width,height:r.height,palaces:document.querySelectorAll('.fa-ziwei-palace').length,centerNoOverlap:!luck||!legend||legend.getBoundingClientRect().top>=luck.getBoundingClientRect().bottom-1};})()`);
  assert.ok(Math.abs(value.height/value.width-1.25)<.005);assert.equal(value.palaces,12);assert.equal(value.centerNoOverlap,true);results.ziwei.push(value);await capture('ziwei-'+name+'-final');
 }
 for(const [width,height] of [[320,640],[360,740],[700,1000]]){
  await b.call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2.625,mobile:true});await new Promise(r=>setTimeout(r,200));
  const value=await b.evaluate(`(()=>{var r=document.querySelector('.fa-ziwei-grid').getBoundingClientRect(),content=document.querySelector('.fa-slide-ziwei .fa-other-content');return {viewport:[innerWidth,innerHeight],grid:[r.width,r.height],scrollable:content.scrollHeight>content.clientHeight};})()`);
  assert.ok(Math.abs(value.grid[1]/value.grid[0]-1.25)<.005);results.viewports.push(value);
 }
 await b.call('Emulation.clearDeviceMetricsOverride');
 await route('/main/wznavigation/wzuserlist');await b.wait(`document.body.innerText.includes('名人库')`);
 await b.evaluate(`(()=>{Array.from(document.querySelectorAll('*')).find(e=>e.children.length===0&&e.textContent==='名人库').click();return true})()`);
 await b.wait(`document.getElementById('app').__vue__.$store.getters.mrUserArr.length===58`);
 results.famous=await b.evaluate(`(()=>{var e=document.querySelector('.pf-famous-source'),r=e.getBoundingClientRect(),header=document.querySelector('.header-box').getBoundingClientRect();return {count:document.getElementById('app').__vue__.$store.getters.mrUserArr.length,notice:e.textContent,noticeTop:r.top,headerBottom:header.bottom,color:getComputedStyle(e).color};})()`);
 assert.ok(results.famous.noticeTop>=results.famous.headerBottom-2);await capture('famous-final');
 await b.evaluate(`(()=>{var frame=document.createElement('iframe');frame.id='zaohua-reader-review';frame.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;border:0;z-index:999999;background:#f5f1e9';frame.src='/static/newguji/index.html?nightMode=1';frame.onload=function(){frame.contentWindow.postMessage({type:'GujiData',data:{bzArr:'庚辰己丑壬申辛丑'.split(''),cgArr:[],geju:'正官',guid:''}},'*');};document.body.appendChild(frame);return true})()`);
 await b.wait(`document.querySelector('#zaohua-reader-review')?.contentDocument?.querySelector('#bookbox')?.getBoundingClientRect().height>100`);await new Promise(r=>setTimeout(r,600));
 results.classics=await b.evaluate(`(()=>{var d=document.querySelector('#zaohua-reader-review').contentDocument;return {height:d.querySelector('#bookbox').getBoundingClientRect().height,overflow:d.documentElement.scrollWidth>d.documentElement.clientWidth,error:d.querySelector('.guji-load-error')?.innerText||''};})()`);
 const resources=await b.call('Page.getResourceTree');const urls=[];
 function visit(tree){for(const r of tree.resources||[])if(r.url.includes('/gjbook/static/index.css'))urls.push(r.url);for(const child of tree.childFrames||[])visit(child);}
 visit(resources.frameTree);assert.ok(urls.length>0);results.classics.css=urls;assert.equal(results.classics.overflow,false);assert.equal(results.classics.error,'');assert.ok(results.classics.height<8000);await capture('classics-final');
 await b.evaluate(`(()=>{document.querySelector('#zaohua-reader-review').remove();return true})()`);
 results.nativeRejectsUntrusted=await b.evaluate(`(async()=>{try{await Capacitor.Plugins.DataVault.read({token:'0'.repeat(64)});return false;}catch(_){return true;}})()`);assert.equal(results.nativeRejectsUntrusted,true);
 fs.writeFileSync(directory+'/android-ui-final.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await b.call('Emulation.clearDeviceMetricsOverride').catch(()=>{});b.close();}
