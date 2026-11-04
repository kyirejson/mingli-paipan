// Read-only probes. Run from the project root; no storage or APK is modified.
const fs=require('node:fs'),path=require('node:path');
const {setup,clean}=require('../../tests/helpers/ziwei-reading.cjs');
const {c,api,data}=setup(),E=c.FiveArtsEngine;
const B='子丑寅卯辰巳午未申酉戌亥';
const projectRoot=process.cwd(),output={baselineVersion:'1.0.22',probes:{}};
function plain(chart){return {palaces:chart.palaces.map(p=>({name:p.name,heavenlyStem:p.heavenlyStem,earthlyBranch:p.earthlyBranch,isBodyPalace:p.isBodyPalace,isOriginalPalace:p.isOriginalPalace,decadal:clean(p.decadal),ages:clean(p.ages),majorStars:p.majorStars.map(s=>({name:s.name,brightness:s.brightness,mutagen:s.mutagen})),minorStars:p.minorStars.map(s=>({name:s.name,brightness:s.brightness,mutagen:s.mutagen})),adjectiveStars:p.adjectiveStars.map(s=>({name:s.name,brightness:s.brightness,mutagen:s.mutagen}))}))};}
function analyse(chart,options={}){return api.analyse(data,chart,{mode:'qintian',...options});}
function inside(origin,target){return [0,4,6,8].includes((B.indexOf(target)-B.indexOf(origin)+12)%12);}
const sample=E.ziwei('2001-01-09 01:29','男').chart,view=analyse(sample),wu=view.rows.find(r=>r.major.includes('武曲')&&r.major.includes('七杀'));
output.probes.palaceLost={actualPalace:wu.name,actualMajor:wu.major,displayed:view.patterns.find(p=>p.title==='武曲七杀')};
const h=sample.horoscope('2026-11-04',5),natal=analyse(sample),yearly=analyse(sample,{flowScope:'yearly',flow:h.yearly,flowDate:'2026-11-04'});
output.probes.flowIsolation={palaceCardsIdentical:JSON.stringify(natal.rows.map(r=>r.cards))===JSON.stringify(yearly.rows.map(r=>r.cards)),patternCardsIdentical:JSON.stringify(natal.patterns)===JSON.stringify(yearly.patterns),flowCards:yearly.life.filter(p=>p.technique==='运限四化').map(p=>({title:p.title,text:p.text,evidence:p.evidence})),allFlowTextsArePlainPalaceHua:yearly.life.filter(p=>p.technique==='运限四化').every(p=>Object.values(data.hua).some(v=>Object.values(v).includes(p.text)))};
const feixing=analyse(sample,{mode:'feixing'});
output.probes.schoolIsolation={natalIdentical:JSON.stringify(view.rows.map(r=>r.natal))===JSON.stringify(feixing.rows.map(r=>r.natal)),patternsIdentical:JSON.stringify(view.patterns)===JSON.stringify(feixing.patterns),flightsIdentical:JSON.stringify(view.flights)===JSON.stringify(feixing.flights)};
const x=plain(sample),i=x.palaces.findIndex(p=>p.name==='财帛'),before=analyse(x,{selected:i}).current;
x.palaces[i].majorStars.find(s=>s.name==='天同').mutagen='';
const after=analyse(x,{selected:i}).current;
output.probes.coreDoesNotCompose={coreUnchanged:before.cards[0].text===after.cards[0].text,natalChanged:JSON.stringify(before.natal)!==JSON.stringify(after.natal),core:before.cards[0].text};
const sourceKeys=new Set();for(const v of Object.values(data.contexts))Object.keys(v).forEach(k=>sourceKeys.add(k));
output.probes.provenance={detailFields:Object.keys(data.details[0]),profileCellType:typeof data.profiles['天机']['命宫'],contextFields:[...sourceKeys],sourceKeys:Object.keys(data.sources),entryToParagraphMapping:false};
output.probes.detailCoverage=Object.fromEntries(data.palaceOrder.map(p=>[p,{brightness:data.details.filter(r=>r.palace===p&&r.type==='brightness').length,mutagen:data.details.filter(r=>r.palace===p&&r.type==='mutagen').length}]));
const unknownStars=new Set(),brightness=new Set(),duplicates=[],hui=[],ma=[],originals={};
for(let j=0;j<288;j++){
 const date=`${1960+j%60}-${String(j%12+1).padStart(2,'0')}-${String(j%27+1).padStart(2,'0')} ${String(j%24).padStart(2,'0')}:30`,chart=E.ziwei(date,j%2?'男':'女').chart,r=analyse(chart);
 const originalCount=r.rows.filter(p=>p.original).length;originals[originalCount]=(originals[originalCount]||0)+1;
 for(const p of r.rows)for(const s of p.stars){if(s.brightness)brightness.add(s.brightness);if(!data.profiles[s.name]&&!data.auxiliary[s.name]&&!data.misc[s.name])unknownStars.add(s.name);}
 const titles=r.patterns.map(p=>p.title),dup=titles.filter((s,k)=>titles.indexOf(s)!==k);
 if(dup.length&&duplicates.length<3)duplicates.push({date,gender:j%2?'男':'女',titles:dup,body:r.rows.find(p=>p.body)?.name,cards:r.patterns.filter(p=>dup.includes(p.title))});
 for(const check of [{name:'天同天梁格',stars:['天同','天梁'],bonus:'文昌会照',aux:'文昌'},{name:'廉贞天相格',stars:['廉贞','天相'],bonus:'左辅会照',aux:'左辅'}]){
  const p=r.patterns.find(p=>p.title===check.name),target=r.rows.find(q=>check.stars.every(n=>q.major.includes(n))),aux=r.rows.find(q=>q.stars.some(s=>s.name===check.aux));
  if(p&&target&&aux&&p.bonus.includes(check.bonus)&&!inside(B[target.branch],B[aux.branch])&&!hui.some(x=>x.pattern===check.name))hui.push({date,gender:j%2?'男':'女',pattern:check.name,targetPalace:target.name,targetBranch:B[target.branch],auxiliary:check.aux,auxPalace:aux.name,auxBranch:B[aux.branch],displayedBonus:p.bonus});
 }
 if(ma.length<3){const m=r.rows.find(p=>p.name==='命宫');if(r.patterns.some(p=>p.title==='马头带箭')&&!m.major.includes('天同')&&!m.major.includes('太阴'))ma.push({date,gender:j%2?'男':'女',ming:m.ganzhi,major:m.major,oppositeMajor:m.opposite.major,tanLu:m.stars.some(s=>s.name==='贪狼'&&s.mutagen==='禄'),pattern:r.patterns.find(p=>p.title==='马头带箭')});}
}
output.probes.realCharts={count:288,brightnessLevels:[...brightness],unexplainedStars:[...unknownStars],originalPalaceCounts:originals,duplicatePatterns:duplicates,wrongMeetingCenters:hui,maTouMismatch:ma};
let focusedCount=0,hardMa=null,duplicateCase=null;
focused:for(const year of [1984,1985,1986,1987,1988,1989,1990,1991,1992,1993])for(const month of [1,3,6,9])for(const day of [1,8,15])for(const hour of [0,10,12]){
 focusedCount++;const date=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')} ${String(hour).padStart(2,'0')}:30`,chart=E.ziwei(date,'男').chart,r=analyse(chart),m=r.rows[0],p=r.patterns.find(p=>p.title==='马头带箭');
 if(p&&!hardMa){const exact=m.major.includes('天同')&&m.major.includes('太阴'),borrow=!m.major.length&&m.opposite.major.includes('天同')&&m.opposite.major.includes('太阴'),variant=m.stars.some(s=>s.name==='贪狼'&&s.mutagen==='禄');if(!exact&&!borrow&&!variant)hardMa={date,ming:m.ganzhi,major:m.major,oppositeMajor:m.opposite.major,pattern:p};}
 const titles=r.patterns.map(p=>p.title),dup=titles.filter((s,k)=>titles.indexOf(s)!==k);
 if(dup.length&&!duplicateCase)duplicateCase={date,gender:'男',ming:m.ganzhi,body:r.rows.find(p=>p.body)?.name,duplicates:dup,cards:r.patterns.filter(p=>dup.includes(p.title))};
 if(hardMa&&duplicateCase)break focused;
}
output.probes.focused={charts:focusedCount,hardMa,duplicateCase};
const broken=clean(data);broken.details.push({...broken.details[0],id:'different-id-same-predicate',text:'different meaning'});let accepted;try{api.validate(broken);accepted=true;}catch{accepted=false;}
output.probes.validatorAcceptsConflictingDetail=accepted;
output.probes.corpusAndUI={genericBrightnessLevels:Object.keys(data.brightness['天机']),miscCount:Object.keys(data.misc).length,techniques:data.techniques};
const out=path.join(projectRoot,'docs/ziwei-audit-2026-11-04/probe-results.json');fs.writeFileSync(out,JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({saved:out,realCharts:288,meetingCenterErrors:hui,focused:output.probes.focused,unexplainedStars:[...unknownStars],conflictingDetailsAccepted:accepted}));
