import fs from 'node:fs/promises';
import {connectBrowser} from '../../tests/helpers/browser-cdp.mjs';
const browser=await connectBrowser(),{call,evaluate:ev,wait}=browser;
const origin=process.env.ZAOHUA_PERF_URL||'http://localhost:9988',out=process.env.ZAOHUA_PERF_OUT||'docs/performance-round2-2026-10-29/after';
const pause=ms=>new Promise(r=>setTimeout(r,ms)),requests=[],errors=[];let injection;
browser.on(m=>{if(m.method==='Network.requestWillBeSent')requests.push({url:m.params.request.url.split('?')[0],type:m.params.type});if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params.args.map(a=>String(a.description||a.value||'').slice(0,1200)).join(' '));});
try {
 await fs.mkdir(out,{recursive:true});await call('Page.enable');await call('Runtime.enable');await call('Network.enable');await call('Network.setCacheDisabled',{cacheDisabled:true});
 await call('Emulation.setDeviceMetricsOverride',{width:430,height:932,deviceScaleFactor:1,mobile:true});await call('Emulation.setCPUThrottlingRate',{rate:4});
 injection=(await call('Page.addScriptToEvaluateOnNewDocument',{source:`window.__round2={long:[],frames:[]};new PerformanceObserver(list=>list.getEntries().forEach(e=>window.__round2.long.push({start:e.startTime,duration:e.duration}))).observe({type:'longtask',buffered:true});`})).identifier;
 await call('Storage.clearDataForOrigin',{origin,storageTypes:'all'});await call('Runtime.discardConsoleEntries');errors.length=0;requests.length=0;await call('Page.navigate',{url:origin});await wait(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='开始排盘')`);await pause(1000);
 const home=await ev(`({paint:performance.getEntriesByType('paint').map(p=>({name:p.name,start:p.startTime})),dom:document.querySelectorAll('*').length,quizLoaded:!!window.__WZBZ_TILIN_ALL__})`);
 await ev(`(async()=>{function find(v){if(v.datetimeData&&v.handleSunTime)return v;for(const c of v.$children||[]){const f=find(c);if(f)return f;}}const f=find(document.getElementById('app').__vue__);f.datetimeData.isManual=true;f.infoData.birthday='2026-10-29 12:00';f.datetimeData.value='2026-10-29 12:00';f.datetimeData.data=new Date(2026,9,29,12);await f.handleSunTime();return true})()`);
 const start=Date.now();await ev(`(()=>{[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='开始排盘').click();return true})()`);
 await wait(`!!document.querySelector('.fa-result-host')?.__vue__?.session&&!document.querySelector('.fa-result-host').__vue__.owner.chartPending`);const resultReadyMs=Date.now()-start;await pause(1500);
 const initial=await ev(`(()=>{let h=document.querySelector('.fa-result-host').__vue__;return {panes:Object.keys(h.renderedTabs).filter(k=>h.renderedTabs[k]),dom:document.querySelectorAll('*').length,long:window.__round2.long.slice(),iframes:[...document.querySelectorAll('iframe')].map(f=>({src:f.getAttribute('src'),ancestors:(()=>{let a=f,r=[];while(a&&r.length<12){let s=getComputedStyle(a),b=a.getBoundingClientRect();r.push({tag:a.tagName,cls:a.className,display:s.display,visibility:s.visibility,opacity:s.opacity,rect:[b.x,b.y,b.width,b.height]});a=a.parentElement;}return r})()}))}})()`);
 if(process.env.ZAOHUA_PROFILE==='1'){await call('Profiler.enable');await call('Profiler.start');}
 await ev(`(()=>{let last;window.__round2.running=true;function frame(t){if(last)window.__round2.frames.push(t-last);last=t;if(window.__round2.running)requestAnimationFrame(frame);}requestAnimationFrame(frame);return true})()`);
 const switches=[];for(const kind of ['ziwei','qimen','liuyao','meihua','bazi','ziwei','qimen','liuyao','meihua','bazi']){
  const timing=await ev(`(async()=>{const h=document.querySelector('.fa-result-host').__vue__,wasMounted=!!h.renderedTabs['${kind}'],start=performance.now();h.change('${kind}');await h.$nextTick();const el=document.querySelector('.fa-slide-${kind}'),rect=el.getBoundingClientRect();return {kind:'${kind}',wasMounted,updateLayoutMs:performance.now()-start,nodes:el.querySelectorAll('*').length,width:rect.width}})()`);switches.push(timing);await pause(400);
 }
 const final=await ev(`(()=>{window.__round2.running=false;return {frames:window.__round2.frames,long:window.__round2.long,quizLoaded:!!window.__WZBZ_TILIN_ALL__}})()`);
 if(process.env.ZAOHUA_PROFILE==='1'){const profile=(await call('Profiler.stop')).profile;await fs.writeFile(out+'/switching.cpuprofile',JSON.stringify(profile));}
 const data={environment:{browser:(await call('Browser.getVersion')).product,cpuSlowdown:4,viewport:'430x932',android:false},origin,home,resultReadyMs,initial,switches,final,requests,errors};await fs.writeFile(out+'/results.json',JSON.stringify(data,null,2));
 console.log(JSON.stringify({home,resultReadyMs,initialDOM:initial.dom,iframes:initial.iframes.map(f=>f.src),switches,exceptions:errors.length},null,2));
}catch(error){await fs.writeFile(out+'/failure.json',JSON.stringify({message:error.message,errors,requests,page:await ev(`({url:location.href,text:document.body.innerText.slice(-1200)})`).catch(()=>null)},null,2));throw error;
}finally{if(injection)await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:injection}).catch(()=>{});browser.close();}
