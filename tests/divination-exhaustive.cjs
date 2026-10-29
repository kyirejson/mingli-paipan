const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={console,Date,Intl,Math,JSON,Map,Set};c.window=c;vm.createContext(c);
for(const file of ['dist/static/js/time-policy.js','dist/static/js/fivearts-engine.js','dist/static/js/divination-calendar-fix.js','dist/static/js/fivearts-readings.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
const e=c.FiveArtsEngine,day='2026-10-29 12:00';
const tri=[['乾',7,'金'],['兑',3,'金'],['离',5,'火'],['震',1,'木'],['巽',6,'木'],['坎',2,'水'],['艮',4,'土'],['坤',0,'土']];
const name=bits=>tri.find(x=>x[1]===bits)[0];
function bitsOfLines(lines){return lines.reduce((sum,bit,i)=>sum+(bit<<i),0)}

test('古籍观梅与牡丹占：真实时间输入到完整卦象',()=>{
 for(const [date,main,mutual,changed,moving,ti,yong] of [
  ['2025-01-16 16:00','泽火革','天风姤','泽山咸',1,'兑','离'],
  ['2025-04-13 06:00','天风姤','乾为天','火风鼎',5,'巽','乾']]){
  let r=e.meihua(date,{method:'time'});assert.deepEqual([r.main.name,r.mutual.name,r.changed.name,r.moving,r.ti.name,r.yong.name],[main,mutual,changed,moving,ti,yong]);
 }
});
test('农历新年与闰六月边界：两种时间卦使用同一农历取数',()=>{
 // Lunar dates are checked against the Hong Kong Observatory 2025 almanac.
 // Leap month uses its numbered month, not the following month.
 for(const [date,lunar,main,changed,moving] of [
  ['2025-01-28 12:00','二〇二四年腊月廿九','水风井','地风升',5],
  ['2025-01-29 12:00','二〇二五年正月初一','地山谦','坤为地',3],
  ['2025-07-24 12:00','二〇二五年六月三十','泽天夬','泽风大过',1],
  ['2025-07-25 12:00','二〇二五年闰六月初一','风雷益','风泽中孚',2]]){
  let m=e.meihua(date,{method:'time'}),l=e.liuyao(date,{method:'time'});
  for(const r of [m,l]){assert.equal(r.calendar.lunar.toString(),lunar);assert.equal(r.main.name,main);assert.equal(r.changed.name,changed)}
  assert.equal(m.moving,moving);assert.deepEqual(Array.from(l.moving),[moving]);
 }
});
test('梅花 64 本卦 × 6 动爻：本互变综错及体用',()=>{
 for(let upper=1;upper<=8;upper++)for(let lower=1;lower<=8;lower++)for(let move=1;move<=6;move++){
  let value=tri[lower-1][1]+8*tri[upper-1][1],r=e.meihua(day,{method:'specified',upper,lower,moving:[move]});
  let lines=Array.from({length:6},(_,i)=>value>>i&1),mutual=lines[1]+2*lines[2]+4*lines[3]+8*lines[2]+16*lines[3]+32*lines[4];
  assert.equal(r.main.value,value);assert.equal(r.mutual.value,mutual);assert.equal(r.changed.value,value^(1<<(move-1)));assert.equal(r.opposite.value,value^63);
  assert.equal(r.reverse.value,bitsOfLines(lines.slice().reverse()));assert.equal(r.ti.name,tri[move<=3?upper-1:lower-1][0]);assert.equal(r.yong.name,tri[move<=3?lower-1:upper-1][0]);
 }
});
test('六爻 64 本卦 × 64 动爻集合：指定与铜钱输入一致',()=>{
 const codes=[8,7,6,9];
 for(let value=0;value<64;value++)for(let mask=0;mask<64;mask++){
  let lower=tri.findIndex(t=>t[1]===(value&7))+1,upper=tri.findIndex(t=>t[1]===(value>>3))+1;
  let moving=Array.from({length:6},(_,i)=>mask>>i&1?i+1:0).filter(Boolean);
  let coins=Array.from({length:6},(_,i)=>codes[(mask>>i&1)*2+(value>>i&1)]);
  const a=e.liuyao(day,{method:'specified',upper,lower,moving}),b=e.liuyao(day,{method:'coins',coins});
  assert.equal(a.main.value,value);assert.equal(a.changed.value,value^mask);assert.equal(b.main.value,value);assert.equal(b.changed.value,value^mask);
  assert.deepEqual(Array.from(a.moving),moving);assert.deepEqual(Array.from(b.moving),moving);
  for(let i=0;i<6;i++){assert.equal(a.rows[i].ganzhi,b.rows[i].ganzhi);assert.equal(a.rows[i].role,b.rows[i].role);assert.equal(a.changedRows[i].ganzhi,b.changedRows[i].ganzhi)}
 }
});
test('六十四卦解卦资料的卦名和六爻阴阳与排盘一致',()=>{
 const reading=c.FiveArtsReadingsData.hexagrams;
 for(let value=0;value<64;value++){
  let hex=e.hexagram(value),entry=reading[value];assert.equal(entry.name,hex.name);assert.equal(entry.upper,name(value>>3));assert.equal(entry.lower,name(value&7));
  for(let i=0;i<6;i++){let label=entry.lines[i].label;assert.ok(label.includes(hex.lines[i]?'九':'六'),`${hex.name} 第${i+1}爻 ${label}`)}
 }
});
test('动爻重复输入应去重，避免动爻显示与变卦不一致',()=>{
 let r=e.liuyao(day,{method:'specified',upper:2,lower:3,moving:[1,'1',3,'3']});
 assert.deepEqual(Array.from(r.moving),[1,3]);assert.equal(r.changed.value,r.main.value^1^4);
 assert.deepEqual(Array.from(r.rows.filter(x=>x.moving),x=>x.index),[1,3]);
});
test('不完整或越界的输入应拒绝而非生成错误卦',()=>{
 for(const opt of [{method:'coins',coins:['',7,8,9,7,8]},{method:'specified',upper:9,lower:1,moving:[]},{method:'specified',upper:2,lower:3,moving:[7]},{method:'numbers',numberMode:'three',numbers:['2','3','']},{method:'number',phone:'abc'}])
  assert.throws(()=>e.liuyao(day,opt));
 assert.throws(()=>e.meihua(day,{method:'specified',upper:1,lower:1,moving:[]}));
 assert.throws(()=>e.meihua(day,{method:'specified',upper:1,lower:1,moving:[1,2]}));
});
