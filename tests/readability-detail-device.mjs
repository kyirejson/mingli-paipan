import fs from 'node:fs';
import assert from 'node:assert/strict';
import {connectBrowser} from './helpers/browser-cdp.mjs';
const b=await connectBrowser(process.env.ZAOHUA_CDP_PORT||'9331'),out='docs/readability-2026-11-03',errors=[],checks=[];
const pause=()=>new Promise(r=>setTimeout(r,220));
b.on(m=>{if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);});
await b.call('Runtime.enable');
const initial=await b.evaluate(`({hash:location.hash,dark:document.getElementById('app').__vue__.$store.state.setting.isDark})`);
const ev=s=>b.evaluate(s),host=`document.querySelector('.fa-result-host').__vue__`;
async function route(path){await ev(`(()=>{const path=${JSON.stringify(path)},index=path.includes('wzuserlist')?1:path.includes('wzbook')?2:/wzmy|settingshow/.test(path)?3:0;document.getElementById('app').__vue__.$store.dispatch('setnavigatorindex',index);window.__readabilityRoutePromise=__WZBZ_ROUTER__.replace(path).catch(()=>{});return true})()`);await pause();}
async function shot(name){const r=await b.call('Page.captureScreenshot',{format:'jpeg',quality:75});fs.writeFileSync(`${out}/${name}.jpg`,Buffer.from(r.data,'base64'));}
async function close(){await ev(`(()=>{document.querySelector('.fa-modal-header .fa-icon-button').click();return true})()`);await pause();}
try{
 if(!initial.hash.includes('/main/paipan?')){await route('/main/wznavigation/wzuserlist');await ev(`(()=>{[...document.querySelectorAll('.useritemblock')].find(e=>e.textContent.includes('upgrade-re')).click();return true})()`);}
 await b.wait(`!!${host}?.session`);await b.wait(`!${host}.owner.chartPending`);
 const chartPath=await ev('location.hash.slice(1)');
 for(const dark of [false,true]){
  const theme=dark?'dark':'light';await ev(`(()=>{document.getElementById('app').__vue__.$store.state.setting.isDark=${dark};document.body.setAttribute('data-theme','${theme}');document.documentElement.setAttribute('data-theme','${theme}');return true})()`);
  await route(chartPath);await b.wait(`!!${host}?.session`);await b.wait(`!${host}.owner.chartPending`);
  for(const width of [320,360,412]){
   await b.call('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});await pause();
   await ev(`(()=>{${host}.change('ziwei');return true})()`);await pause();
   for(const mode of ['sanhe','qintian','feixing']){
    await ev(`(()=>{${host}.session.ziweiMode='${mode}';return true})()`);await pause();
    const board=await ev(`(()=>{let q=document.querySelector('.fa-slide-ziwei .fa-ziwei-grid').getBoundingClientRect();return {width:q.width,height:q.height,overflow:document.documentElement.scrollWidth>innerWidth+1}})()`);assert.ok(Math.abs(board.height/board.width-1.25)<.015);assert.equal(board.overflow,false);
    await ev(`(()=>{document.querySelector('.fa-slide-ziwei .fa-palace-read').click();return true})()`);await b.wait(`!!document.querySelector('.fa-palace-reading')`);
    assert.equal(await ev(`document.querySelectorAll('.fa-palace-reading>.fa-choices button').length`),12);
    for(let index=0;index<12;index++){
     await ev(`(()=>{document.querySelectorAll('.fa-palace-reading>.fa-choices button')[${index}].click();return true})()`);
     const d=await ev(`(()=>{let e=document.querySelector('.fa-palace-reading');let r=e.getBoundingClientRect();return {heading:e.querySelector('h3').textContent,rows:e.querySelectorAll('dl>div').length,font:parseFloat(getComputedStyle(e.querySelector('dd')).fontSize),overflow:r.right>innerWidth+1||e.scrollWidth>e.clientWidth+1}})()`);assert.ok(d.heading.length>3);assert.ok(d.rows>=9);assert.ok(d.font>=16);assert.equal(d.overflow,false);
    }
    if(width===320&&mode==='sanhe')await shot(`${theme}-palace-detail-320`);await close();
    if(width===320)await shot(`${theme}-ziwei-${mode}-320`);
    checks.push({theme,width,mode,palaces:12,boardRatio:+(board.height/board.width).toFixed(3)});
   }
   for(const type of ['liuyao','meihua','qimen']){
    await ev(`(()=>{${host}.change('${type}');return true})()`);await pause();
    let result=await ev(`(()=>{const e=document.querySelector('.fa-slide-${type} .fa-other-content');return {width:e.clientWidth,scroll:e.scrollWidth}})()`);assert.ok(result.scroll<=result.width+1,`${type} ${theme} ${width} horizontal overflow`);if(width===320)await shot(`${theme}-${type}-320`);
   }
  }
  await b.call('Emulation.clearDeviceMetricsOverride');await ev(`(()=>{${host}.change('bazi');return true})()`);await pause();
  for(const [label,name] of [['基本信息','info'],['专业细盘','detail'],['断事笔记','notes']]){
   await ev(`(()=>{[...document.querySelectorAll('.tab_item')].find(e=>e.textContent.trim()===${JSON.stringify(label)}).click();return true})()`);await new Promise(r=>setTimeout(r,650));await shot(`${theme}-bazi-${name}`);
  }
  for(const [name,path] of [['wuyun-analysis','/main/wylq/analysis'],['wuyun-chart','/main/wylq/wuyun'],['liuqi','/main/wylq/liuqi'],['wuyun-summary','/main/wylq/summary']]){await route(path);await shot(`${theme}-${name}`);}
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/detail-results.json',JSON.stringify({passed:true,checks,errors},null,2));console.log(JSON.stringify({passed:true,palaceViews:checks.length*12,boardLayouts:checks.length,errors}));
}catch(e){console.error(e);console.error(await ev(`({url:location.hash,text:document.body.innerText.slice(-1300)})`));throw e;}
finally{await b.call('Emulation.clearDeviceMetricsOverride');await ev(`(()=>{let dark=${JSON.stringify(initial.dark)};document.getElementById('app').__vue__.$store.state.setting.isDark=dark;document.body.setAttribute('data-theme',dark?'dark':'light');document.documentElement.setAttribute('data-theme',dark?'dark':'light');return true})()`);await route(initial.hash.slice(1));b.close();}
