import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const port=process.env.ZAOHUA_CDP_PORT||'9330',origin=process.env.ZAOHUA_PREVIEW_URL||'http://localhost:9988',out=process.env.ZAOHUA_EVIDENCE_OUT||'docs/optimization-2026-10-29';
const targets=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json(),target=targets.find(t=>t.type==='page');
if(!target)throw Error('Start an isolated Chrome CDP page first.');
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let seq=0,pending=new Map(),errors=[];
ws.addEventListener('message',({data})=>{let m=JSON.parse(data);if(m.method==='Runtime.executionContextsCleared')errors=[];if(m.method==='Runtime.exceptionThrown')errors.push({text:m.params.exceptionDetails.text,description:m.params.exceptionDetails.exception?.description,url:m.params.exceptionDetails.url});if(m.id&&pending.has(m.id)){let p=pending.get(m.id);clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}});
function call(method,params={}){return new Promise((resolve,reject)=>{let id=++seq,timer=setTimeout(()=>{pending.delete(id);reject(Error(method+' timeout'));},20000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){let r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(expression){for(let i=0;i<100;i++){if(await evaluate(expression))return;await pause(200);}throw Error('Timed out: '+expression);}
try{
 await call('Page.enable');await call('Runtime.discardConsoleEntries');await call('Runtime.enable');await call('Emulation.setDeviceMetricsOverride',{width:430,height:932,deviceScaleFactor:1,mobile:true});
 await call('Page.navigate',{url:origin});await wait(`!!window.__WZBZ_ROUTER__ && !!window.WZBZBackup`);
 const networkPolicy=await evaluate(`(async()=>{let called=false;let blocked=await window.__WZBZ_AXIOS_INTERCEPT__({url:'https://bzapi3.iwzbz.com/unsupported-audit-test.php'},()=>{called=true;return Promise.resolve({});});let core=await window.__WZBZ_AXIOS_INTERCEPT__({url:'https://bzapi3.iwzbz.com/getbasebz8.php'},()=>Promise.resolve({data:{mockAllowed:true}}));return {blocked:blocked.data.code,called,coreAllowed:core.data.mockAllowed};})()`);
 assert.deepEqual(networkPolicy,{blocked:501,called:false,coreAllowed:true});
 await evaluate(`window.__WZBZ_ROUTER__.replace('/main/wznavigation/wzmy').catch(()=>{}).then(()=>true)`);
 await wait(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='数据备份')`);
 await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='数据备份').click()`);
 await wait(`!!document.querySelector('#zaohua-backup textarea')`);
 await evaluate(`[...document.querySelectorAll('#zaohua-backup button')].find(b=>b.textContent==='生成备份').click()`);
 const result=await evaluate(`(()=>{let p=document.querySelector('#zaohua-backup section'),r=p.getBoundingClientRect(),b=JSON.parse(p.querySelector('textarea').value);return {format:b.format,version:b.version,keys:Object.keys(b.data),rect:{left:r.left,right:r.right,top:r.top,bottom:r.bottom},width:innerWidth,height:innerHeight}})()`);
 assert.equal(result.format,'zaohua-local-backup');assert.ok(result.keys.includes('setting_suntime'));assert.ok(result.rect.left>=0&&result.rect.right<=result.width+1);assert.ok(result.rect.top>=0&&result.rect.bottom<=result.height+1);
 await fs.mkdir(out,{recursive:true});
 let screenshot=await call('Page.captureScreenshot',{format:'png'});await fs.writeFile(out+'/backup-mobile.png',Buffer.from(screenshot.data,'base64'));
 await evaluate(`[...document.querySelectorAll('#zaohua-backup button')].find(b=>b.textContent==='关闭').click()`);
 assert.equal(await evaluate(`!!document.querySelector('#zaohua-backup')`),false);
 await evaluate(`window.__WZBZ_ROUTER__.replace('/main/wznavigation/wzindex').catch(()=>{}).then(()=>true)`);
 await wait(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='开始排盘')`);
 await evaluate(`(()=>{window.__qaBlocked=[];let old=window.__WZBZ_AXIOS_INTERCEPT__;window.__WZBZ_AXIOS_INTERCEPT__=function(cfg,orig){let out=old(cfg,orig);return Promise.resolve(out).then(r=>{if(r?.data?.code===501)window.__qaBlocked.push(String(cfg.url).split('?')[0]);return r;});};return true})()`);
 await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='开始排盘').click()`);
 await wait(`!!document.querySelector('.fa-result-host')?.__vue__?.session && !document.querySelector('.fa-result-host').__vue__.owner.chartPending`);
 for(const kind of ['ziwei','qimen','liuyao','meihua']){
   await evaluate(`(()=>{let v=document.querySelector('.fa-result-host').__vue__;v.change('${kind}');return true})()`);
   await wait(`!!document.querySelector('.fa-slide-${kind}')`);await pause(250);
   let text=await evaluate(`document.querySelector('.fa-slide-${kind}').innerText`);assert.ok(text.length>80,kind);assert.ok(!text.includes('排盘失败'),kind);
 }
 await evaluate(`(()=>{window.WZBZAssistantEndpoint=null;let v=document.querySelector('.fa-result-host').__vue__;v.change('ziwei');v.assistantOpen=true;return true})()`);
 await wait(`document.querySelector('.za-assistant')?.innerText.includes('服务尚未开通')`);
 assert.equal(await evaluate(`document.querySelector('.za-input button[type=submit]')?.disabled ?? document.querySelector('.za-assistant button[type=submit]')?.disabled`),true);
 assert.deepEqual(errors,[]);console.log('Browser UI passed: backup entry/export/mobile layout, chart creation and four result panes, assistant unavailable state; no runtime exceptions.');
}catch(error){console.error(JSON.stringify({error:error.message,exceptions:errors,page:await evaluate(`({url:location.href,text:document.body.innerText.slice(-1500),host:!!document.querySelector('.fa-result-host'),blocked:window.__qaBlocked})`)},null,2));throw error;}finally{ws.close();}
