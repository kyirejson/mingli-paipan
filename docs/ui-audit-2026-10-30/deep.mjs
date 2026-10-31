import fs from 'node:fs/promises';
import {createAudit} from './tools.mjs';
const a=await createAudit(),{b,call,ev,wait,size,capture,pause,finder,out}=a,stages=[];
async function stage(name,fn){try{await fn();stages.push({name,done:true});}catch(error){stages.push({name,error:error.message});console.log('Stage failed',name,error.message);}await fs.writeFile(out+'/deep-stages.json',JSON.stringify({stages,errors:a.errors},null,2));}
async function route(path){await ev(`window.__WZBZ_ROUTER__.replace('${path}').catch(()=>{}).then(()=>true)`);await pause(450);}
async function openChart(){
 await route('/main/wznavigation/wzuserlist');
 await ev(`(()=>{${finder}const v=find(document.getElementById('app').__vue__,'WZUserList'),record=JSON.parse(localStorage.getItem('wzbz_local_userlist_v14')).find(x=>x.name==='界面审核测试甲乙丙丁');v.isDetail=true;v.onDetail(record);return true})()`);
 await wait(`!!document.querySelector('.fa-result-host')?.__vue__?.session&&!document.querySelector('.fa-result-host').__vue__.owner.chartPending`);
}
async function scrollTo(selector){await ev(`(()=>{document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',inline:'nearest'});return true})()`);await pause(160);}
try{
 await call('Page.enable');await call('Runtime.enable');await call('Runtime.discardConsoleEntries');await size(430);
 await stage('settings-backup-preferences',async()=>{
  await route('/main/wznavigation/wzmy');await size(320,640);await capture('settings-320');await size(430);
  await ev(`(()=>{document.querySelector('.pf-settings-heading .pf-detail-button').click();return true})()`);await wait(`!!document.querySelector('#zaohua-backup')`);await capture('backup-430');await ev(`(()=>{[...document.querySelectorAll('#zaohua-backup button')].find(b=>b.textContent==='关闭').click();return true})()`);
  await ev(`(()=>{document.querySelector('.pf-settings-heading .fa-preference-entry').click();return true})()`);await capture('chart-preferences-430');await size(320,640);await capture('chart-preferences-320');await ev(`(()=>{document.querySelector('.fa-modal-header .fa-icon-button').click();return true})()`);
  await size(430);await ev(`(()=>{[...document.querySelectorAll('.tab_item')].find(e=>e.innerText.trim()==='偏好设置').click();return true})()`);await pause(500);await capture('display-preferences-430');
 });
 await stage('bazi-reference-dialogs',async()=>{
  await size(430);await openChart();await a.tab('bazi');await ev(`(()=>{document.querySelector('.fa-result-host').__vue__.owner.onTab(0);return true})()`);
  await scrollTo('.pf-reference-cards');await capture('basic-info-reference-430');
  for(let i=0;i<3;i++){
   await ev(`(()=>{document.querySelectorAll('.pf-reference-open')[${i}].click();return true})()`);await wait(`!!document.querySelector('.pf-detail-dialog')`);await capture('reference-dialog-'+i+'-430');
   await size(320,640);await capture('reference-dialog-'+i+'-320');await ev(`(()=>{document.querySelector('.pf-detail-dialog header button').click();return true})()`);await size(430);
  }
  await ev(`(()=>{document.querySelector('.pf-reference-edit').click();return true})()`);await capture('strength-edit-430');await ev(`(()=>{document.querySelector('.pf-detail-dialog header button').click();return true})()`);
 });
 await stage('notes-short-viewport',async()=>{
  await openChart();await a.tab('bazi');await ev(`(()=>{document.querySelector('.fa-result-host').__vue__.owner.onTab(3);return true})()`);await capture('notes-top-430');
  await ev(`(()=>{let input=document.querySelector('.pf-note-textarea');input.value='【审核用合成笔记】'+String.fromCharCode(10)+('记录判断依据与实际反馈。'.repeat(80));input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();return true})()`);await size(430,500);await capture('notes-keyboard-simulated-430x500');
  await scrollTo('.pf-notes-footer');await capture('notes-save-430x500');await size(320,640);await scrollTo('.pf-note-fields');await ev(`(()=>{document.querySelector('.pf-note-fields').open=true;return true})()`);await capture('notes-fields-320');
 });
 await stage('ziwei-flows-and-star-overlap',async()=>{
  await size(430);await openChart();await a.tab('ziwei');await ev(`(()=>{let h=document.querySelector('.fa-result-host').__vue__;h.session.ziweiMode='qintian';h.flowScope='decadal';return true})()`);await capture('ziwei-flow-selected-430');await size(320,640);await capture('ziwei-flow-selected-320');
  const data=await ev(`(()=>{let root=document.querySelector('.fa-slide-ziwei'),area=root.querySelector('.fa-other-content'),host=document.querySelector('.fa-result-host').__vue__,rect=e=>{let r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}};return{viewport:{w:innerWidth,h:innerHeight},area:{...rect(area),scrollHeight:area.scrollHeight,clientHeight:area.clientHeight},board:rect(root.querySelector('.fa-ziwei-board')),flows:[...root.querySelectorAll('.fa-flow-row')].map(e=>({text:e.innerText.slice(0,40),...rect(e)})),mode:rect(root.querySelector('.fa-ziwei-modebar')),palaces:[...root.querySelectorAll('.fa-ziwei-palace')].map(e=>({index:e.dataset.index,...rect(e),names:[...e.querySelectorAll('.fa-ziwei-star strong')].map(s=>({text:s.innerText,...rect(s)}))})),selected:host.ziweiPalace}})()`);await fs.writeFile(out+'/ziwei-geometry-320.json',JSON.stringify(data,null,2));
  await ev(`(()=>{document.querySelector('.fa-slide-ziwei .fa-other-content').scrollTop=10000;return true})()`);await capture('ziwei-flows-after-scroll-320');
 });
 await stage('liuyao-and-meihua-readings',async()=>{
  await size(430);await openChart();await a.tab('liuyao');await scrollTo('.fa-liuyao-reading');await capture('liuyao-reading-430');
  await ev(`(()=>{[...document.querySelectorAll('.fa-liuyao-reading button')].find(b=>b.innerText.includes('展开经传')).click();return true})()`);await wait(`!!document.querySelector('.fa-reading-modal')`);await capture('hexagram-reading-430');await size(320,640);await capture('hexagram-reading-320');await ev(`(()=>{document.querySelector('.fa-modal-header .fa-icon-button').click();return true})()`);
  await a.tab('meihua');await capture('meihua-interactive-lines-320');await ev(`(()=>{document.querySelector('.fa-slide-meihua .fa-hex-lines button').click();return true})()`);await wait(`!!document.querySelector('.fa-reading-modal')`);await capture('meihua-line-reading-320');await ev(`(()=>{document.querySelector('.fa-modal-header .fa-icon-button').click();return true})()`);
 });
 await stage('actual-dark-theme',async()=>{
  await size(430);await route('/main/settingshow/nightmode');await ev(`(()=>{[...document.querySelectorAll('.form_item_title')].find(e=>e.textContent.trim()==='夜间模式').click();return true})()`);await pause(400);await route('/main/wznavigation/wzmy');await capture('settings-dark-430');
  await openChart();await a.tab('ziwei');await ev(`(()=>{let h=document.querySelector('.fa-result-host').__vue__;h.session.ziweiMode='qintian';return true})()`);await capture('ziwei-dark-430');await ev(`(()=>{window.WZBZAssistantEndpoint=null;document.querySelector('.fa-result-host').__vue__.assistantOpen=true;return true})()`);await capture('assistant-dark-430');await ev(`(()=>{document.querySelector('.fa-result-host').__vue__.assistantOpen=false;return true})()`);
  await a.tab('meihua');await capture('meihua-dark-430');await route('/main/wznavigation/wzindex');await ev(`(()=>{document.querySelector('[aria-label="出生时间"]').click();return true})()`);await wait(`!!document.querySelector('.pf-calendar-sheet')`);await capture('calendar-dark-430');
  await ev(`(()=>{document.querySelector('.pf-calendar-cancel').click();return true})()`);await route('/main/settingshow/nightmode');await ev(`(()=>{[...document.querySelectorAll('.form_item_title')].find(e=>e.textContent.trim()==='日间模式').click();return true})()`);
 });
 await fs.writeFile(out+'/deep-stages.json',JSON.stringify({stages,errors:a.errors},null,2));console.log(JSON.stringify(stages,null,2));
}finally{b.close();}
