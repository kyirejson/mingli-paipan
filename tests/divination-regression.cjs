const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={console,Date,Intl,Math,JSON,Map,Set};c.window=c;vm.createContext(c);
vm.runInContext(fs.readFileSync('dist/static/js/time-policy.js','utf8'),c);
vm.runInContext(fs.readFileSync('dist/static/js/fivearts-engine.js','utf8'),c);
vm.runInContext(fs.readFileSync('dist/static/js/divination-calendar-fix.js','utf8'),c);
const e=c.FiveArtsEngine,day='2026-10-29 12:00',Z='子丑寅卯辰巳午未申酉戌亥',G='甲乙丙丁戊己庚辛壬癸';
const gua=[['乾',7,'金'],['兑',3,'金'],['离',5,'火'],['震',1,'木'],['巽',6,'木'],['坎',2,'水'],['艮',4,'土'],['坤',0,'土']];
const najia={乾:['甲子寅辰','壬午申戌'],坤:['乙未巳卯','癸丑亥酉'],震:['庚子寅辰','庚午申戌'],巽:['辛丑亥酉','辛未巳卯'],坎:['戊寅辰午','戊申戌子'],离:['己卯丑亥','己酉未巳'],艮:['丙辰午申','丙戌子寅'],兑:['丁巳卯丑','丁亥酉未']};
const elem={'子':'水','丑':'土','寅':'木','卯':'木','辰':'土','巳':'火','午':'火','未':'土','申':'金','酉':'金','戌':'土','亥':'水'},five=['木','火','土','金','水'];
function role(p,b){let x=five.indexOf(p),y=five.indexOf(elem[b]);return x===y?'兄弟':(x+1)%5===y?'子孙':(y+1)%5===x?'父母':(x+2)%5===y?'妻财':'官鬼'}
function expectedPalaces(){let all={};for(const [name,bits,element] of gua){let v=bits|(bits<<3);let values=[v];for(let i=0;i<5;i++){v^=1<<i;values.push(v)}v^=8;values.push(v);v^=7;values.push(v);values.forEach((value,i)=>{assert.equal(all[value],undefined);all[value]={name,element,shi:[6,1,2,3,4,5,4,3][i]}})}return all}
const palace=expectedPalaces();
test('观梅占：泽火革初爻动，互天风姤，变泽山咸',()=>{let x=e.meihua(day,{method:'specified',upper:2,lower:3,moving:[1]});assert.equal(x.main.name,'泽火革');assert.equal(x.mutual.name,'天风姤');assert.equal(x.changed.name,'泽山咸');assert.equal(x.ti.name,'兑');assert.equal(x.yong.name,'离')});
test('艮为山与山地剥按古籍艮卦阳支顺行纳甲',()=>{
 let gen=e.liuyao(day,{method:'specified',upper:7,lower:7,moving:[]});
 assert.deepEqual(Array.from(gen.rows,r=>r.ganzhi),['丙辰','丙午','丙申','丙戌','丙子','丙寅']);
 let bo=e.liuyao(day,{method:'specified',upper:7,lower:8,moving:[]});
 assert.equal(bo.main.name,'山地剥');assert.deepEqual(Array.from(bo.rows,r=>r.ganzhi),['乙未','乙巳','乙卯','丙戌','丙子','丙寅']);
 assert.deepEqual(Array.from(bo.rows,r=>r.role),['父母','官鬼','妻财','父母','子孙','妻财']);
});
test('六十四卦各宫、世应、纳甲、六亲及单爻变卦',()=>{
 for(let upper=1;upper<=8;upper++)for(let lower=1;lower<=8;lower++)for(let moving=1;moving<=6;moving++){
  let x=e.liuyao(day,{method:'specified',upper,lower,moving:[moving]});let value=(gua[upper-1][1]<<3)|gua[lower-1][1],p=palace[value];
  assert.equal(x.main.value,value);assert.equal(x.changed.value,value^(1<<(moving-1)));assert.equal(x.main.palace.trigram,p.name);assert.equal(x.main.palace.shi,p.shi);
  x.rows.forEach((row,i)=>{let trigram=gua[i<3?lower-1:upper-1][0],table=najia[trigram][i<3?0:1],branch=table[1+i%3];assert.equal(row.ganzhi,table[0]+branch);assert.equal(row.role,role(p.element,branch));assert.equal(row.shi,i+1===p.shi?'世':i+1===(p.shi+2)%6+1?'应':'');assert.equal(row.moving,i+1===moving)});
  const changedValue=value^(1<<(moving-1)),changedLower=gua.find(g=>g[1]===(changedValue&7))[0],changedUpper=gua.find(g=>g[1]===(changedValue>>3))[0];
  x.changedRows.forEach((row,i)=>{let table=najia[i<3?changedLower:changedUpper][i<3?0:1],branch=table[1+i%3];assert.equal(row.ganzhi,table[0]+branch);assert.equal(row.role,role(p.element,branch))});
  const present=new Set(x.rows.map(r=>r.role));x.rows.forEach((row,i)=>{let table=najia[p.name][i<3?0:1],branch=table[1+i%3],hiddenRole=role(p.element,branch);if(present.has(hiddenRole))assert.equal(row.hidden,null);else {assert.equal(row.hidden.ganzhi,table[0]+branch);assert.equal(row.hidden.role,hiddenRole)}});
 }
});
test('铜钱从初爻到上爻录入，老阴老阳变化',()=>{let x=e.liuyao(day,{method:'coins',coins:[6,7,8,9,7,8]});assert.deepEqual(Array.from(x.main.lines),[0,1,0,1,1,0]);assert.deepEqual(Array.from(x.moving),[1,4]);assert.equal(x.changed.value,x.main.value^1^8)});
test('无动爻与多动爻按各爻阴阳独立变化',()=>{for(const moving of [[],[1,3,6],[1,2,3,4,5,6]]){let x=e.liuyao(day,{method:'specified',upper:1,lower:8,moving});let expected=moving.reduce((v,n)=>v^(1<<(n-1)),x.main.value);assert.equal(x.changed.value,expected);assert.deepEqual(Array.from(x.moving),moving)}});
test('六神从日干对应的初爻开始顺序排布',()=>{const gods=['青龙','朱雀','勾陈','螣蛇','白虎','玄武'],start=[0,0,1,1,2,3,4,4,5,5],found=new Set();for(let i=1;i<=15;i++){let date=`2026-10-${String(i).padStart(2,'0')} 12:00`,r=e.liuyao(date,{method:'time'}),index=G.indexOf(r.calendar.dayGan);found.add(index);for(let n=0;n<6;n++)assert.equal(r.rows[n].god,gods[(start[index]+n)%6])}assert.equal(found.size,10)});
test('三数起卦整除时按坤卦、上爻处理',()=>{let x=e.meihua(day,{method:'numbers',numberMode:'three',numbers:[8,16,12]});assert.equal(x.main.upper.name,'坤');assert.equal(x.main.lower.name,'坤');assert.equal(x.moving,6)});
test('双数、单数、号码、汉字、随机和终身起卦取数',()=>{
 const l=e.calendar(day).lunar,h=Z.indexOf(l.getTimeZhi())+1,mod=(n,m)=>(n-1)%m+1;
 const cases=[
  [{method:'numbers',numberMode:'two',numbers:[5,3],addHour:true},5,3,5+3+h],
  [{method:'single',numbers:[5]},5,5+h,5+h],
  [{method:'number',phone:'12345678901'},15,31,46],
  [{method:'text',text:'山水'},3,4,7],
  [{method:'random',randomNumbers:[9,10,11]},9,10,11],
  [{method:'lifetime'},G.indexOf(l.getYearGan())+1+Math.abs(l.getMonth())+l.getDay(),null,null]
 ];
 for(const [opt,up,down,move] of cases){let x=e.meihua(day,opt),lo=down===null?up+h:down,m=move===null?up+h:move;assert.equal(x.main.upper.name,gua[mod(up,8)-1][0]);assert.equal(x.main.lower.name,gua[mod(lo,8)-1][0]);assert.equal(x.moving,mod(m,6))}
});
test('时间卦按农历年月日和时支取数，零余数归八或六',()=>{for(const date of ['2026-10-29 12:00','2024-02-10 00:05','2025-08-10 23:30','2000-01-01 06:00']){let x=e.meihua(date,{method:'time'}),l=x.calendar.lunar,sum=Z.indexOf(l.getYearZhi())+1+Math.abs(l.getMonth())+l.getDay(),hour=Z.indexOf(l.getTimeZhi())+1;assert.equal(x.main.upper.name,gua[(sum-1)%8][0]);assert.equal(x.main.lower.name,gua[(sum+hour-1)%8][0]);assert.equal(x.moving,(sum+hour-1)%6+1)}});
test('晚子时统一按当天日干推子时干及旬空',()=>{for(let i=1;i<=20;i++)for(const mode of ['liuyao','meihua']){let x=e[mode](`2026-10-${String(i).padStart(2,'0')} 23:30`,{method:'time'}),cal=x.calendar,expected=G[(G.indexOf(cal.dayGan)%5)*2]+'子';assert.equal(cal.pillars[3],expected);assert.equal(cal.eight.getTime(),expected);assert.equal(cal.hourVoid,e.LunarUtil.getXunKong(expected));assert.equal(cal.eight.getTimeXunKong(),cal.hourVoid)}});
