import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {connectBrowser} from './helpers/browser-cdp.mjs';
const b=await connectBrowser(),{call,evaluate:ev,wait}=b,origin='http://localhost:9988',out='docs/performance-round2-2026-10-29';
const requests=[],errors=[],pause=ms=>new Promise(r=>setTimeout(r,ms));
b.on(m=>{
 if(m.method==='Network.requestWillBeSent')requests.push(m.params.request.url.split('?')[0]);
 if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);
 if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params.args.map(a=>String(a.description||a.value||'')).join(' '));
 if(m.method==='Fetch.requestPaused')call('Fetch.failRequest',{requestId:m.params.requestId,errorReason:'Failed'}).catch(()=>{});
});
async function screenshot(name){const p=await call('Page.captureScreenshot',{format:'png'});await fs.writeFile(out+'/'+name,Buffer.from(p.data,'base64'));}
try{
 await fs.mkdir(out,{recursive:true});await call('Page.enable');await call('Runtime.enable');await call('Network.enable');await call('Network.setCacheDisabled',{cacheDisabled:true});await call('Emulation.setCPUThrottlingRate',{rate:1});
 await call('Emulation.setDeviceMetricsOverride',{width:430,height:932,deviceScaleFactor:1,mobile:true});
 await call('Storage.clearDataForOrigin',{origin,storageTypes:'all'});await call('Runtime.discardConsoleEntries');errors.length=0;requests.length=0;
 await call('Page.navigate',{url:origin});await wait(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='开始排盘')`);
 assert.equal(await ev(`!!window.__WZBZ_TILIN_ALL__`),false);
 await ev(`(()=>{[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='开始排盘').click();return true})()`);
 await wait(`!!document.querySelector('.fa-result-host')?.__vue__?.session&&!document.querySelector('.fa-result-host').__vue__.owner.chartPending`);
 assert.equal(requests.some(u=>u.includes('tiku-data.js')||u.includes('newguji/index.html')),false);
 assert.equal(await ev(`!!document.querySelector('.smart-book-box iframe')`),false);
 await wait(`!!document.querySelector('.pf-reader-open')`);
 await ev(`(()=>{const e=document.querySelector('.pf-reader-open');e.scrollIntoView({block:'center'});return true})()`);await screenshot('reader-on-demand.png');
 await ev(`(()=>{document.querySelector('.pf-reader-open').click();return true})()`);
 await wait(`document.querySelector('.smart-book-box iframe')?.contentDocument?.readyState==='complete'&&!!document.querySelector('.smart-book-box iframe').contentDocument.querySelector('#gj_app')?.children.length`);
 assert.ok(requests.some(u=>u.includes('newguji/index.html')));
 await ev(`(()=>{const h=document.querySelector('.fa-result-host').__vue__;h.change('ziwei');return true})()`);await wait(`document.querySelector('.fa-result-host').__vue__.active==='ziwei'`);
 await ev(`(async()=>{const h=document.querySelector('.fa-result-host').__vue__;h.session.ziweiMode='qintian';await h.$nextTick();return true})()`);
 await wait(`!!document.querySelector('.fa-slide-ziwei svg.fa-flight-layer polygon')`);
 await wait(`Math.abs(document.querySelector('.fa-slide-ziwei').getBoundingClientRect().left)<0.5&&!document.querySelector('.fa-result-host').__vue__._slideTimer`);
 const arrow=await ev(`(()=>{const e=document.querySelector('.fa-slide-ziwei svg.fa-flight-layer');return {viewBox:e.getAttribute('viewBox'),heads:e.querySelectorAll('polygon').length}})()`);assert.ok(!arrow.viewBox.endsWith(' 1 1'));await screenshot('ziwei-qintian.png');
 await pause(300);
 await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:350,y:500}]});
 for(const x of [310,260,210,160,100]){await call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:500}]});await pause(16);}
 await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait(`document.querySelector('.fa-result-host').__vue__.active==='qimen'`);
 await ev(`(()=>{const h=document.querySelector('.fa-result-host').__vue__;h.change('meihua');h.change('liuyao');h.change('ziwei');return true})()`);await pause(400);assert.equal(await ev(`document.querySelector('.fa-result-host').__vue__.active`),'ziwei');
 await ev(`(()=>{[...document.querySelectorAll('.fa-result-host > .navigation-foot button')].find(b=>b.textContent.trim()==='题库').click();return true})()`);await wait(`!!document.querySelector('.tiku-root')`);
 assert.equal(await ev(`!!window.__WZBZ_TILIN_ALL__`),false);
 await wait(`!!document.querySelector('.pf-level-open .pf-primary')`);
 await ev(`(()=>{document.querySelector('.pf-level-open .pf-primary').click();return true})()`);await wait(`!!document.querySelector('.pf-lesson-main')`);
 await ev(`(()=>{[...document.querySelectorAll('.pf-lesson-main button')].find(b=>b.textContent.includes('立即探索')).click();return true})()`);
 await wait(`!!window.__WZBZ_TILIN_ALL__&&document.querySelectorAll('.question_option').length>0`);
 const questionText=await ev(`document.querySelector('.question_wrapper').innerText`);assert.ok(questionText.length>20);await screenshot('quiz-first-use.png');
 assert.equal(requests.filter(u=>u.endsWith('/tiku-data.js')).length,1);
 const request=await ev(`(async()=>{const r=await window.__WZBZ_AXIOS_INTERCEPT__({url:'https://bzapi3.iwzbz.com/getQuestions.php',params:{cid:'0101000'}},()=>{throw Error('must not forward')});return Object.keys(r.data.data).length})()`);assert.ok(request>0);assert.equal(requests.filter(u=>u.endsWith('/tiku-data.js')).length,1);
 await call('Page.navigate',{url:origin});await wait(`!!window.WZBZAssets&&!!window.__WZBZ_AXIOS_INTERCEPT__`);assert.equal(await ev(`!!window.__WZBZ_TILIN_ALL__`),false);
 await call('Fetch.enable',{patterns:[{urlPattern:'*static/js/tiku-data.js*'}]});
 const failed=await ev(`(async()=>{try{await window.__WZBZ_AXIOS_INTERCEPT__({url:'https://bzapi3.iwzbz.com/getQuestions.php',params:{cid:'0101000'}},()=>{throw Error('must not forward')});return 0}catch(e){return e.response?.status}})()`);assert.equal(failed,503);
 await call('Fetch.disable');
 const retried=await ev(`(async()=>{const r=await window.__WZBZ_AXIOS_INTERCEPT__({url:'https://bzapi3.iwzbz.com/getQuestions.php',params:{cid:'0101000'}},()=>{throw Error('must not forward')});return Object.keys(r.data.data).length})()`);assert.ok(retried>0);
 assert.deepEqual(errors,[]);
 const result={passed:true,checks:['no quiz or reader loading on chart creation','reader opens on request','Qintian arrow dimensions','actual touch swipe','latest rapid selection wins','quiz actual lesson and question UI','quiz loaded once per document','failed resource returns 503 and retries successfully'],arrow,questions:request,errors};await fs.writeFile(out+'/browser-checks.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}catch(error){console.error(JSON.stringify({message:error.message,errors,page:await ev(`({url:location.href,text:document.body.innerText.slice(-1500)})`)},null,2));throw error;}finally{await call('Fetch.disable').catch(()=>{});b.close();}
