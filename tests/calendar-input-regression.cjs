const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={console,Date,Intl,Math,JSON,Map,Set,Promise,setTimeout};c.window=c;vm.createContext(c);for(const file of ['lunar.js','time-policy.js','bazi-reverse.js','calendar-input.js','wzbz-home-clock.js'])vm.runInContext(fs.readFileSync('dist/static/js/'+file,'utf8'),c);
const input=c.WZBZCalendarInput,reverse=c.WZBZBaziReverse,plain=x=>JSON.parse(JSON.stringify(x));
test('四柱本地反查保留官方例子，并能查到未来 2099 年',async()=>{
 const example=await reverse.search('丙辰 丁酉 丙子 甲午',{minYear:1900,maxYear:2026,midnight:true});assert.deepEqual(plain(example),['1976-09-21 12:00:00','1916-10-06 12:00:00']);
 const solar=c.Solar.fromYmdHms(2099,12,15,12,0,0),pillars=reverse.pillars(solar,true);assert.ok((await reverse.search(pillars.join(''),{minYear:2099,maxYear:2099,midnight:true})).includes('2099-12-15 12:00:00'));
 const report=await reverse.search('丙午戊戌丙子甲午',{minYear:1801,maxYear:2099,midnight:true});assert.ok(report.includes('2026-10-29 12:00:00'));assert.ok(report.includes('2086-10-14 12:00:00'));
});
test('正排反查往返：早晚子时、闰年、春节、节气、历史及未来日期逐项一致',async()=>{
 for(const [y,m,d] of [[1850,6,15],[1900,2,28],[2000,2,29],[2023,3,22],[2024,2,29],[2025,1,29],[2026,2,4],[2026,10,29],[2099,12,15]])for(const hour of [0,1,12,22,23])for(const midnight of [true,false]){
  const solar=c.Solar.fromYmdHms(y,m,d,hour,30,0),target=reverse.pillars(solar,midnight),results=await reverse.search(target.join(''),{minYear:y,maxYear:y,midnight});
  assert.ok(results.some(x=>x.slice(0,10)===solar.toYmd()&&(hour===23?x.slice(11,13)==='23':hour===0?x.slice(11,13)==='00':Math.floor((Number(x.slice(11,13))+1)/2)===Math.floor((hour+1)/2))),solar.toYmdHms()+' '+midnight+' '+results);
  for(const result of results){const parts=result.split(/[- :]/).map(Number),candidate=c.Solar.fromYmdHms(...parts);assert.deepEqual(plain(reverse.pillars(candidate,midnight)),plain(target),result);}
 }
});
test('四柱缺失、非法干支和错误范围被拒绝；不符合年上起月的组合无匹配',async()=>{
 await assert.rejects(reverse.search('甲子乙丑'),/补全/);await assert.rejects(reverse.search('甲丑乙丑甲子甲子'),/无效/);await assert.rejects(reverse.search('甲子丙寅甲子甲子',{minYear:2100,maxYear:2101}),/范围/);
 assert.deepEqual(plain(await reverse.search('甲子甲寅甲子甲子')),[]);
});
test('节气交接前后和精确交接时刻，候选日期仍满足原四柱',async()=>{
 for(const name of ['立春','惊蛰','立冬']){
  const term=c.Lunar.fromYmd(2026,1,1).getJieQiTable()[name];
  for(const solar of [term.nextHour(-1),term,term.nextHour(1)]){
   const target=reverse.pillars(solar,true),results=await reverse.search(target.join(''),{minYear:solar.getYear(),maxYear:solar.getYear(),midnight:true});
   assert.ok(results.some(value=>value.slice(0,10)===solar.toYmd()),name+' '+solar.toYmdHms());
   for(const value of results)assert.deepEqual(plain(reverse.pillars(c.Solar.fromYmdHms(...value.split(/[- :]/).map(Number)),true)),plain(target));
  }
 }
});
test('公历输入拒绝日期溢出，闰年和 1 至 99 年不被自动改成 1900 年',()=>{
 for(const text of ['2025-02-29 12:00','2025-02-31 12:00','1900-02-29 12:00','2026-13-01 12:00','2026-01-01 24:00','2026-01-01 12:60'])assert.throws(()=>input.parseSolar(text),undefined,text);
 assert.equal(input.parseSolar('2000-02-29 12:00').solar.toYmd(),'2000-02-29');assert.equal(input.parseSolar('0099-02-01 12:00').date.getFullYear(),99);
});
function view(values,lunar){const picker={values:values.slice(),getValues(){return this.values},setIndexes(indexes){this.values=indexes.map((i,j)=>(lunar?v.lunars:v.solars)[j].values[i]);}},v={datetimeData:{},isUpdatedArr:[true,true,true],YearStartForPicker:1,$set(o,k,value){o[k]=value},$nextTick(){return Promise.resolve()},$refs:{}};v.$refs[lunar?'lunarBox':'solarBox']={$refs:{pickerRef:picker}};return {v,picker};}
test('公历切换月份将 31 日限制到合法月末，并保留小时分钟',async()=>{
 const {v,picker}=view(['2024','02','31','14','37'],false);v.solars=[{values:Array.from({length:2099},(_,i)=>i+1)},{values:Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0'))},{values:[]},{values:['未知',...Array.from({length:24},(_,i)=>String(i).padStart(2,'0'))]},{values:['未知',...Array.from({length:60},(_,i)=>String(i).padStart(2,'0'))]}];
 await input.changeSolar(v,picker,picker.getValues(),1);assert.equal(input.confirmSolar(v).value,'2024-02-29 14:37');assert.equal(v.curBirthday.getMonth(),1);assert.equal(v.datetimeData.error,'');
});
test('农历换年保留月份名称，闰月不存在时退回同名普通月',async()=>{
 const {v,picker}=view([2024,'闰二月','初一','10','20'],true);v.buildLunarMonthList=year=>Array.from({length:12},(_,i)=>({name:c.LunarUtil.MONTH[i+1]+'月'})).flatMap((m,i)=>year===2023&&i===1?[m,{name:'闰二月'}]:[m]);
 v.lunars=[{values:Array.from({length:2099},(_,i)=>i+1)},{values:[]},{values:[]},{values:['未知',...Array.from({length:24},(_,i)=>String(i).padStart(2,'0'))]},{values:['未知',...Array.from({length:60},(_,i)=>String(i).padStart(2,'0'))]}];
 await input.changeLunar(v,picker,picker.getValues(),0);assert.equal(picker.getValues()[1],'二月');assert.equal(input.confirmLunar(v).date.getMonth(),2);
 picker.values=[2023,'三月','初一','10','20'];await input.changeLunar(v,picker,picker.getValues(),0);assert.equal(picker.getValues()[1],'三月');
 picker.values=[2023,'闰二月','初一','10','20'];await input.changeLunar(v,picker,picker.getValues(),1);assert.equal(input.confirmLunar(v).date.getFullYear(),2023);assert.equal(input.confirmLunar(v).date.getMonth(),2);assert.equal(input.confirmLunar(v).date.getDate(),22);
});
test('农历小月不显示不存在的三十日，自动限制到廿九并保留分钟',async()=>{
 let month=1;while(c.LunarMonth.fromYm(2024,month).getDayCount()!==29)month++;
 const name=c.LunarUtil.MONTH[month]+'月',{v,picker}=view([2024,name,'三十','10','20'],true);v.buildLunarMonthList=()=>Array.from({length:12},(_,i)=>({name:c.LunarUtil.MONTH[i+1]+'月'}));
 v.lunars=[{values:Array.from({length:2099},(_,i)=>i+1)},{values:[]},{values:[]},{values:['未知',...Array.from({length:24},(_,i)=>String(i).padStart(2,'0'))]},{values:['未知',...Array.from({length:60},(_,i)=>String(i).padStart(2,'0'))]}];
 await input.changeLunar(v,picker,picker.getValues(),1);assert.equal(picker.getValues()[2],'廿九');assert.match(input.confirmLunar(v).value,/廿九 10:20$/);
});
test('四柱输入完整但未选日期时，明确提示选择日期；无结果不再提示未填四柱',()=>{
 const box={sizhuList:'丙午戊戌丙子甲午'.split('').map(value=>({value})),datetimeList:[{solar:'2026-10-29 12:00:00'}],datetimeIndex:-1,isFenZhuOpen:false},v={datetimeData:{},$refs:{sizhuBox:box},$set(o,k,x){o[k]=x}};
 assert.equal(input.confirmSizhu(v),false);assert.match(v.datetimeData.error,/四柱已填完整/);box.datetimeIndex=0;assert.equal(input.confirmSizhu(v).date.getFullYear(),2026);box.datetimeList=[];assert.equal(input.confirmSizhu(v),false);assert.match(v.datetimeData.error,/没有匹配日期/);
});
test('未知时辰保持未知标记，未被显示为已知的零点',()=>{
 const {v}=view(['2024','02','29','未知','未知'],false);const solar=input.confirmSolar(v);assert.equal(solar.unknowhour,1);assert.equal(solar.value,'2024-02-29 时辰未知');assert.equal(solar.date.getHours(),0);
 const box={sizhuList:[...'丙午戊戌丙子','未知','未知'].map(value=>({value})),datetimeList:[{solar:'2026-10-29 时辰未知'}],datetimeIndex:0,isFenZhuOpen:false,setting_midnight:true};v.$refs.sizhuBox=box;const result=input.confirmSizhu(v);assert.equal(result.unknowhour,1);assert.match(result.sizhu,/时辰未知/);
});
test('取消历法选择恢复已确认标签和时间，清除未确认的临时显示',()=>{
 const date=new Date(2000,0,1),v={datetimeData:{index:2,index_real:0,data:date,error:'test'},curTabIndex:2,isUpdatedArr:[true,true,true],$set(o,k,x){o[k]=x},onClose(){this.closed=true}};input.close(v);assert.equal(v.datetimeData.index,0);assert.equal(v.curBirthday,date);assert.deepEqual(v.isUpdatedArr,[false,false,false]);assert.equal(v.closed,true);
});
test('手动时间在异步校正之前锁定，防止时钟覆盖；失败后可以重新确认',async()=>{
 let finish;const v={datetimeData:{isManual:false},showQiYun:true,isConfirmingDatetime:false,$set(o,k,x){o[k]=x},onConfirmDatetime(){this.isConfirmingDatetime=true;return new Promise(resolve=>finish=resolve)}};
 const p=input.confirmForm(v,{});assert.equal(v.datetimeData.isManual,true);assert.equal(await c.WZBZHomeClock.refresh.call(v,true),false);finish();await p;assert.equal(v.isConfirmingDatetime,false);assert.equal(v.datetimeData.confirming,false);
 v.onConfirmDatetime=()=>Promise.reject(Error('network'));await input.confirmForm(v,{});assert.match(v.datetimeData.error,/时间校正失败/);assert.equal(v.isConfirmingDatetime,false);
});
test('命例历法类型允许公历0、农历1、四柱2，拒绝无效类型',()=>{
 const source=fs.readFileSync('dist/static/js/wzbz-native-bridge.js','utf8'),context={window:c,Object,Number,String,Array,Error,VIP_GUID:'test',DIZHI:'子丑寅卯辰巳午未申酉戌亥'.split(''),localError:(code,message)=>Object.assign(Error(message),{localCode:code}),hasOwn:(o,k)=>Object.prototype.hasOwnProperty.call(o,k),localTimestamp:()=>''};vm.createContext(context);
 vm.runInContext(source.slice(source.indexOf('  function flagValue'),source.indexOf('  function guidList'))+source.slice(source.indexOf('  function computeEightCharFromSolarStr'),source.indexOf('  function parsePostData')),context);
 const base={birthDay:'2026-10-29 12:00:00',solarTime:'2026-10-29 12:00:00',sex:1};
 for(const value of [0,1,2,'0','1','2'])assert.equal(context.buildLocalCase({...base,timetype:value},null,'test').timetype,Number(value));
 for(const value of [3,-1,'solar',true,[2]])assert.throws(()=>context.buildLocalCase({...base,timetype:value},null,'test'),/历法类型/);
 assert.equal(context.buildLocalCase({},context.buildLocalCase({...base,timetype:2},null,'test'),'test').timetype,2);
});
