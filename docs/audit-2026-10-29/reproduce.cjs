// Read-only reproductions. Run from the project root.
const fs=require('node:fs'),vm=require('node:vm');
const snapshot=require('./snapshot.json'),crypto=require('node:crypto');
if(Object.entries(snapshot.source_hashes).some(([file,hash])=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==hash)){
 console.error('此复现脚本只适用于审计时的旧代码；当前代码已经整改。整改验证请运行 npm test，并查看 docs/2026-10-29_整改进展.md。');
 process.exit(2);
}
const root='dist/static/js/', c={console,Date,Intl,Math,JSON,Map,Set}; c.window=c;vm.createContext(c);
for(const p of ['time-policy.js','fivearts-engine.js','divination-calendar-fix.js'])vm.runInContext(fs.readFileSync(root+p,'utf8'),c);
const e=c.FiveArtsEngine, date='2026-10-29 23:30';
const results={lateZi:{}};
for(const k of ['calendar','qimen','liuyao','meihua']){const r=e[k](date),cal=r.calendar||r;results.lateZi[k]={pillars:Array.from(cal.pillars),hourVoid:cal.hourVoid,activeGz:r.activeGz};}
// Run the exact application function with a failed persistence result.
const uiText=fs.readFileSync(root+'fivearts-ui.js','utf8').replace(/\r\n/g,'\n');
const fn=uiText.match(/  function applyMethod\(\) \{[\s\S]*?\n  \}\n  function methodLabel/)[0].replace(/\n  function methodLabel$/,'');
const notices=[],fake={ui:{popup:'liuyao',editor:{time:'2026-10-29 12:00'},scope:{modules:{},revision:0}},clone:x=>JSON.parse(JSON.stringify(x)),E:{parseTime(){},liuyao(){}},V:{set(o,k,v){o[k]=v}},saveSession(){return false},closeModal(){fake.closed=true},notify:t=>notices.push(t),NAMES:{liuyao:'六爻'}};
vm.createContext(fake);vm.runInContext(fn+';applyMethod();',fake);
results.failedSave={saveSessionReturned:false,modalClosed:fake.closed,notices};
const resultBody=uiText.match(/        result: function\(type\) \{[\s\S]*?\n        \},\n        slideTo/)[0].replace(/^        result: /,'').replace(/,\n        slideTo$/,'');
const timeContext={E:{ziwei(time){return {receivedTime:time}}},NAMES:{}};vm.createContext(timeContext);
const calculate=vm.runInContext('('+resultBody+')',timeContext);
const host={session:{baseTime:'2000-01-01 00:30',sex:1,modules:{}},owner:{infoData:{unknowhour:0,solarTime:'2000-01-01 00:30',sunTime:'1999-12-31 23:00'}},_cache:new Map()};
results.ziweiTimeSource={clockTime:host.owner.infoData.solarTime,displayedTrueSolarTime:host.owner.infoData.sunTime,engineInput:calculate.call(host,'ziwei').receivedTime,note:'Isolated source-function reproduction, not an end-to-end location-setting test.'};
const bridge=fs.readFileSync(root+'wzbz-native-bridge.js','utf8');
const literal=bridge.match(/var MINGREN_CSV = ("[^\n]*");/)[1];
const rows=vm.runInNewContext(literal).split(/[\r\n]+/).filter(Boolean).map(x=>x.split(','));
results.famousCases={total:rows.length,futureYears:rows.filter(x=>Number(x[3].slice(0,4))>2026).map(x=>({name:x[0],time:x[3],era:x[6]}))};
console.log(JSON.stringify(results,null,2));
