const test=require('node:test'),assert=require('node:assert/strict');
const {setup,chart,add,clean,snapshot}=require('./helpers/ziwei-reading.cjs');
const {c,api,data}=setup();
const real=(date,sex='女')=>c.FiveArtsEngine.ziwei(date,sex).chart;
const view=x=>api.analyse(data,x,{mode:'qintian'});
test('廉相、同梁的会照以组合所在宫为中心：两张独立反例',()=>{
 for(const [date,title,bonus] of [['1968-09-09 08:30','廉贞天相格','左辅会照'],['1990-07-04 06:30','天同天梁格','文昌会照']]){
  const p=view(real(date)).patterns.find(p=>p.title===title);assert.ok(p);assert.ok(!p.bonus.includes(bonus),date);
 }
});
test('午羊七杀不冒充同阴马头带箭；借曜变体保留对宫身份',()=>{
 assert.ok(!view(real('1986-06-08 00:30','男')).patterns.some(p=>p.title==='马头带箭'));
 const p=view(real('2006-11-26 10:30')).patterns.find(p=>p.title==='马头带箭');assert.ok(p);assert.match(p.text,/对宫|借曜/);assert.doesNotMatch(p.text,/午宫天同太阴同守/);
});
test('武杀子女宫组合保留实际对象，不能写成本人工作',()=>{
 const p=view(real('2001-01-09 01:29','男')).patterns.find(p=>p.title==='武曲七杀');assert.ok(p);assert.ok(p.palaces.includes('子女'));assert.match(p.text,/子女|晚辈/);assert.doesNotMatch(p.text,/工作结果|本人的工作|你的事业/);
});
test('通用科权会合包含合法辅星化科，不静默丢掉右弼',()=>{
 const p=view(real('1988-03-08 00:30','男')).patterns.find(p=>p.title==='科权双会');assert.ok(p);assert.match(p.evidence,/右弼.*科/);
});
test('每宫杂曜独立生成，年解龙德大耗在真实落点有释义',()=>{
 const x=real('2001-01-09 01:29','男'),a=view(x);assert.ok(a.rows.filter(r=>r.misc.length).length>1);
 for(const r of a.rows){assert.ok(Array.isArray(r.misc));for(const s of r.stars.filter(s=>data.misc[s.name]))assert.ok(r.misc.some(p=>p.title===s.name+'在'+r.title));}
 for(const star of ['年解','龙德','大耗'])assert.ok(data.misc[star]);
});
test('原文在独立辅曜、斗君处止步，命宫天梁不会从太阴尾诗开始',()=>{
 for(const [key,ctx] of Object.entries(data.contexts).filter(([k])=>k.endsWith(':破军'))){assert.doesNotMatch(ctx.text,/文昌(?:金|會|入廟|妻)|斗君|返回頂部/,key);}
 assert.match(data.contexts['命宫:天梁'].text,/^天梁屬土/);assert.match(data.contexts['命宫:破军'].text,/^破軍水/);
 assert.ok(data.contexts['财帛:文昌']);assert.ok(data.contexts['田宅:左辅']);
});
test('同一谓词不同ID冲突拒绝；重复主星不生成解读',()=>{
 const d=clean(data);d.details.push({...d.details[0],id:'conflict',text:'不同释义'});assert.throws(()=>api.validate(d),/冲突|重复/);
 const x=add(add(chart(),'命宫','紫微'),'财帛','紫微');assert.equal(api.validChart(x),false);
});
test('流年正文包含实际化曜与双层宫位；飞化不使用歧义本宫视角',()=>{
 const x=real('2001-01-09 01:29','男'),before=snapshot(x),h=x.horoscope('2026-11-04',5);
 const v=api.analyse(data,x,{mode:'qintian',flowScope:'yearly',flow:h.yearly,flowDate:'2026-11-04'});
 const p=v.life.find(p=>p.title==='流年 · 天机化权');assert.ok(p);assert.match(p.text,/天机/);assert.match(p.text,/流年迁移宫/);assert.match(p.text,/本命命宫/);
 for(const r of v.rows)for(const f of api.analyse(data,x,{selected:r.index,mode:'qintian'}).flights){assert.doesNotMatch(f.text,/本宫|对方宫/);assert.ok(f.sourcePalace&&f.targetPalace);}
 assert.equal(snapshot(x),before);
});
test('本命缓存命中且真实星位、资料对象改变时失效',()=>{
 const x=real('2001-01-09 01:29','男'),a=view(x),b=view(x);assert.equal(a.rows,b.rows);assert.equal(a.patterns,b.patterns);
 const r=x.palaces.find(p=>p.majorStars.length);r.majorStars[0].brightness='平';assert.notEqual(view(x).rows,a.rows);
 const d=clean(data);assert.notEqual(api.analyse(d,x,{}).rows,view(x).rows);
});
test('出处逐条可定位，坏引用与非法双星组合被拦截',()=>{
 for(const p of Object.values(data.provenance)){assert.ok(p.version&&p.school&&p.layer);for(const key of p.sourceRefs)assert.ok(data.sources[key]);for(const key of p.contextKeys)assert.ok(data.contexts[key]);}
 for(const change of [d=>d.provenance['profile:命宫:紫微'].contextKeys=['不存在'],d=>d.pairs[0].stars=['紫微','太阴']]){const d=clean(data);change(d);assert.throws(()=>api.validate(d));}
 const x=add(add(chart(),'命宫','紫微'),'命宫','太阴');assert.equal(api.validChart(x),false);
});
test('细读引用原句确实存在，入庙限定不会扩大到旺',()=>{
 for(const p of Object.values(data.provenance).filter(p=>p.sourceQuote))assert.ok(p.contextKeys.some(k=>data.contexts[k].text.includes(p.sourceQuote)));
 const a=api.match(data,add(chart(),'父母','太阳','庙')).find(r=>r.name==='父母');assert.ok(a.cards.some(c=>c.title.includes('太阳入庙')));
 const b=api.match(data,add(chart(),'父母','太阳','旺')).find(r=>r.name==='父母');assert.ok(!b.cards.some(c=>c.title.includes('太阳入庙')));
});
test('钦天和飞星有明确分工，四套辅助神煞按实际字段分开',()=>{
 const x=real('2001-01-09 01:29','男'),a=api.analyse(data,x,{mode:'qintian'}),b=api.analyse(data,x,{mode:'feixing'});
 assert.ok(a.life.some(c=>c.id==='original'));assert.ok(!b.life.some(c=>c.id==='original'));
 assert.notEqual(a.policy.focus,b.policy.focus);for(const r of a.rows){assert.equal(r.cycles.length,4);for(const o of r.cycles)assert.equal(o.star,x.palaces[r.index][o.system]);}
});
