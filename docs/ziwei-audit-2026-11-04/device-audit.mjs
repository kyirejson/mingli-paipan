// Reversible UI inspection of the installed app; no app/source/storage writes.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {connectBrowser} from '../../tests/helpers/browser-cdp.mjs';
const b=await connectBrowser('9331'),out='docs/ziwei-audit-2026-11-04',delay=ms=>new Promise(r=>setTimeout(r,ms));
let original;
const read=()=>b.evaluate(`JSON.stringify(['wzbz_local_userlist_v14','wzbz_local_notes_v14','wzbz_note_drafts_v1'].map(k=>[k,localStorage.getItem(k)]))`);
const baseline=await read();
try{
 await b.wait(`document.querySelector('.ziwei-reading')?.__vue__?.bank?.schemaVersion===3`);
 original=await b.evaluate(`(()=>{const k=document.querySelector('.ziwei-reading').__vue__,host=document.querySelector('.fa-result-host').__vue__;return {tab:k.tab,all:k.allPalaces,selected:host.ziweiPalace,scope:host.flowScope,y:scrollY,tabScroll:document.querySelector('.zr-tabs').scrollLeft}})()`);
 await b.evaluate(`(()=>{const k=document.querySelector('.ziwei-reading').__vue__;k.tab='palace';k.allPalaces=true;return true})()`);await delay(150);
 const overview=await b.evaluate(`(()=>{const el=document.querySelector('.ziwei-reading'),k=el.__vue__;return k.view.rows.map(r=>({palace:r.name,expectedMisc:r.stars.filter(s=>k.bank.misc[s.name]).map(s=>s.name),displayedMiscHeadings:Array.from(el.querySelector('[data-palace-name="'+r.name+'"]')?.querySelectorAll('.zr-star-detail summary')||[],x=>x.textContent).filter(s=>s.includes('杂曜'))}));})()`);
 await b.evaluate(`(()=>{const k=document.querySelector('.ziwei-reading').__vue__;k.tab='patterns';k.allPalaces=false;document.querySelector('.ziwei-reading').scrollIntoView({block:'start'});return true})()`);await delay(100);
 const factorAlignment=await b.evaluate(`Array.from(document.querySelectorAll('.zr-pattern-factors li'),x=>({text:x.textContent,align:getComputedStyle(x).textAlign}))`);
 const s=await b.call('Page.captureScreenshot',{format:'jpeg',quality:85});await fs.writeFile(out+'/patterns-installed.jpg',Buffer.from(s.data,'base64'));
 const navigation=[];
 for(const width of [320,430]){
  await b.call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:true});
  await b.evaluate(`document.querySelector('.zr-tabs').scrollLeft=0`);await delay(60);
  navigation.push(await b.evaluate(`(()=>{const nav=document.querySelector('.zr-tabs'),box=nav.getBoundingClientRect();return {width:innerWidth,items:Array.from(nav.children,x=>{const r=x.getBoundingClientRect();return {text:x.textContent,fullyVisible:r.left>=box.left-1&&r.right<=box.right+1}}),scrollWidth:nav.scrollWidth,widthOfNav:nav.clientWidth};})()`));
 }
 const before=await b.evaluate(`JSON.stringify(document.querySelector('.ziwei-reading').__vue__.view.current.cards)`);
 await b.evaluate(`(()=>{document.querySelector('.fa-result-host').__vue__.flowScope='yearly';document.querySelector('.ziwei-reading').__vue__.tab='palace';return true})()`);
 await b.wait(`document.querySelector('.ziwei-reading').__vue__.flowScope==='yearly'`);
 const flow=await b.evaluate(`(()=>{const k=document.querySelector('.ziwei-reading').__vue__;return {scope:k.flowScope,header:document.querySelector('.zr-header').innerText,palaceHeading:document.querySelector('.zr-section-heading').innerText,cards:JSON.stringify(k.view.current.cards),flowCardCount:k.view.life.filter(p=>p.technique==='运限四化').length};})()`);
 flow.palaceCardsUnchanged=flow.cards===before;delete flow.cards;
 const result={installedVersion:'1.0.22',overview,factorAlignment,navigation,flow,protectedBefore:crypto.createHash('sha256').update(baseline).digest('hex'),protectedUnchanged:(await read())===baseline};
 await fs.writeFile(out+'/device-results.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({overviewMissing:overview.filter(r=>r.expectedMisc.length&&!r.displayedMiscHeadings.length),factorAlignment,navigation,flow,protectedUnchanged:result.protectedUnchanged}));
}finally{
 try{await b.call('Emulation.clearDeviceMetricsOverride');if(original)await b.evaluate(`(()=>{const k=document.querySelector('.ziwei-reading').__vue__,host=document.querySelector('.fa-result-host').__vue__;host.flowScope=${JSON.stringify(original.scope)};host.ziweiPalace=${JSON.stringify(original.selected)};k.tab=${JSON.stringify(original.tab)};k.allPalaces=${original.all};document.querySelector('.zr-tabs').scrollLeft=${original.tabScroll};window.scrollTo(0,${original.y});return true})()`);}
 finally{b.close();}
}
