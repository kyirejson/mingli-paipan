const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {setup,chart,add,clean,snapshot}=require('./helpers/ziwei-reading.cjs');
const {c,api,data,loader}=setup();
const row=(x,n)=>api.match(data,x).find(r=>r.name===n);
const result=(x,n,mode='sanhe',other={})=>api.analyse(data,x,{selected:x.palaces.findIndex(p=>p.name===n),mode,...other});
const text=cards=>cards.map(x=>x.title+x.text).join('\n');

test('十二宫、所有单星双星与辅曜资料完整，缺项或重复组合拒绝加载',()=>{
 assert.equal(api.validate(data),data);assert.equal(data.schemaVersion,4);assert.equal(Object.keys(data.profiles).length,14);assert.equal(data.pairs.length,24);
 assert.equal(data.pairs.reduce((n,p)=>n+Object.keys(p.palaces).length,0),288);
 assert.equal(Object.values(data.auxiliary).reduce((n,v)=>n+Object.keys(v).length,0),168);
 for(const mutate of [d=>delete d.profiles['天机']['命宫'],d=>d.pairs.push(d.pairs[0]),d=>d.pairs[0].palaces['夫妻']='',d=>d.hua['财帛']['禄']='',d=>d.sources.dataset.url='javascript:alert(1)']){const bad=clean(data);mutate(bad);assert.throws(()=>api.validate(bad));}
 assert.ok(!('modern'in data));assert.ok(!fs.existsSync('content/ziwei-modern.json'));
});
test('同宫双星才使用专篇，移到别宫会撤回组合释义',()=>{
 const x=add(add(chart(),'财帛','天机'),'财帛','巨门'),a=row(x,'财帛');assert.match(text(a.cards),/消息多|事务多|不止一种/);
 x.palaces.find(p=>p.name==='财帛').majorStars.pop();add(x,'迁移','巨门');const b=row(x,'财帛');assert.ok(!text(b.cards).includes('不止一种'));assert.match(text(b.cards),/脑力|技术/);
});
test('同一组合在不同宫位解释不同事项，旧建议段落退出输出',()=>{
 const a=row(add(add(chart(),'夫妻','天同'),'夫妻','天梁'),'夫妻'),b=row(add(add(chart(),'财帛','天同'),'财帛','天梁'),'财帛');
 assert.match(a.cards[0].text,/关系|照顾/);assert.match(b.cards[0].text,/求财|资源/);assert.notEqual(a.cards[0].text,b.cards[0].text);
 assert.doesNotMatch(text(a.cards.concat(b.cards)),/需要留意与怎样发挥|保持边界|可靠交付/);
});
test('庙陷修正分别附着实际主星；平、利、未知不被当成庙旺',()=>{
 const x=add(add(chart(),'财帛','天同','旺'),'财帛','天梁','陷'),a=row(x,'财帛');
 assert.ok(a.cards.some(p=>p.title==='天同 · 旺'));assert.ok(a.cards.some(p=>p.title.includes('天梁落陷')&&/收入|进账|求财/.test(p.text)));
 for(const brightness of ['平','利','']){const r=row(add(chart(),'财帛','太阳',brightness),'财帛');assert.ok(!r.cards.some(p=>p.technique==='庙旺落陷'));}
});
test('空宫借曜保留对宫位置，不借其辅曜、生年四化和本宫出处',()=>{
 const x=add(add(chart(),'迁移','太阳','庙','禄'),'迁移','禄存','','',true),before=snapshot(x),r=row(x,'命宫');
 assert.equal(r.major.length,0);assert.equal(r.cards[0].technique,'空宫借曜');assert.match(r.cards[0].evidence,/仍在对宫/);assert.equal(r.natal.length,0);assert.equal(r.contexts.length,0);assert.ok(!r.cards.some(p=>p.title.includes('禄存')));assert.equal(snapshot(x),before);
});
test('缺失、重复宫支、残缺星盘与不可能四化不能生成解读',()=>{
 for(const x of [null,{palaces:[]}])assert.equal(api.analyse(data,x,{}),null);
 for(const mutate of [x=>x.palaces[0].earthlyBranch='丑',x=>delete x.palaces[2].minorStars,x=>add(x,'命宫','紫微','','忌'),x=>add(x,'命宫','七杀','','权')]){const x=chart();mutate(x);assert.equal(api.match(data,x).length,0);}
});
test('四化取真实星曜属性，禄存不会冒充化禄',()=>{
 const x=add(chart(),'财帛','禄存','','',true);assert.equal(row(x,'财帛').natal.length,0);
 add(x,'财帛','武曲','庙','禄');let r=row(x,'财帛');assert.equal(r.natal.length,1);assert.match(r.natal[0].text,/执行|经营/);
 x.palaces.find(p=>p.name==='财帛').majorStars[0].mutagen='忌';r=row(x,'财帛');assert.ok(!r.natal.some(p=>p.title.includes('化禄')));assert.match(r.natal[0].text,/周转|回收/);
});
test('同宫禄忌并存才触发合读，不把别宫四化凑成同宫',()=>{
 const x=add(add(chart(),'财帛','天同','旺','禄'),'财帛','太阴','庙','忌');assert.ok(row(x,'财帛').natal.some(p=>p.technique==='四化并存'));
 const s=x.palaces.find(p=>p.name==='财帛').majorStars.pop();x.palaces.find(p=>p.name==='官禄').majorStars.push(s);assert.ok(!row(x,'财帛').natal.some(p=>p.technique==='四化并存'));
});
test('三方与对宫按地支定位，数组反转后不改变关系与命中',()=>{
 const x=add(add(chart(),'财帛','左辅','','',true),'官禄','右弼','','',true);
 const a=result(x,'命宫'),facts=a.relations.map(p=>p.id+':'+p.evidence);assert.ok(a.relations.some(p=>p.title.includes('辅弼会照')));
 x.palaces.reverse();const b=result(x,'命宫');assert.deepEqual(clean(b.relations.map(p=>p.id+':'+p.evidence)),clean(facts));assert.equal(b.current.opposite.name,'迁移');
});
test('夹宫必须分在两侧，单侧聚星和三合会星不能冒充夹拱',()=>{
 const x=add(add(chart(),'兄弟','文昌','','',true),'父母','文曲','','',true);assert.ok(result(x,'命宫').relations.some(p=>p.id==='flank-命宫-文昌'));
 x.palaces.find(p=>p.name==='父母').minorStars=[];add(x,'兄弟','文曲','','',true);assert.ok(!result(x,'命宫').relations.some(p=>p.id.startsWith('flank-命宫')));
});
test('禄马中的化禄与禄存区分，缺天马时不显示；煞忌合参不凭空补煞',()=>{
 const x=add(add(chart(),'财帛','武曲','庙','禄'),'迁移','天马','','',true);assert.ok(result(x,'命宫').relations.some(p=>p.title==='化禄会天马'));
 x.palaces.find(p=>p.name==='迁移').minorStars=[];assert.ok(!result(x,'命宫').relations.some(p=>p.title==='化禄会天马'));
 const y=add(chart(),'财帛','太阴','庙','忌');assert.ok(!result(y,'命宫').relations.some(p=>p.technique==='煞忌合参'));add(y,'迁移','擎羊','','',true);assert.ok(result(y,'命宫').relations.some(p=>p.technique==='煞忌合参'));
});
test('明珠出海采用未空、卯日、亥月，丑宫日月不能误判',()=>{
 const x=chart();const ming=x.palaces.find(p=>p.name==='命宫'),at=x.palaces.find(p=>p.earthlyBranch==='未');[ming.earthlyBranch,at.earthlyBranch]=[at.earthlyBranch,ming.earthlyBranch];
 x.palaces.find(p=>p.earthlyBranch==='卯').majorStars.push({name:'太阳',brightness:'庙'});x.palaces.find(p=>p.earthlyBranch==='亥').majorStars.push({name:'太阴',brightness:'庙'});
 assert.ok(result(x,'命宫').patterns.some(p=>p.title==='明珠出海'));
 x.palaces.forEach(p=>p.majorStars=[]);x.palaces.find(p=>p.earthlyBranch==='丑').majorStars.push({name:'太阳'},{name:'太阴'});assert.ok(!result(x,'命宫').patterns.some(p=>p.title==='明珠出海'));
});
test('君臣有实星条件，移走辅弼撤回；受煞条件与原结构并列保留',()=>{
 const x=add(add(add(chart(),'命宫','紫微','庙'),'命宫','左辅','','',true),'财帛','右弼','','',true);let p=result(x,'命宫').patterns.find(p=>p.title==='君臣庆会');assert.ok(p);
 add(x,'官禄','地空','','',true);add(x,'迁移','地劫','','',true);p=result(x,'命宫').patterns.find(p=>p.title==='君臣庆会');assert.ok(p.breaking.length>0);
 x.palaces.find(p=>p.name==='财帛').minorStars=[];assert.ok(!result(x,'命宫').patterns.some(p=>p.title==='君臣庆会'));
});
test('宫名适配采用上游短名，化禄入财、化权入官可以被识别',()=>{
 const x=add(add(chart(),'财帛','武曲','庙','禄'),'官禄','太阳','旺','权'),names=result(x,'命宫').patterns.map(p=>p.title);assert.ok(names.includes('化禄入财'));assert.ok(names.includes('化权入官'));
});
test('宫干飞化与自化完全来自现有引擎，三合不混入宫干断语',()=>{
 const x=c.FiveArtsEngine.ziwei('2001-01-09 01:29','男').chart,before=snapshot(x);
 assert.equal(result(x,'财帛','sanhe').flights.length,0);
 for(const mode of ['qintian','feixing'])for(const r of api.match(data,x)){
  const view=result(x,r.name,mode);
  for(const f of view.flights){assert.ok(f.text&&!f.text.includes('undefined'));assert.match(f.evidence,/宫干.使.+化[禄权科忌]/);}
 }
 assert.equal(snapshot(x),before);
});
test('离心仅本宫自化、向心仅对宫化入，与其他飞入分开',()=>{
 const x=c.FiveArtsEngine.ziwei('1990-05-15 10:30','男').chart;let selfSeen=0,inSeen=0;
 const rows=api.match(data,x);
 for(const r of rows){for(const f of result(x,r.name,'qintian').flights){const m=/flight-(\d+)-(\d+)-/.exec(f.id),a=rows.find(p=>p.index===+m[1]),b=rows.find(p=>p.index===+m[2]);if(f.technique==='离心自化'){selfSeen++;assert.equal(a.index,b.index);}if(f.technique==='向心自化'){inSeen++;assert.equal((a.branch+6)%12,b.branch);}}}
 assert.ok(selfSeen+inSeen>0);
});
test('运限四化用实际选中层，落宫对应运限宫名，换层后内容变化',()=>{
 const x=c.FiveArtsEngine.ziwei('2001-01-09 01:29','男').chart,h=x.horoscope('2026-11-04',5),rows=api.match(data,x),before=snapshot(x);
 const a=api.flow(data,rows,{flow:h.yearly,flowScope:'yearly',flowDate:'2026-11-04'}),b=api.flow(data,rows,{flow:h.decadal,flowScope:'decadal',flowDate:'2026-11-04'});
 assert.equal(a.length,4);assert.equal(b.length,4);assert.notDeepEqual(clean(a.map(p=>p.title)),clean(b.map(p=>p.title)));
 for(let i=0;i<4;i++){assert.ok(a[i].title.includes(h.yearly.mutagen[i]+'化'+'禄权科忌'[i]));assert.ok(a[i].evidence.includes('流年'));}
 assert.equal(api.flow(data,rows,{flow:h.yearly,flowScope:''}).length,0);assert.equal(snapshot(x),before);
});
test('身宫与来因读取实盘标记，三合不展示来因专属释义',()=>{
 const x=c.FiveArtsEngine.ziwei('2001-01-09 01:29','男').chart;
 assert.ok(result(x,'命宫').life.some(p=>p.id==='body'));assert.ok(!result(x,'命宫').life.some(p=>p.id==='original'));
 const r=result(x,'命宫','qintian');assert.ok(r.life.some(p=>p.id==='original'&&p.evidence.includes('本盘来因标记')));
});
test('96个真实日期命盘：所有宫位有解释，文本无undefined，换盘不污染原数据',()=>{
 const majors=new Set(),pairs=new Set(),patterns=new Set();
 for(let i=0;i<96;i++){
  const date=`${1960+i%60}-${String(i%12+1).padStart(2,'0')}-${String(i%27+1).padStart(2,'0')} ${String(i%24).padStart(2,'0')}:30`,x=c.FiveArtsEngine.ziwei(date,i%2?'男':'女').chart,before=snapshot(x),view=api.analyse(data,x,{mode:i%2?'qintian':'sanhe'});
  assert.equal(view.rows.length,12);for(const r of view.rows){r.major.forEach(n=>majors.add(n));if(r.major.length===2)pairs.add(r.major.slice().sort().join('|'));assert.ok(r.cards.length,r.name);assert.doesNotMatch(text(r.cards.concat(r.natal)),/undefined|NaN/);}
  view.patterns.forEach(p=>{patterns.add(p.title);assert.doesNotMatch(p.text,/undefined|NaN/);});assert.equal(snapshot(x),before);
 }
 assert.equal(majors.size,14);assert.ok(pairs.size>=20);assert.ok(patterns.size>=15);
});
test('本地资料按需并发共用，失败可重试；冻结资料不写入用户记录',async()=>{
 let n=0;const s=setup(async url=>{n++;assert.equal(url,'https://localhost/static/data/ziwei-reading.json');return {ok:n>1,json:async()=>clean(data)};});
 await assert.rejects(s.loader.load());const [a,b]=await Promise.all([s.loader.load(),s.loader.load()]);assert.equal(a,b);assert.equal(n,2);assert.ok(Object.isFrozen(a.pairs[0]));
 const ui=fs.readFileSync('dist/static/js/ziwei-reading.js','utf8');assert.doesNotMatch(ui,/localStorage\.setItem|v-html|innerHTML/);assert.ok(!ui.includes('需要留意与怎样发挥'));
});
test('固定上游代码与MIT许可随包保留，解读技法入口及运限传参完整',()=>{
 const pin=JSON.parse(fs.readFileSync('vendor/ziwei-doushu/UPSTREAM.json','utf8'));assert.equal(c.WZBZPatternRules.commit,pin.commit);assert.ok(fs.readFileSync('dist/static/licenses/ziwei-doushu.txt','utf8').includes('MIT License'));
 const html=fs.readFileSync('dist/index.html','utf8'),ui=fs.readFileSync('dist/static/js/fivearts-ui.js','utf8');assert.ok(html.indexOf('ziwei-patterns.js')<html.indexOf('ziwei-interpretation.js'));assert.ok(ui.includes('flow:flow,flowScope:this.flowScope,flowDate:this.flowDate'));
});

test('本宫首卡去除本盘合读重复，补齐三奇嘉会、单禄存、混杂多煞、大限流年三层叠宫与流曜',()=>{
 const x=add(add(chart(),'命宫','紫微','庙','权'),'财帛','天梁','旺','禄');
 add(x,'官禄','左辅','','科',true);add(x,'迁移','禄存','','',true);add(x,'财帛','擎羊','','',true);add(x,'官禄','火星','','',true);
 const r=row(x,'命宫'),v=result(x,'命宫');
 assert.ok(!r.cards[0].text.includes('本盘合读：'));assert.match(r.cards[0].extra||'',/本盘耦合/);
 assert.ok(v.relations.some(p=>p.id==='rel-sanqi-命宫'));
 assert.ok(v.relations.some(p=>p.id==='rel-lucun-命宫'));
 assert.ok(v.relations.some(p=>p.id==='rel-mixsha-命宫'));
 const real=c.FiveArtsEngine.ziwei('1990-05-15 10:30','男').chart,h=real.horoscope('2026-11-08',5);
 const fv=api.analyse(data,real,{mode:'sanhe',flow:h.yearly,flowScope:'yearly',flowDate:'2026-11-08',horoscope:h});
 const fc=api.flow(data,fv.rows,{flow:h.yearly,flowScope:'yearly',flowDate:'2026-11-08'});assert.equal(fc.length,4);assert.match(fc[3].extra||'',/直冲对宫本命/);
 assert.ok(fv.life.some(p=>p.id==='flow-axis-yearly'));assert.ok(fv.life.some(p=>p.id==='flow-stars-yearly'));
 const bodyCard=fv.life.find(p=>p.id==='body'),bodyRow=fv.rows.find(p=>p.body);
 assert.notEqual(bodyCard.text,bodyRow.cards[0].text);
});
