// Public-page checks in the app's WebView. No credentials or real cases sent.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {connectBrowser} from './helpers/browser-cdp.mjs';
const b=await connectBrowser('9331'),installed=process.argv.includes('--installed');
const out=process.env.ZAOHUA_CLASSICS_OUTPUT||'docs/classics-all-2026-11-04/'+(installed?'installed':'preview');await fs.mkdir(out,{recursive:true});
const keys=['wzbz_local_userlist_v14','wzbz_local_notes_v14','wzbz_note_drafts_v1'];
const read=()=>b.evaluate(`Object.fromEntries(${JSON.stringify(keys)}.map(k=>[k,localStorage.getItem(k)]))`);
const rows=[];
try{
 const before=await read();
 await b.evaluate(`(()=>{document.getElementById('classics-diagnostic')?.remove();const f=document.createElement('iframe');f.id='classics-diagnostic';f.src='/static/newguji/index.html?nightMode=1';f.style='position:fixed;inset:0;width:100%;height:100%;border:0;z-index:2147483600;background:#f5f1e9';document.body.appendChild(f);return true})()`);
 await b.wait(`(()=>{const w=document.getElementById('classics-diagnostic')?.contentWindow,root=w?.document.querySelector('#gj_app')?.__vue__;if(!root)return false;const queue=[root];while(queue.length){const v=queue.shift();if(Array.isArray(v.books)&&v.gjData){w.__classicsView=v;return true;}queue.push(...v.$children);}return false})()`);
 if(!installed)for(const name of ['catalog','catalogue-rules','public-sources','reader'])await b.evaluate(`(()=>{document.getElementById('classics-diagnostic').contentWindow.eval(${JSON.stringify(await fs.readFile('dist/static/newguji/'+name+'.js','utf8'))});return true})()`);
 for(let id=1;id<=11;id++){
  const result=await b.evaluate(`(async()=>{const w=document.getElementById('classics-diagnostic').contentWindow,v=w.__classicsView;v.gjData={bzArr:['辛','巳','辛','丑','丁','丑','辛','丑'],cgArr:[],geju:'正官',guid:'',viplevel:0};const group=v.books.findIndex(g=>g.some(x=>x.id===${id}));v.swiperDex=group;v.swiperDex2=v.books[group].findIndex(x=>x.id===${id});v.tabsDex=0;const book=v.books[group][v.swiperDex2];v.tipResult=await v.getTipResult(book);let chapters=[];for(let i=0;i<v.tabs.length;i++){v.tabsDex=i;v.tipResult=i+1;try{const s=w.BaziPublicClassics.resolve(v),text=await w.BaziPublicClassics.fetchText(s),entry=w.BaziPublicClassics.extract(text,s);chapters.push({title:entry.title,url:s.url,original:entry.blocks.length,annotations:entry.annotations.length,chapterAnnotations:entry.chapterAnnotations.length,oldAnnotations:!!entry.oldAnnotations,level:entry.level});}catch(e){chapters.push({error:e.message});}}return {book:book.name,id:${id},chapters}})()`);
  rows.push(result);console.log(JSON.stringify({book:result.book,chapters:result.chapters.length,errors:result.chapters.filter(x=>x.error)}));
 }
 await fs.writeFile(out+'/sources.json',JSON.stringify({installed,rows},null,2)+'\n');
 assert.ok(rows.every(r=>r.chapters.length&&r.chapters.every(c=>!c.error&&c.original>0)),'Source parsing failures; inspect sources.json');
 assert.ok(rows.every(r=>r.chapters.some(c=>c.annotations+c.chapterAnnotations>0||c.oldAnnotations)),'A book has no readable annotations');
 const semantic=await b.evaluate(`(()=>{const w=document.getElementById('classics-diagnostic').contentWindow,api=w.BaziPublicClassics,b=['甲','子','丙','寅','丁','丑','辛','丑'];const html='<article id="article-content"><h1>丁日</h1><p><strong>寅月丁日庚子时</strong></p><p>子时原文</p><p><strong>寅月丁日辛丑时</strong></p><p>丑时原文</p><p><strong>寅月丁日壬寅时</strong></p><p>寅时原文</p></article><div id="pane-translation"><div class="space-y-3"><p>子时译文</p><p><strong>辛丑时</strong>：丑时对应译注</p><p><strong>壬寅时</strong>：隔壁时辰译注</p></div></div>';const s={book:'八字提要',expected:'丁日',mode:'tiyao',bazi:b,url:'https://luckclub.cn/bazi/015/004/'};const e=api.extract(html,s);return {exactOriginal:e.blocks.map(x=>x.text),exactNotes:e.annotations.map(x=>x.text),headingHandled:!e.annotations.some(x=>x.heading),safe:!api.documentText(html,s,false).includes('隔壁时辰译注')};})()`);
 assert.deepEqual(semantic.exactOriginal,['丑时原文']);assert.deepEqual(semantic.exactNotes,['辛丑时：丑时对应译注']);assert.equal(semantic.safe,true);assert.equal(semantic.headingHandled,true);
 await fs.writeFile(out+'/semantic-check.json',JSON.stringify(semantic,null,2)+'\n');
 if(process.argv.includes('--extended')){
  const jobs=[];for(let stem=0;stem<10;stem++)for(let m=0;m<12;m++)jobs.push({book:1,stem,month:m});for(let stem=0;stem<10;stem++)jobs.push({book:7,stem,month:0});for(let p=0;p<60;p++)jobs.push({book:11,pillar:p,stem:p%10,month:0});
  const extended=[];
  for(let offset=0;offset<jobs.length;offset+=5){
   const batch=await b.evaluate(`(async()=>{const w=document.getElementById('classics-diagnostic').contentWindow,component=w.__classicsView;let result=[];for(const job of ${JSON.stringify(jobs.slice(offset,offset+5))}){const stems='甲乙丙丁戊己庚辛壬癸',branches='子丑寅卯辰巳午未申酉戌亥',month='寅卯辰巳午未申酉戌亥子丑',i=job.pillar||0,bz=[stems[i%10],branches[i%12],'丙',month[job.month],stems[job.stem],branches[job.stem%12],stems[(job.stem%5*2+1)%10],'丑'];const v={books:component.books,swiperDex:component.books.findIndex(g=>g.some(x=>x.id===job.book)),swiperDex2:0,tabsDex:0,gjData:{bzArr:bz,geju:'正官'}};v.swiperDex2=v.books[v.swiperDex].findIndex(b=>b.id===job.book);const book=v.books[v.swiperDex][v.swiperDex2];v.tipResult=await component.$options.methods.getTipResult.call(v,book);for(let t=0;t<v.tabs.length;t++){v.tabsDex=t;try{const s=w.BaziPublicClassics.resolve(v),text=await w.BaziPublicClassics.fetchText(s),entry=w.BaziPublicClassics.extract(text,s);result.push({job,title:entry.title,original:entry.blocks.length,notes:entry.annotations.length,old:!!entry.oldAnnotations});}catch(e){result.push({job,error:e.message});}}}return result})()`);
   extended.push(...batch);if(offset%25===0)console.log(JSON.stringify({extendedJobs:offset+5,total:jobs.length,errors:extended.filter(x=>x.error).length}));
  }
  await fs.writeFile(out+'/extended-check.json',JSON.stringify({jobs:jobs.length,entries:extended.length,results:extended},null,2)+'\n');assert.ok(extended.every(x=>!x.error&&x.original>0),'Extended source alignment failed');
 }
 // Show the actual reader rather than only testing the parsing function.
 for(const id of [5,6,7]){
  await b.evaluate(`(async()=>{const w=document.getElementById('classics-diagnostic').contentWindow,v=w.__classicsView,g=v.books.findIndex(g=>g.some(x=>x.id===${id})),i=v.books[g].findIndex(x=>x.id===${id});await v.onClickBook(v.books[g][i],g,i,${id-1});return true})()`);
  await b.wait(`!!document.getElementById('classics-diagnostic').contentWindow.document.querySelector('#bookbox')?.src.startsWith('blob:')`);
  const shot=await b.call('Page.captureScreenshot',{format:'jpeg',quality:85});await fs.writeFile(out+'/book-'+id+'.jpg',Buffer.from(shot.data,'base64'));
 }
 const layouts=await b.evaluate(`(async()=>{const w=document.getElementById('classics-diagnostic').contentWindow,v=w.__classicsView,s=w.BaziPublicClassics.resolve(v),text=await w.BaziPublicClassics.fetchText(s),rows=[];for(const width of [320,430])for(const dark of [false,true]){const f=w.document.createElement('iframe');f.style='position:fixed;left:0;top:0;width:'+width+'px;height:700px;z-index:999999;background:#f5f1e9';const loaded=new Promise(resolve=>f.onload=resolve);f.srcdoc=w.BaziPublicClassics.documentText(text,s,dark);w.document.body.appendChild(f);await loaded;const body=f.contentDocument.body,style=w.getComputedStyle(body);rows.push({width,dark,font:style.fontSize,background:style.backgroundColor,overflow:body.scrollWidth>body.clientWidth+1,notes:body.innerText.includes('随文旧注')||!!body.querySelector('.translation'),original:!!body.querySelector('.original')});f.remove();}return rows})()`);
 for(const row of layouts){assert.equal(row.font,'18px');assert.equal(row.overflow,false);assert.equal(row.notes,true);assert.equal(row.original,true);assert.equal(row.background,row.dark?'rgb(24, 35, 30)':'rgb(245, 241, 233)');}
 await fs.writeFile(out+'/layouts.json',JSON.stringify(layouts,null,2)+'\n');
 assert.deepEqual(await read(),before);console.log(JSON.stringify({books:11,allSourceChecksPassed:true,userDataUnchanged:true}));
}finally{await b.evaluate(`document.getElementById('classics-diagnostic')?.remove()`);b.close();}
