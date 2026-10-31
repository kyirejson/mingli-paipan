import fs from 'node:fs/promises';
import {createAudit} from './tools.mjs';
const a=await createAudit(),{b,ev,call,wait,pause,capture,size,finder,out}=a,proof={};
async function route(path){await ev(`window.__WZBZ_ROUTER__.replace('${path}').catch(()=>{}).then(()=>true)`);await pause(600);}
try{
 await call('Page.enable');await call('Runtime.enable');await size(430);
 await route('/main/wznavigation/wzuserlist');
 proof.record=await ev(`(()=>{const e=[...document.querySelectorAll('*')].find(e=>e.children.length===0&&e.textContent==='界面审核测试甲乙丙丁');if(!e)return null;return [e,e.parentElement,e.parentElement.parentElement].map(e=>{let s=getComputedStyle(e),r=e.getBoundingClientRect();return {tag:e.tagName,cls:e.className,text:e.innerText,rect:{x:r.x,y:r.y,w:r.width,h:r.height},style:{overflow:s.overflow,textOverflow:s.textOverflow,whiteSpace:s.whiteSpace}}})})()`);
 await ev(`(()=>{${finder}const v=find(document.getElementById('app').__vue__,'WZUserList');v.isDetail=true;v.onDetail(JSON.parse(localStorage.getItem('wzbz_local_userlist_v14')).find(x=>x.name==='界面审核测试甲乙丙丁'));return true})()`);
 await wait(`!!document.querySelector('.fa-result-host')?.__vue__?.session&&!document.querySelector('.fa-result-host').__vue__.owner.chartPending`);
 await a.tab('bazi');await ev(`(()=>{document.querySelector('.fa-result-host').__vue__.owner.onTab(0);return true})()`);
 await ev(`(()=>{document.querySelector('.pf-reference-cards').scrollIntoView({block:'center',inline:'nearest'});document.querySelectorAll('.pf-reference-open')[0].click();return true})()`);
 await wait(`!!document.querySelector('.pf-detail-dialog iframe')`);await pause(1500);
 proof.frame=await ev(`(()=>{const f=document.querySelector('.pf-detail-dialog iframe'),d=f.contentDocument;function info(e){const s=e.ownerDocument.defaultView.getComputedStyle(e),r=e.getBoundingClientRect();return {tag:e.tagName,cls:e.className,text:e.innerText?.slice(0,100),rect:{x:r.x,y:r.y,w:r.width,h:r.height},style:{display:s.display,visibility:s.visibility,opacity:s.opacity,color:s.color,background:s.background,transform:s.transform,position:s.position,overflow:s.overflow,fontSize:s.fontSize,margin:s.margin}}}let v;function walk(x){if(x.$el?.isConnected&&'tipCode' in x)v=x;(x.$children||[]).forEach(walk)}walk(document.getElementById('app').__vue__);return {outer:[f,f.parentElement,f.parentElement.parentElement].map(info),inner:[d.documentElement,d.body,...d.querySelectorAll('p,article,main,div')].slice(0,10).map(info),onLoad:String(v.onIframeLoad),scroll:{x:d.defaultView.scrollX,y:d.defaultView.scrollY},styleSheets:[...d.styleSheets].map(s=>({href:s.href,rules:[...s.cssRules].slice(0,10).map(r=>r.cssText)}))}})()`);
 await capture('detail-computed-confirmed-430');
 await ev(`(()=>{document.querySelector('.pf-detail-dialog header button').click();document.querySelector('.fa-result-host').__vue__.owner.onTab(3);return true})()`);
 await size(430,500);await pause(800);await capture('notes-occlusion-430x500');
 proof.notes=await ev(`(()=>{const t=document.querySelector('.pf-note-textarea'),f=document.querySelector('.pf-notes-footer'),r=t.getBoundingClientRect(),s=f.getBoundingClientRect();return {viewport:{w:innerWidth,h:innerHeight},textarea:{x:r.x,y:r.y,w:r.width,h:r.height},footer:{x:s.x,y:s.y,w:s.width,h:s.height},overlap:Math.min(r.bottom,s.bottom)-Math.max(r.top,s.top)}})()`);
 await route('/main/wznavigation/wzindex');await size(800,420);await capture('home-landscape-final');
 proof.landscape=await ev(`(()=>{const e=document.querySelector('.pf-start-button')||[...document.querySelectorAll('button')].find(e=>e.innerText.includes('开始排盘'));if(!e)return {missing:true};e.scrollIntoView({block:'center'});let r=e.getBoundingClientRect();return {rect:{x:r.x,y:r.y,w:r.width,h:r.height},hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.innerText}})()`);await capture('home-landscape-scrolled-final');
 await fs.writeFile(out+'/final-probe.json',JSON.stringify(proof,null,2));console.log(JSON.stringify(proof,null,2));
}finally{b.close();}
