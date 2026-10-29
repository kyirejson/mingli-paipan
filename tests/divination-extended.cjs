const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const c = { console, Date, Intl, Math, JSON, Map, Set }; c.window = c; vm.createContext(c);
for (const f of ['dist/static/js/time-policy.js','dist/static/js/fivearts-engine.js', 'dist/static/js/divination-calendar-fix.js']) vm.runInContext(fs.readFileSync(f, 'utf8'), c);
const e = c.FiveArtsEngine;
const branches = '子丑寅卯辰巳午未申酉戌亥';
function refs(dayGan, dayZhi, monthZhi, yearZhi) {
  const r = {calendar: {dayGan, dayZhi, eight: {getMonthZhi: () => monthZhi}, lunar: {getYearZhi: () => yearZhi}}, rows: [{shi:'世', yang:true, index:1, branch:'子'}]};
  return Object.fromEntries(e.liuyaoReferences(r).map(x => [x.name, x.value]));
}
test('贵人、禄神、驿马、咸池、劫煞和亡神逐干逐支对照古籍', () => {
  const noble = ['丑未','子申','亥酉','亥酉','丑未','子申','寅午','寅午','卯巳','卯巳'];
  const salary = '寅卯巳午巳午申酉亥子';
  const horse = {申:'寅',子:'寅',辰:'寅',巳:'亥',酉:'亥',丑:'亥',寅:'申',午:'申',戌:'申',亥:'巳',卯:'巳',未:'巳'};
  const peach = {申:'酉',子:'酉',辰:'酉',巳:'午',酉:'午',丑:'午',寅:'卯',午:'卯',戌:'卯',亥:'子',卯:'子',未:'子'};
  const robbery = {申:'巳',子:'巳',辰:'巳',巳:'寅',酉:'寅',丑:'寅',寅:'亥',午:'亥',戌:'亥',亥:'申',卯:'申',未:'申'};
  const loss = {申:'亥',子:'亥',辰:'亥',巳:'申',酉:'申',丑:'申',寅:'巳',午:'巳',戌:'巳',亥:'寅',卯:'寅',未:'寅'};
  for (const [i, gan] of Array.from('甲乙丙丁戊己庚辛壬癸').entries()) for (const zhi of branches) {
    let a=refs(gan,zhi,'寅','子');
    assert.equal(a['天乙贵人'],noble[i],gan); assert.equal(a['禄神'],salary[i],gan);
    assert.equal(a['驿马'],horse[zhi],zhi); assert.equal(a['咸池（桃花）'],peach[zhi],zhi);
    assert.equal(a['劫煞'],robbery[zhi],zhi); assert.equal(a['亡神'],loss[zhi],zhi);
  }
});
test('按月建四季天喜、天德、月德及农历年支红鸾天喜逐支核对', () => {
  const happySeason={寅:'戌',卯:'戌',辰:'戌',巳:'丑',午:'丑',未:'丑',申:'辰',酉:'辰',戌:'辰',亥:'未',子:'未',丑:'未'};
  const heavenly={寅:'丁',卯:'申',辰:'壬',巳:'辛',午:'亥',未:'甲',申:'癸',酉:'寅',戌:'丙',亥:'乙',子:'巳',丑:'庚'};
  const monthly={寅:'丙',午:'丙',戌:'丙',申:'壬',子:'壬',辰:'壬',亥:'甲',卯:'甲',未:'甲',巳:'庚',酉:'庚',丑:'庚'};
  const red='卯寅丑子亥戌酉申未午巳辰',happy='酉申未午巳辰卯寅丑子亥戌';
  for (const month of branches) for (const [i, year] of Array.from(branches).entries()) {
    let a=refs('甲','子',month,year);
    assert.equal(a['天喜（季）'],happySeason[month],month); assert.equal(a['天德'],heavenly[month],month);
    assert.equal(a['月德'],monthly[month],month); assert.equal(a['红鸾'],red[i],year);assert.equal(a['天喜（年）'],happy[i],year);
  }
});
test('2025 十二次月建交节前后：参考日本国立天文台换算为北京时间', () => {
  // National Astronomical Observatory of Japan reports JST (UTC+9), rounded to minutes.
  // Offset to Beijing and check two minutes either side of each published time.
  const data=[['01-05T10:33','丑'],['02-03T22:10','寅'],['03-05T16:07','卯'],['04-04T20:49','辰'],['05-05T13:57','巳'],['06-05T17:57','午'],['07-07T04:05','未'],['08-07T13:52','申'],['09-07T16:52','酉'],['10-08T08:41','戌'],['11-07T12:04','亥'],['12-07T05:05','子']];
  for(const [moment,afterBranch] of data){
    const ms=Date.parse('2025-'+moment+':00Z');
    function t(offset){return new Date(ms+offset*60000).toISOString().slice(0,16).replace('T',' ')}
    const before=e.liuyao(t(-2),{method:'time'}),after=e.liuyao(t(2),{method:'time'});
    const i=branches.indexOf(afterBranch),prev=branches[(i+11)%12];
    assert.equal(before.calendar.eight.getMonthZhi(),prev,moment+' before');assert.equal(after.calendar.eight.getMonthZhi(),afterBranch,moment+' after');
    assert.equal(e.liuyaoAnnotations(before).month,prev);assert.equal(e.liuyaoAnnotations(after).month,afterBranch);
    assert.equal(e.meihua(t(-2),{method:'time'}).calendar.eight.getMonthZhi(),prev);
    assert.equal(e.meihua(t(2),{method:'time'}).calendar.eight.getMonthZhi(),afterBranch);
  }
});
test('春节后立春前明确区分农历年支与节气年柱',()=>{
  const r=e.liuyao('2025-01-29 12:00',{method:'time'}),a=Object.fromEntries(e.liuyaoReferences(r).map(x=>[x.name,x.value]));
  assert.equal(r.calendar.pillars[0],'甲辰');assert.equal(r.calendar.lunar.getYearZhi(),'巳');
  assert.equal(a['红鸾'],'戌');assert.equal(a['天喜（年）'],'辰');
});
test('60 日轮次的日柱与旬空逐日对照已知日柱',()=>{
  const stems='甲乙丙丁戊己庚辛壬癸', empty=['戌亥','申酉','午未','辰巳','寅卯','子丑'];
  // HKO 2025 almanac: January 29 is 戊戌 (cycle index 34).
  for(let d=0;d<60;d++){
    let date=new Date(Date.UTC(2025,0,29+d,12)).toISOString().slice(0,16).replace('T',' '),index=(34+d)%60;
    let r=e.liuyao(date,{method:'time'}),expected=stems[index%10]+branches[index%12];
    assert.equal(r.calendar.pillars[2],expected,date);assert.equal(r.calendar.dayVoid,empty[Math.floor(index/10)],date);
    assert.equal(e.meihua(date,{method:'time'}).calendar.dayVoid,empty[Math.floor(index/10)],date);
  }
});
