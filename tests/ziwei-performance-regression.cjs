const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={console,Date,Intl,Math,JSON,Map,Set,WeakMap};c.window=c;vm.createContext(c);
vm.runInContext(fs.readFileSync('dist/static/js/time-policy.js','utf8'),c);
let engine=fs.readFileSync('dist/static/js/fivearts-engine.js','utf8').replace('k0.kot=Vr;','k0.kot=Vr;window.__kot=Vr;window.__resources=_u;window.__aliases=Rr.STAR_ALIASES;');
vm.runInContext(engine,c);vm.runInContext(fs.readFileSync('dist/static/js/ziwei-flow-data.js','utf8'),c);
const e=c.FiveArtsEngine,plain=v=>JSON.parse(JSON.stringify(v)),fixtures=require('./fixtures/ziwei-flow-baseline.json');
test('反向查词索引保留全部语言资源、类型过滤、别名和首次匹配语义',()=>{
 const original=Function('_u','Rr','return ('+fs.readFileSync('tests/fixtures/ziwei-kot-original.txt','utf8')+')')(c.__resources,{STAR_ALIASES:c.__aliases});
 const values=new Set(Object.values(c.__resources).flatMap(r=>Object.values(r.translation)));for(const k of Object.keys(c.__aliases))values.add(k);values.add('不存在的星曜');values.add(null);values.add(0);
 for(const value of values)for(const filter of [undefined,'','Star','Heavenly','Earthly'])assert.equal(c.__kot(value,filter),original(value,filter),String(value)+' '+filter);
});
test('100组优化前运限干支与四化输出完全一致，含晚子时、闰月和跨年',()=>{
 for(const f of fixtures){let r=e.ziwei(f.birth,f.sex,{earlyLate:f.earlyLate});assert.deepEqual(plain(e.transformations(r.chart,0)),f.transforms);for(const row of f.samples){let g=e.ziweiFlowGanzhi(row.date,row.hour,r.flowRules);assert.equal(g.yearly.join(''),row.year);assert.equal(g.daily.join(''),row.day);assert.equal(g.hourly.join(''),row.time);}}
});
test('分层运限列表与旧版完整运限生成的显示内容一致',()=>{
 const reference=Function('E','getCachedHoroscope',fs.readFileSync('tests/fixtures/ziwei-flow-render-original.txt','utf8')+';return originalFlows;')(e,(chart,date,hour)=>chart.horoscope(date,hour));
 function normalize(data){return plain({year:data.year,day:data.day,rows:data.rows.map(row=>({scope:row.scope,label:row.label,items:row.items.map(item=>{let x={};for(const k of ['label','gz','date','year','index','hour','dayNum','current'])if(k in item)x[k]=item[k];return x;})}))});}
 for(const f of fixtures){let r=e.ziwei(f.birth,f.sex,{earlyLate:f.earlyLate});for(const date of ['2025-01-28','2025-01-29','2025-07-25','2025-08-22','2026-10-29'])for(const hour of [0,12])for(const full of [true,false]){
  let expected=reference.call({flowDate:date,flowHour:hour},null,r,full);delete r.chart._cachedFlowRows;let actual=c.WZBZFlowData.get(r.chart,date,hour,full,r.flowRules);assert.deepEqual(normalize(actual),normalize(expected),date+' '+hour+' '+full);
 }}
});
test('同年列表复用年度数据、不重复调用完整horoscope，缓存有界且不串盘',()=>{
 const a=e.ziwei('1990-05-15 10:30','男'),b=e.ziwei('1995-08-22 14:15','女');c.WZBZFlowData.get(a.chart,'2026-10-01',0,true,a.flowRules);a.chart.horoscope=()=>{throw Error('unexpected full horoscope')};
 for(let day=1;day<=40;day++){let date=new Date(Date.UTC(2026,9,day)).toISOString().slice(0,10);c.WZBZFlowData.get(a.chart,date,0,true,a.flowRules);}
 let stats=c.WZBZFlowData.stats(a.chart);assert.ok(stats.hourly<=16&&stats.daily<=6&&stats.years<=4&&stats.yearly<=4);assert.equal(c.WZBZFlowData.stats(b.chart),null);
});
test('预热只挂载相邻一盘，空闲预算不足时让出主线程',()=>{
 const s=fs.readFileSync('dist/static/js/fivearts-ui.js','utf8'),start=s.indexOf('        prepareNextPane: function()'),end=s.indexOf('        settleSlide:',start),fn=s.slice(start,end).trim().replace(/^prepareNextPane: /,'').replace(/,$/,'');
 let timeout,idle,ctx={global:{requestIdleCallback:f=>{idle=f;return 1},cancelIdleCallback(){}},document:{hidden:false},ui:{preferences:{order:['bazi','ziwei','qimen','liuyao','meihua']}},V:{set(o,k,v){o[k]=v}},setTimeout:f=>{timeout=f;return 1},clearTimeout(){}};vm.createContext(ctx);const prepare=vm.runInContext('('+fn+')',ctx),host={session:{},active:'bazi',renderedTabs:{bazi:true}};host.prepareNextPane=()=>prepare.call(host);
 host.prepareNextPane();timeout();idle({timeRemaining:()=>1});assert.deepEqual(Object.keys(host.renderedTabs),['bazi']);timeout();idle({timeRemaining:()=>50});assert.deepEqual(Object.keys(host.renderedTabs),['bazi','ziwei']);
});
