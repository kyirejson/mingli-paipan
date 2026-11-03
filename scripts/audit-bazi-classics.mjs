import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),ref=process.argv.includes('--ref')?process.argv[process.argv.indexOf('--ref')+1]:null;
if(process.argv.includes('--ref')&&!ref)throw Error('Missing --ref value');
const s=ref?execFileSync('git',['show',ref+':dist/static/newguji/index.js'],{cwd:root,encoding:'utf8'}):fs.readFileSync(root+'/dist/static/newguji/index.js','utf8');
const c={console,n(){}};vm.createContext(c);
try{vm.runInContext(s.slice(s.indexOf('const m='),s.indexOf('const Ie='))+';globalThis.api=De;globalThis.books=m.flat();',c,{timeout:2000});}catch(e){console.error(e.message);process.exit(1);}
const gan='甲乙丙丁戊己庚辛壬癸',zhi='子丑寅卯辰巳午未申酉戌亥',samples=[],failures=[],coverage={},allTabs={},indices={},firstFailures={};
for(let i=0;i<11;i++){coverage[i+1]={book:c.books[i].name,cases:0,emptyTabs:0,invalidIndex:0,exceptions:0};allTabs[i+1]=new Set();indices[i+1]={};}
for(let d=0;d<60;d++)for(let m=0;m<12;m++)for(let h=0;h<12;h++){
 const bazi=['甲','子',gan[((m+10)%12+2)%10],zhi[m],gan[d%10],zhi[d%12],gan[((d%10)%5*2+h)%10],zhi[h]];
 const geju='正官';
 for(const book of c.books){let stat=coverage[book.id];stat.cases++;
  try{
   const tabs=c.api['getGuji'+book.id+'_branch'](bazi,geju);
   if(!Array.isArray(tabs)||!tabs.length){stat.emptyTabs++;if(failures.length<50)failures.push({book:book.name,bazi,tabs});continue;}
   for(const tab of tabs){allTabs[book.id].add(tab.index);const f=c.api['getIndex'+book.id+'_'+(tab.index+1)];let result=typeof f==='function'?f(bazi,tab.value):null;
    if(!Number.isInteger(result)||result<1){stat.invalidIndex++;const example={book:book.name,bazi,tab,result};if(!firstFailures[book.id])firstFailures[book.id]=[];if(firstFailures[book.id].length<8)firstFailures[book.id].push(example);if(failures.length<50)failures.push(example);}
    const key=String(tab.index);if(!indices[book.id][key])indices[book.id][key]=new Set();indices[book.id][key].add(result);
   }
  }catch(error){stat.exceptions++;if(failures.length<50)failures.push({book:book.name,bazi,error:error.message});}
 }
 if(d===2&&m===9&&h===1)samples.push({bazi,books:c.books.map(book=>{const tabs=c.api['getGuji'+book.id+'_branch'](bazi,geju);return {id:book.id,name:book.name,tabs:tabs.map(tab=>({...tab,result:c.api['getIndex'+book.id+'_'+(tab.index+1)](bazi,tab.value)}))};})});
}
const gejuCases=[];for(const geju of ['正官','七杀','正印','正财','羊刃','正官格','七杀格','偏官格','正财格','偏财格','食神格','伤官格','正印格','偏印格','建禄格','羊刃格','月刃格','从弱格','专旺格','无格局','',undefined]){
 const bazi=['辛','巳','辛','丑','丁','丑','辛','丑'];
 gejuCases.push({geju,books:[2,5,9].map(id=>{try{const tabs=c.api['getGuji'+id+'_branch'](bazi,geju);return {id,tabs:tabs.map(tab=>({...tab,result:c.api['getIndex'+id+'_'+(tab.index+1)](bazi,tab.value)}))};}catch(e){return {id,error:e.message}}})});
}
const tables=vm.runInContext('({w,y,C,D,I,M,z,O,T,A})',c),tableAudit={};
for(const [key,items] of Object.entries(tables)){const duplicates=[],bad=[],reserved=[];items.forEach((v,i)=>{if(v===null){reserved.push(i+1);return;}if(v.includes('�'))bad.push({index:i+1,value:v});if(items.indexOf(v)!==i)duplicates.push({index:i+1,firstIndex:items.indexOf(v)+1,value:v});});tableAudit[key]={length:items.length,duplicates,bad,reserved};}
const summary={sourceRef:ref||'working-tree',sourceSha256:createHash('sha256').update(s).digest('hex'),scope:'Raw catalog lookup, with geju fixed to 正官; missing entries are not full-text corruption claims. UI filtering is tested separately.',synthetic_pillar_combinations:8640,coverage,firstFailures,tableAudit,failures,samples,gejuCases,tab_indices:Object.fromEntries(Object.entries(allTabs).map(([k,v])=>[k,[...v]])),index_ranges:Object.fromEntries(Object.entries(indices).map(([book,tabs])=>[book,Object.fromEntries(Object.entries(tabs).map(([tab,values])=>[tab,{min:Math.min(...values),max:Math.max(...values),unique:values.size}]))]))};
const outputDirectory=root+'/docs/'+(ref?'bazi-classics-audit-2026-11-03':'bazi-classics-fix-2026-11-03');
fs.mkdirSync(outputDirectory,{recursive:true});fs.writeFileSync(outputDirectory+'/'+(ref?'matcher-before.json':'matcher-raw-after.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify({sourceRef:summary.sourceRef,combinations:8640,books:11,rawLookupFailures:Object.fromEntries(Object.entries(coverage).map(([id,v])=>[id,v.invalidIndex]))},null,2));
