const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function context(files){let data=new Map(),c={console,Date,Intl,Math,JSON,Map,Set,URL,localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)}};c.window=c;vm.createContext(c);for(let f of files)vm.runInContext(fs.readFileSync('dist/static/js/'+f,'utf8'),c);return {c,data};}
test('公共历法、六爻、梅花和奇门的午夜口径一致，保留子初选项',()=>{
 const {c}=context(['time-policy.js','fivearts-engine.js','divination-calendar-fix.js']),e=c.FiveArtsEngine;
 for(let d=1;d<=60;d++){
  let day=new Date(Date.UTC(2026,9,d)).toISOString().slice(0,10),t=day+' 23:30',a=e.calendar(t);
  for(let mode of ['liuyao','meihua','qimen']){let r=e[mode](t);assert.equal(r.calendar.pillars[3],a.pillars[3]);assert.equal(r.calendar.hourVoid,a.hourVoid);if(mode==='qimen')assert.equal(r.activeGz,a.pillars[3]);}
 }
 let midnight=e.qimen('2026-10-29 23:30',{useZaoWanZiShi:true}),zi=e.qimen('2026-10-29 23:30',{useZaoWanZiShi:false});
 assert.equal(midnight.activeGz,'戊子');assert.equal(midnight.calendar.dayVoid,'申酉');assert.equal(zi.activeGz,'庚子');assert.equal(zi.calendar.pillars[2],'丁丑');assert.equal(zi.calendar.dayBoundary,'zi-start');
 assert.equal(e.calendar('2026-10-30 00:00').pillars[3],'庚子');
});
test('真太阳时跨日后使用实际校正时间，无校正则回退钟表时间',()=>{
 const {c}=context(['time-policy.js']);let p=c.WZBZTimePolicy;
 assert.equal(p.chartTime({sunTime:'1999-12-31 23:00',solarTime:'2000-01-01 00:30'}),'1999-12-31 23:00');assert.equal(p.chartTime({solarTime:'2000-01-01 00:30'}),'2000-01-01 00:30');
});
test('保存失败保留起卦弹窗和旧设置，不报告成功',()=>{
 let s=fs.readFileSync('dist/static/js/fivearts-ui.js','utf8').replace(/\r\n/g,'\n'),fn=s.slice(s.indexOf('  function applyMethod()'),s.indexOf('  function methodLabel'));
 let notices=[],c={ui:{popup:'liuyao',editor:{time:'2026-10-29 12:00',method:'time'},scope:{modules:{liuyao:{method:'coins'}},revision:0}},clone:x=>JSON.parse(JSON.stringify(x)),E:{parseTime(){},liuyao(){}},V:{set(o,k,v){o[k]=v}},saveSession(){return false},closeModal(){throw Error('must keep modal')},notify:t=>notices.push(t),NAMES:{liuyao:'六爻'}};vm.createContext(c);vm.runInContext(fn+'applyMethod();',c);
 assert.match(c.ui.error,/保存失败/);assert.equal(c.ui.scope.modules.liuyao.method,'coins');assert.equal(notices.length,0);assert.equal(c.ui.popup,'liuyao');
});
test('完整备份恢复保留原始记录，不包含登录凭据',()=>{
 let {c,data}=context(['local-backup.js']),b=c.WZBZBackup;
 data.set('wzbz_local_userlist_v14',JSON.stringify([{guid:'case-1',name:'测试'}]));data.set('wzbz_local_notes_v14',JSON.stringify({'case-1':{content:'正文'}}));data.set('wzbz_session','do-not-export');let text=b.exportText();assert.ok(!text.includes('do-not-export'));data.set('wzbz_local_notes_v14','{}');b.restore(text);assert.equal(JSON.parse(data.get('wzbz_local_notes_v14'))['case-1'].content,'正文');assert.equal(data.get('wzbz_session'),'do-not-export');
});
test('不完整备份拒绝导入，写入中断后回滚已经改动的数据',()=>{
 let {c,data}=context(['local-backup.js']),b=c.WZBZBackup;data.set('wzbz_local_userlist_v14','[{"guid":"old"}]');let before=b.exportText(),next=JSON.parse(before);next.data.wzbz_local_userlist_v14='[{"guid":"new"}]';next.data.wzbz_local_notes_v14='{"new":{"content":"note"}}';
 assert.throws(()=>b.restore('{"format":"zaohua-local-backup","version":1,"data":{}}'));assert.deepEqual(JSON.parse(b.exportText()).data,JSON.parse(before).data);
 let original=c.localStorage.setItem,fail=true;c.localStorage.setItem=(k,v)=>{if(k==='wzbz_local_notes_v14'&&fail){fail=false;throw Error('quota')}original(k,v);};assert.throws(()=>b.restore(JSON.stringify(next)),/已还原/);assert.deepEqual(JSON.parse(b.exportText()).data,JSON.parse(before).data);
});
test('结构化笔记与正文一起存草稿，并能恢复到编辑器',()=>{
 let {c,data}=context(['paper-forest-details.js']),p=c.PaperForestDetails;
 function view(){return {noteData:{userGuid:'case-1',content:''},contentVal:'正文',selects:[{name:'职业',type:0,data:''}],selectsX:[],MRType:0,infoData:{},pickers:[]};}
 let v=view();function h(tag,data,children){if(arguments.length===2&&(Array.isArray(data)||typeof data!=='object')){children=data;data={}}return {tag,data,children};}let tree=p.renderNotes.call(v,h),field;
 function walk(n){if(!n)return;if(Array.isArray(n))return n.forEach(walk);if(typeof n!=='object')return;if(n.tag==='textarea'&&n.data.attrs.placeholder==='填写职业')field=n;walk(n.children)}walk(tree);field.data.on.input({target:{value:'教师'}});
 let draft=JSON.parse(data.get('wzbz_note_drafts_v1'))['case-1'];assert.equal(draft.content,'正文');assert.equal(draft.fields.feedback[0].data,'教师');let next=view();p.initNotes.call(next);assert.equal(next.selects[0].data,'教师');assert.equal(next.contentVal,'正文');
});
test('晚子时八字校正同步更新时柱纳音与时干十神，六爻纯化空不重复拼接断语',()=>{
 const {c}=context(['lunar.js','time-policy.js','fivearts-engine.js','divination-calendar-fix.js','fivearts-readings.js','liuyao-reading.js']);
 const solar=c.Solar.fromYmdHms(2026,10,29,23,30,0),eight=solar.getLunar().getEightChar();
 c.WZBZTimePolicy.correctEightChar(solar,eight,true);
 assert.equal(eight.getTime(),'戊子');
 assert.equal(eight.getTimeNaYin(),c.LunarUtil.NAYIN['戊子']);
 assert.equal(eight.getTimeShiShenGan(),c.LunarUtil.SHI_SHEN[eight.getDayGan()+'戊']);
 const r=c.LiuyaoReading.snapshot(c.FiveArtsEngine.liuyao('2026-10-29 12:00',{method:'specified',upper:1,lower:8,moving:[1,6]}));
 const reading=c.LiuyaoReading.analyze(r,{book:'huangjince',index:1,yongIndex:1},c.FiveArtsReadingsData);
 for(const card of reading.cards){assert.equal(/旬空[^。]*旬空|月破[^。]*月破/.test(card.meaning||''),false);}

});
