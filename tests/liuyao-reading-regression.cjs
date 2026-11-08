const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={console,Date,Intl,Math,JSON,Map,Set};ctx.window=ctx;vm.createContext(ctx);
for(const name of ['time-policy','fivearts-engine','divination-calendar-fix','fivearts-readings','liuyao-reading'])vm.runInContext(fs.readFileSync('dist/static/js/'+name+'.js','utf8'),ctx);
const E=ctx.FiveArtsEngine,L=ctx.LiuyaoReading,D=ctx.FiveArtsReadingsData;
function chart(moving=[],upper=1,lower=8,time='2026-10-29 12:00'){return L.snapshot(E.liuyao(time,{method:'specified',upper,lower,moving}));}
function report(c,book='huangjince',options={}){return L.analyze(c,{book,index:4,yongIndex:3,...options},D);}
function topic(r,id){return r.topics.find(x=>x.id===id);}
function cited(card){for(const ref of card.references){assert.ok(D.books[ref.book].sections[ref.chapter].paragraphs[ref.paragraph].includes(ref.quote),card.id+':'+ref.quote);}}
test('海底眼正文与别书引文分开，25式引用可回到实际段落',()=>{
 const original=JSON.parse(fs.readFileSync('content/haidiyan-yiranzhai-transcription.json','utf8'));
 assert.equal(original.sections.length,64);assert.ok(original.sections.every(s=>s.traditionalParagraphs.length===s.paragraphs.length));
 assert.equal(D.books.haidiyan.sections.filter(s=>s.title.startsWith('正文·')).length,64);
 assert.equal(Object.keys(L.pairs).length,25);
 for(const pair of Object.values(L.pairs)){const ref=L.reference(D,'haidiyan',pair[0]);assert.ok(D.books.haidiyan.sections[ref.chapter].paragraphs[ref.paragraph].includes(ref.quote));}
 const p=D.books.haidiyan.sections.find(s=>s.title==='引文·六亲动变').paragraphs;assert.equal(p.length,46);assert.ok(p.at(-1).includes('若卦有两爻动'));assert.ok(!p.includes('周仲高期日捷诀'));
});
test('64卦全部64种动爻组合、三书引用与证据完整，输入始终不变',()=>{
 let count=0;
 for(let upper=1;upper<=8;upper++)for(let lower=1;lower<=8;lower++)for(let mask=0;mask<64;mask++){
  const moving=[1,2,3,4,5,6].filter(i=>mask&(1<<(i-1))),c=chart(moving,upper,lower),before=JSON.stringify(c);
  for(const book of ['huozhulin','haidiyan','huangjince']){
   const r=report(c,book,{index:(upper+lower)%6+1,side:upper%2?'main':'changed'});
   assert.ok(r.cards.length);assert.equal(r.topics.length,6);assert.ok(r.overview.includes(c.main.name));assert.equal(new Set(r.cards.map(c=>c.id)).size,r.cards.length);assert.doesNotMatch(JSON.stringify(r),/undefined|NaN/);
   const copy=[r.summary,...[...r.cards,...r.supplementary,...r.topics].flatMap(x=>[x.verdict,x.meaning])].join('\n');assert.doesNotMatch(copy,/承接|承载|这一端|那一端|落点|相助方向|有一定|某种|可能|或许|有望|综合考虑|进一步分析|要结合|掌握主动权|主动权在/);
   for(const card of [...r.cards,...r.supplementary,...r.topics]){assert.ok(card.evidence.length,book+':'+card.id);assert.ok(card.verdict.length>=4);assert.ok(card.meaning.length>15);cited(card);}
   for(const card of r.cards)assert.ok(card.references.some(ref=>ref.book===book));
   for(const card of r.supplementary)assert.ok(!card.references.some(ref=>ref.book===book));
   for(const t of r.topics)assert.equal(t.reference.book,book);
   assert.equal(JSON.stringify(c),before);count++;
  }
 }
 assert.equal(count,12288);
});
test('海底眼独发可看变，多动按乱动篇不套逐爻变断；静卦不误称乱动',()=>{
 for(const moving of [[],[2],[2,4],[1,2,3,4,5,6]]){
  const r=report(chart(moving),'haidiyan');
  assert.equal(r.usesChangedJudgments,moving.length===1);
  assert.equal(r.cards.some(c=>c.id==='haidi-multiple'),moving.length>1);
  assert.equal(r.cards.filter(c=>c.id.startsWith('change-')).length,moving.length===1?1:0);
  if(!moving.length)assert.match(r.profile.text,/六爻安静/);
  if(moving.length>1)assert.doesNotMatch(JSON.stringify(r.topics),/动化子孙|先聚后散|财化父母|财化官|动化回头克/);
 }
});
test('同一财化兄卦，火珠林及黄金策看后续分耗，海底眼多动不套此变断',()=>{
 const c=chart([3,4]),fire=report(c,'huozhulin'),gold=report(c),sea=report(c,'haidiyan');
 assert.match(topic(fire,'finance').verdict,/先聚后散/);assert.match(topic(gold,'finance').verdict,/先聚后散/);assert.doesNotMatch(topic(sea,'finance').verdict,/先聚后散/);
 assert.notEqual(fire.summary,sea.summary);assert.notEqual(gold.summary,sea.summary);
});
test('财来克世在求财章可取易得，不泛断财克世为失财',()=>{
 const c=chart([6],2,5,'2026-08-10 12:00'),shi=c.rows.find(r=>r.shi==='世'),w=c.rows[5];
 assert.equal(w.role,'妻财');assert.equal(L.relation(w.element,shi.element),'克');assert.equal(shi.moving,false);
 assert.match(topic(report(c,'huozhulin'),'finance').verdict,/财来就我/);assert.match(topic(report(c,'huozhulin'),'finance').meaning,/财生世、财克世均为财来逐我/);
});
test('旺相财逢空保留根气，不误说财已到账或全无财源',()=>{
 const c=chart([],1,3),t=topic(report(c),'finance');assert.equal(c.rows[4].season,'相');assert.equal(c.rows[4].void,true);assert.match(t.verdict,/财旺逢空，应收款未到手/);assert.match(t.meaning,/有财待收/);
});
test('财化兄回克、官化子退忧与求官不利分开解释',()=>{
 const financial=report(chart([3]),'huozhulin');assert.match(topic(financial,'finance').verdict,/先聚后散/);assert.match(topic(financial,'finance').meaning,/回头克财/);
 const office=report(chart([3],1,3),'haidiyan');assert.match(topic(office,'work').verdict,/官化子孙而变子空破，解忧未成，求职受克/);assert.match(topic(office,'work').meaning,/变子月破，解忧之事未成/);
});
test('兄动通关须有能承接的动子孙，不能把合绊空破当作已经解救',()=>{
 const strong=report(chart([2,4,6],1,3,'2026-05-20 12:00'));assert.ok(strong.cards.some(c=>c.id==='finance-bridge'));assert.match(topic(strong,'finance').meaning,/兄生子、子生财/);
 const tied=report(chart([1,2,3,4,5,6],3,7,'2026-11-04 12:00'));assert.ok(!tied.cards.some(c=>c.id==='finance-bridge'));
});
test('世应相生但地支相害时，婚约不误取无冲害稳定组合',()=>{
 const t=topic(report(chart([],1,5)),'relationship');assert.match(t.verdict,/世应相害/);assert.match(t.meaning,/五行虽相生/);assert.doesNotMatch(t.verdict,/稳定相处/);
});
test('黄金策求名六爻竞发不被官父有气的正向条件覆盖',()=>{
 const r=report(chart([1,2,3,4,5,6]));assert.match(topic(r,'work').verdict,/六爻竞发，求名求职难成/);assert.ok(topic(r,'work').references.some(r=>r.quote.includes('六爻竞发')));
});
test('各占事分别取用，默认不把上爻或参看爻当作用神',()=>{
 const c=chart([2,4]);for(const book of ['huozhulin','haidiyan','huangjince']){
  const base=report(c,book),finance=report(c,book,{topic:'finance'}),manual=report(c,book,{manualUse:true});
  assert.equal(base.useIndex,null);assert.equal(finance.useIndex,null);assert.equal(manual.useIndex,3);assert.ok([...manual.cards,...manual.supplementary].some(c=>c.id==='manual-use'));
  assert.deepEqual(Array.from(base.topics,t=>t.id),['finance','work','relationship','papers','travel','lost']);
 }
});
test('换日换卦会改变实际内容；参看变卦静位不伪造动化',()=>{
 const a=chart([2,4]),b=chart([2,4],7,8),d=chart([2,4],1,8,'2026-11-04 12:00');
 assert.notEqual(report(a).summary,report(b).summary);assert.notEqual(JSON.stringify(report(a).topics),JSON.stringify(report(d).topics));
 const changed=report(a,'huozhulin',{index:1,side:'changed'});assert.ok(changed.facts.some(s=>s.includes('本爻未动')));assert.ok(!changed.cards.some(c=>c.id==='change-1'));
});
test('关系方向与界面加载顺序正确；原文跨书跳转采用真实书名',()=>{
 for(const a of ['木','火','土','金','水'])for(const b of ['木','火','土','金','水'])assert.equal(L.relation(b,a),{比和:'比和',生:'受生',克:'受克',受生:'生',受克:'克'}[L.relation(a,b)]);
 const html=fs.readFileSync('dist/index.html','utf8'),s=fs.readFileSync('dist/static/js/fivearts-ui.js','utf8');assert.ok(html.indexOf('liuyao-reading.js')<html.indexOf('fivearts-ui.js'));assert.match(s,/bookTab:'analysis',topic:'all'/);assert.match(s,/if\(ref.book\)d.book=ref.book/);assert.doesNotMatch(s,/用神：本卦'\+L.lineName\(d.yongIndex\)/);
});

test('通用世克应不再冒充主动权，未命中结构时用具体占事补充',()=>{
 for(const book of ['huozhulin','haidiyan','huangjince']){const r=report(chart([]),book);assert.ok(!r.cards.some(x=>x.id==='shi-ying'||x.id==='basis'));assert.doesNotMatch(r.summary,/主动权|先辨.*再取/);}
});

test('变爻空破必须指明变出何物，避免把阻碍变成笼统的全事凶断',()=>{
 const r=report(chart([3]),'huozhulin'),t=topic(r,'finance');assert.match(t.meaning,/变出的兄弟.*旬空.*分耗争执未落实/);assert.match(t.verdict,/变兄弟旬空/);
});

test('黄金策单爻动变384局零遗漏，财化兄回克不被火珠林截胡，火珠林独发优先于财官通论',()=>{
 for(let u=1;u<=8;u++)for(let l=1;l<=8;l++)for(let i=1;i<=6;i++){
  const r=report(chart([i],u,l),'huangjince');
  assert.ok(r.cards.some(x=>x.id==='change-'+i),`missing change-${i} for ${u}-${l}`);
 }
 const c=chart([3]);
 const gold=report(c,'huangjince'),fire=report(c,'huozhulin');
 assert.ok(gold.cards.some(x=>x.id==='change-3'&&x.title.includes('回头克')));
 assert.equal(fire.cards[0].id,'change-3');
});

test('手动指定用神在黄金策、火珠林、海底眼三书中均置顶且识别元忌动生克',()=>{
 const c=chart([2,5],2,5,'2026-11-08 14:00');
 for(const book of ['huangjince','huozhulin','haidiyan']){
  const r=report(c,book,{yongIndex:2,manualUse:true});
  assert.equal(r.cards[0].id,'manual-use');
  assert.equal(r.cards[0].reference.book,book);
 }
});

test('三合成局、旁爻动生克世位与六冲六合游魂归魂卦象按书目规则生成',()=>{
 const qian=report(chart([],1,1),'huangjince'),tai=report(chart([],8,1),'huangjince'),jin=report(chart([],3,8),'huozhulin'),dayou=report(chart([],3,1),'haidiyan');
 assert.ok(qian.cards.some(x=>x.id==='hexagram-pattern'&&x.title.includes('六冲')));
 assert.ok(tai.cards.some(x=>x.id==='hexagram-pattern'&&x.title.includes('六合')));
 assert.ok(jin.cards.some(x=>x.id==='hexagram-pattern'&&x.title.includes('游魂')));
 assert.ok(dayou.cards.some(x=>x.id==='hexagram-pattern'&&x.title.includes('归魂')));
 const sanheVoid=L.snapshot(E.liuyao('2026-05-20 12:00',{method:'specified',upper:1,lower:1,moving:[1,3,5]})),sanheChart=L.snapshot(E.liuyao('2026-11-08 14:00',{method:'specified',upper:1,lower:1,moving:[1,3,5]}));
 const sanheGold=report(sanheChart,'huangjince'),sanheSea=report(sanheChart,'haidiyan');
 assert.ok(!report(sanheVoid,'huangjince').cards.some(x=>x.id==='sanhe-水'));
 assert.ok(sanheGold.cards.some(x=>x.id==='sanhe-水'));
 assert.ok(!sanheSea.cards.some(x=>x.id.startsWith('sanhe-')));
});

test('反吟伏吟、动墓世墓、三书六神发动准确识别，火珠林财官结构卡与分占正文去重',()=>{
 const fuyin=report(chart([2,3,5,6],1,1),'huangjince'),fanyin=report(chart([2,3,5,6],8,8),'huangjince');
 assert.ok(fuyin.cards.some(x=>x.id==='fuyin-pattern'&&x.title==='卦变伏吟'));
 assert.ok(fanyin.cards.some(x=>x.id==='fanyin-pattern'&&x.title==='卦变反吟'));
 const tombMov=report(chart([1],1,1,'2026-11-02 12:00'),'huangjince'),tombShi=report(chart([],1,3,'2026-11-02 12:00'),'huangjince');
 assert.ok(tombMov.cards.some(x=>x.id==='tomb-moving'));
 assert.ok(tombShi.cards.some(x=>x.id==='tomb-shi'&&x.title.includes('随鬼')||x.id==='tomb-shi'));
 const dragonFire=report(chart([4],1,4,'2026-11-01 12:00'),'huozhulin'),seaSolo=report(chart([1],1,8,'2026-10-29 12:00'),'haidiyan');
 assert.ok(dragonFire.cards.some(x=>x.id==='six-god-move'&&x.title.includes('青龙')));
 assert.ok(seaSolo.cards.some(x=>x.id==='six-god-move'&&x.reference.chapterTitle==='正文·六神发动'));
 const fw=dragonFire.cards.find(x=>x.id==='fire-wealth'),fo=dragonFire.cards.find(x=>x.id==='fire-office');
 assert.notEqual(fw.meaning,topic(dragonFire,'finance').meaning);
 assert.notEqual(fo.meaning,topic(dragonFire,'work').meaning);
 assert.match(dragonFire.summary,/世居.*应居/);
});
