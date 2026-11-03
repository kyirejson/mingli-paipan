// Inspect a forwarded emulator WebView without creating, deleting or editing user records.
import fs from 'node:fs';
import {connectBrowser} from './helpers/browser-cdp.mjs';
const b=await connectBrowser(process.env.ZAOHUA_CDP_PORT||'9331'),stage=process.argv[2]||'before';
const directory='docs/readability-2026-11-03';fs.mkdirSync(directory,{recursive:true});
const measurements=[];
const probe=`(()=>{
 function rgb(s){let v=s.match(/[\\d.]+/g);return v?v.map(Number):[0,0,0,0];}
 function lum(c){return c.slice(0,3).map(x=>{x/=255;return x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4)}).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);}
 function bg(e){let chain=[];for(let x=e;x;x=x.parentElement)chain.push(x);let c=[245,241,233];for(let x of chain.reverse()){let a=rgb(getComputedStyle(x).backgroundColor),alpha=a[3]??1;c=c.map((v,i)=>v*(1-alpha)+a[i]*alpha);}return c;}
 const rows=[],seen=new Set(),walk=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;
 while(node=walk.nextNode()){
  let text=node.textContent.trim(),e=node.parentElement;if(!text||!e||seen.has(e)||/^(SCRIPT|STYLE|OPTION)$/.test(e.tagName))continue;seen.add(e);
  let range=document.createRange();range.selectNodeContents(node);let r=range.getBoundingClientRect(),s=getComputedStyle(e);if(!r.width||!r.height||r.right<=0||r.left>=innerWidth||r.bottom<=0||r.top>=innerHeight-60||s.visibility!=='visible')continue;
  let clipped=false;for(let a=e.parentElement;a&&a!==document.body;a=a.parentElement){let st=getComputedStyle(a);if(st.display==='none'){clipped=true;break;}if(/hidden|auto|scroll|clip/.test(st.overflow+st.overflowY+st.overflowX)){let q=a.getBoundingClientRect();if(q.width&&q.height&&(r.bottom<=q.top||r.top>=q.bottom||r.left>=q.right||r.right<=q.left)){clipped=true;break;}}}if(clipped)continue;
  let background=bg(e),color=rgb(s.color),alpha=color[3]??1,paint=color.map((v,i)=>i<3?v*alpha+background[i]*(1-alpha):v),l1=lum(paint),l2=lum(background),contrast=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
  rows.push({tag:e.tagName,class:typeof e.className==='string'?e.className:'svg',text:text.slice(0,45),font:parseFloat(s.fontSize),contrast:+contrast.toFixed(2),color:s.color,bg:background.map(Math.round),rect:[r.x,r.y,r.width,r.height].map(v=>+v.toFixed(1))});
 }
 return {url:location.hash,viewport:[innerWidth,innerHeight],theme:document.body.getAttribute('data-theme'),overflow:document.documentElement.scrollWidth>innerWidth+1,rows,small:rows.filter(x=>x.font<12),lowContrast:rows.filter(x=>x.contrast<4.5)};
})()`;
async function route(path){await b.evaluate(`(()=>{const path=${JSON.stringify(path)},index=path.includes('wzuserlist')?1:path.includes('wzbook')?2:/wzmy|settingshow/.test(path)?3:0;document.getElementById('app').__vue__.$store.dispatch('setnavigatorindex',index);window.__readabilityRoutePromise=__WZBZ_ROUTER__.replace(path).catch(()=>{});return true})()`);await new Promise(r=>setTimeout(r,350));}
async function capture(name,png=false){const r=await b.call('Page.captureScreenshot',png?{format:'png'}:{format:'jpeg',quality:75});fs.writeFileSync(`${directory}/${name}-${stage}.${png?'png':'jpg'}`,Buffer.from(r.data,'base64'));const result=await b.evaluate(probe);measurements.push({page:name,...result});}
const initial=await b.evaluate(`({hash:location.hash,isDark:document.getElementById('app').__vue__.$store.state.setting.isDark})`);
let chartPath=initial.hash.slice(1);
try{
 if(!chartPath.startsWith('/main/paipan?')){
  await route('/main/wznavigation/wzuserlist');await b.wait(`document.body.innerText.includes('upgrade-re')`);await b.evaluate(`(()=>{Array.from(document.querySelectorAll('.useritemblock')).find(e=>e.textContent.includes('upgrade-re')).click();return true})()`);await b.wait(`!!document.querySelector('.fa-result-host')?.__vue__?.session`);chartPath=await b.evaluate('location.hash.slice(1)');
 }
 for(const dark of [false,true]){
  const theme=dark?'dark':'light';
  await b.evaluate(`(()=>{document.getElementById('app').__vue__.$store.state.setting.isDark=${dark};document.body.setAttribute('data-theme','${theme}');document.documentElement.setAttribute('data-theme','${theme}');return true})()`);
  await route(chartPath);await b.wait(`!!document.querySelector('.fa-result-host')?.__vue__?.session`);await b.wait(`!document.querySelector('.fa-result-host').__vue__.owner.chartPending`);
  for(const type of ['bazi','ziwei','qimen','liuyao','meihua']){
   await b.evaluate(`(()=>{document.querySelector('.fa-result-host').__vue__.change('${type}');return true})()`);await new Promise(r=>setTimeout(r,280));await capture(`${theme}-${type}`);
   if(type==='ziwei')for(const mode of ['三合','钦天·四化']){await b.evaluate(`(()=>{document.querySelector('.fa-result-host').__vue__.session.ziweiMode=${JSON.stringify(mode==='三合'?'sanhe':'qintian')};return true})()`);await new Promise(r=>setTimeout(r,200));await capture(`${theme}-ziwei-${mode==='三合'?'sanhe':'qintian'}`);}
  }
  for(const [name,path] of [['records','/main/wznavigation/wzuserlist'],['quiz','/main/wznavigation/wzbook'],['settings','/main/wznavigation/wzmy'],['preferences','/main/settingshow/preferencesetting'],['updates','/main/settingshow/updates'],['home','/main/wznavigation/wzindex']]){await route(path);await capture(`${theme}-${name}`);}
  await b.evaluate(`(()=>{document.querySelector('button[aria-label="出生时间"]').click();return true})()`);await b.wait(`!!document.querySelector('.pf-calendar-sheet')`);await new Promise(r=>setTimeout(r,250));await capture(`${theme}-calendar`,true);await b.evaluate(`(()=>{document.querySelector('.pf-calendar-cancel').click();return true})()`);
 }
 fs.writeFileSync(`${directory}/measurements-${stage}.json`,JSON.stringify(measurements,null,2)+'\n');
 console.log(JSON.stringify(measurements.map(r=>({page:r.page,small:r.small.length,lowContrast:r.lowContrast.length,overflow:r.overflow})),null,2));
}finally{
 await b.call('Emulation.clearDeviceMetricsOverride');
 await b.evaluate(`(()=>{let dark=${JSON.stringify(initial.isDark)};document.getElementById('app').__vue__.$store.state.setting.isDark=dark;document.body.setAttribute('data-theme',dark?'dark':'light');document.documentElement.setAttribute('data-theme',dark?'dark':'light');return true})()`);
 await route(initial.hash.slice(1));b.close();
}
