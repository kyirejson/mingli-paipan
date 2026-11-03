const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {classicsContext,view}=require('./helpers/bazi-classics.cjs');
test('三命时柱与千里正官的乱码条目恢复原有索引',()=>{
 const {c}=classicsContext();
 assert.equal(c.api.getIndex3_1(['甲','子','丙','寅','乙','卯','庚','辰']),98);
 const tabs=c.api.getGuji9_branch(['甲','子','丙','寅','甲','子','甲','子'],'正官');
 assert.ok(tabs.some(t=>t.value==='论正官'));assert.ok(tabs.every(t=>c.api.getIndex9_1([],t.value)>0));
 assert.equal(c.api.getIndex9_1([],'论正官'),19);
});
test('8640组合 × 11书的可显示条目均能生成正索引；不擅补原文未列的戊己亥月',()=>{
 const ctx=classicsContext(),{c,reader}=ctx,v=view(ctx),gan='甲乙丙丁戊己庚辛壬癸',zhi='子丑寅卯辰巳午未申酉戌亥';let count=0,extra=0;
 for(let d=0;d<60;d++)for(let m=0;m<12;m++)for(let h=0;h<12;h++){
  v.gjData.bzArr=['甲','子',gan[((m+10)%12+2)%10],zhi[m],gan[d%10],zhi[d%12],gan[(d%5*2+h)%10],zhi[h]];
  for(const book of c.books.flat()){
   const index=reader.match(v,book,c.api);assert.ok(index>0);assert.ok(v.tabs.every(t=>c.api['getIndex'+book.id+'_'+(t.index+1)](v.gjData.bzArr,t.value)>0));count++;
   if(book.id===10&&v.tabs.some(t=>t.index===4))extra++;
  }
 }
 assert.equal(count,95040);assert.ok(extra>0);assert.equal(c.tables.C.length,118);
 assert.ok(c.api.getGuji10_branch(['甲','子','丙','寅','甲','子','丙','寅']).some(t=>t.index===4));
 for(const day of ['戊','己']){v.gjData.bzArr=['甲','子','乙','亥',day,day==='戊'?'辰':'巳','甲','寅'];reader.match(v,{id:3},c.api);assert.ok(!v.tabs.some(t=>t.index===2));assert.match(v.matchNotice,/未提供/);}
});
test('重复格局不重复目录，目录缩短后选中项回到有效范围',()=>{
 const ctx=classicsContext(),v=view(ctx);v.gjData.geju='正官格,正官,杂气正官';v.tabsDex=7;
 assert.ok(ctx.reader.match(v,{id:9},ctx.c.api)>0);assert.equal(v.tabs.length,2);assert.equal(v.tabsDex,0);
 v.gjData.geju='';assert.equal(ctx.reader.match(v,{id:5},ctx.c.api),0);assert.equal(v.tabs.length,0);assert.match(v.matchNotice,/暂无匹配/);v.tipResult=0;assert.equal(ctx.reader.request(v),'');
});
test('没有真实命盘时不拿默认示例请求资料，未知时辰仍保留可匹配日月条目',async()=>{
 const ctx=classicsContext(),v={...ctx.c.component.data(),$nextTick:fn=>fn()};
 assert.equal(v.tabs.length,0);
 assert.equal(ctx.reader.validCase(v.gjData),false);await ctx.reader.load(v);assert.equal(v.bookSrc,'');
 const unknown=view(ctx,['辛','巳','辛','丑','丁','丑','*','*']);assert.ok(ctx.reader.match(unknown,{id:3},ctx.c.api)>0);assert.ok(unknown.tabs.every(t=>t.index!==0));
});
test('五行精纪隔离六个源站疑误项，保留其余条目的原服务编号并向读者提示',()=>{
 const ctx=classicsContext(),{M}=ctx.c.tables,gan='甲乙丙丁戊己庚辛壬癸',zhi='子丑寅卯辰巳午未申酉戌亥';
 assert.equal(M.length,222);assert.equal(M.filter(Boolean).length,216);
 assert.deepEqual(Array.from(M,(key,i)=>key===null?i+1:0).filter(Boolean),[24,28,51,201,206,207]);
 for(const key of M.filter(Boolean)){
  assert.equal(key.length,4);const d=gan.indexOf(key[0]),h=zhi.indexOf(key[3]);
  assert.ok(d>=0&&h>=0);assert.equal(key[2],gan[(d%5*2+h)%10],key);
 }
 assert.equal(ctx.c.api.getIndex10_5(['甲','子','丙','寅','乙','丑','甲','申']),29);
 const v=view(ctx,['甲','子','丙','寅','乙','丑','甲','申']);
 assert.ok(ctx.reader.match(v,{id:10},ctx.c.api)>0);assert.match(v.matchNotice,/源站标题存在疑误/);
 ctx.reader.match(v,{id:1},ctx.c.api);assert.doesNotMatch(v.matchNotice,/源站标题存在疑误/);
});
test('天元巫咸时柱去除第二套重复目录，六十甲子匹配编号保持不变',()=>{
 const ctx=classicsContext(),{T}=ctx.c.tables,gan='甲乙丙丁戊己庚辛壬癸',zhi='子丑寅卯辰巳午未申酉戌亥';
 assert.equal(T.length,60);assert.equal(new Set(T).size,60);
 for(let i=0;i<60;i++){
  assert.equal(T[i],gan[i%10]+zhi[i%12]);
  assert.equal(ctx.c.api.getIndex7_2(['甲','子','丙','寅','甲','子',gan[i%10],zhi[i%12]]),i+1);
 }
});
test('本地格局参考在无旧会员身份时仍发送现有格局设置消息',()=>{
 const ctx=classicsContext(),v=view(ctx);v.isGeJu=true;v.isTHYS=false;v.gjData.viplevel=0;
 v._self={_c:(tag,data,children)=>Array.isArray(data)?{tag,data:{},children:data}:{tag,data:data||{},children:children||[]}};
 v._v=text=>({text});v._s=String;v._e=()=>null;v._l=(list,fn)=>Array.from(list,fn);
 const nodes=[];function visit(node){if(Array.isArray(node))return node.forEach(visit);if(!node)return;nodes.push(node);visit(node.children);}
 visit(ctx.c.render.call(v));const entry=nodes.find(n=>n.data&&n.data.staticClass==='geju-text');
 assert.ok(entry);entry.data.on.click();assert.equal(ctx.messages.at(-1).type,'geju_set');assert.equal(ctx.messages.at(-1).data,true);
});
test('请求仅使用有效条目，guid 作为独立参数编码',()=>{
 const ctx=classicsContext(),v=view(ctx);v.tipResult=ctx.reader.match(v,{id:1},ctx.c.api);v.gjData.guid='case&b=99';
 const url=new URL(ctx.reader.request(v));assert.equal(url.hostname,'bzapi3.iwzbz.com');assert.equal(url.searchParams.get('b'),'1');assert.equal(url.searchParams.get('guid'),'case&b=99');
 v.tipResult=-1;assert.equal(ctx.reader.request(v),'');
});
test('慢的旧请求不能覆盖新书新章节，切换时取消旧请求并清空旧正文',async()=>{
 const pending=[],ctx=classicsContext((url,opts)=>new Promise(resolve=>pending.push({url,opts,resolve}))),v=view(ctx);
 v.tipResult=1;v.tabs=[{index:0,value:'first'}];const first=ctx.reader.load(v);
 v.tipResult=2;const second=ctx.reader.load(v);assert.ok(pending[0].opts.signal.aborted);assert.equal(v.bookSrc,'');
 pending[1].resolve({ok:true,text:async()=>'<html><head></head><body>newest</body></html>'});await second;
 const current=v.bookSrc;assert.match(await ctx.blobs.get(current).text(),/newest/);
 pending[0].resolve({ok:true,text:async()=>'<html><head></head><body>stale</body></html>'});await first;
 assert.equal(v.bookSrc,current);assert.equal(ctx.blobs.size,1);
 ctx.reader.cancel(v);assert.equal(ctx.blobs.size,0);assert.equal(v.bookSrc,'');
});
test('HTTP错误或非古籍响应明确失败，不把错误页和旧正文伪装为本次结果',async()=>{
 for(const response of [{ok:false,status:503},{ok:true,text:async()=>'{"error":"not available"}'}]){
  const ctx=classicsContext(async()=>response),v=view(ctx);v.tipResult=1;v.tabs=[{index:0,value:'entry'}];await ctx.reader.load(v);
  assert.match(v.readError,/加载失败/);assert.equal(v.bookSrc,'');assert.equal(v.loadingBook,false);
 }
});
test('正文流挂起也会超时；没有 AbortController 时仍能退出加载状态',async()=>{
 for(const hasAbort of [true,false]){
  const ctx=classicsContext(async()=>({ok:true,text:()=>new Promise(()=>{})})),timers=new Map();let id=0;
  ctx.c.setTimeout=fn=>{timers.set(++id,fn);return id;};ctx.c.clearTimeout=key=>timers.delete(key);
  if(!hasAbort)ctx.c.AbortController=undefined;
  const v=view(ctx);v.tipResult=1;v.tabs=[{index:0,value:'entry'}];const promise=ctx.reader.load(v);
  await Promise.resolve();assert.equal(timers.size,1);timers.values().next().value();await promise;
  assert.match(v.readError,/请求超时/);assert.equal(v.loadingBook,false);assert.equal(v.bookSrc,'');assert.equal(timers.size,0);
 }
});
test('切书或销毁立即清除旧计时器，即使网络忽略取消信号也不等待旧请求',async()=>{
 const ctx=classicsContext(()=>new Promise(()=>{})),timers=new Map();let id=0;
 ctx.c.setTimeout=fn=>{timers.set(++id,fn);return id;};ctx.c.clearTimeout=key=>timers.delete(key);
 const v=view(ctx);v.tipResult=1;v.tabs=[{index:0,value:'entry'}];const pending=ctx.reader.load(v);
 assert.equal(timers.size,1);ctx.reader.cancel(v);assert.equal(timers.size,0);await pending;
 assert.equal(v.readError,'');assert.equal(v.loadingBook,false);assert.equal(v._bookCancel,null);
});
test('远端原文的权限提示、署名和水印保留，只添加阅读配色与尺寸上报',()=>{
 const {reader}=classicsContext();
 const html=reader.documentText('<html><head><title>原文</title></head><body vip="0"><div class="content_vip">源站访问提示</div><p>问真评注</p><img src="watermark.png"></body></html>',true);
 assert.match(html,/vip="0"/);assert.match(html,/content_vip/);assert.match(html,/问真评注/);assert.match(html,/watermark\.png/);assert.match(html,/#18231e/);assert.match(html,/<\/script>/);
 const script=html.match(/<script>([\s\S]*?)<\/script>/);assert.ok(script);assert.doesNotThrow(()=>new Function(script[1]));
});
test('命盘和偏好仅接受父页面消息，正文尺寸仅接受当前正文窗口',()=>{
 const ctx=classicsContext(),v=view(ctx),data={type:'GujiData',data:v.gjData};
 assert.equal(ctx.reader.accept(v,{data,source:{}}),false);assert.equal(ctx.reader.accept(v,{data,source:ctx.c.parent}),true);
 assert.equal(ctx.reader.accept(v,{data:null,source:ctx.c.parent}),false);
 assert.equal(ctx.reader.accept(v,{data:{type:'GujiData',data:{bzArr:[]}},source:ctx.c.parent}),false);
 assert.equal(ctx.reader.accept(v,{data:{type:'smartbooks_iframeheight',data:400},source:ctx.frame.contentWindow}),true);
 assert.equal(ctx.reader.accept(v,{data:{type:'smartbooks_iframeheight',data:400},source:{}}),false);
});
test('同格局换命盘也会重新发送资料，多个属性同时变化合并为一次消息',()=>{
 for(const file of ['1.788084fb7fadc440744b.js','2.22f599c1df781213e096.js']){
  const s=fs.readFileSync('dist/static/js/'+file,'utf8'),begin=s.indexOf('watch:{geju:{handler:function(){this.handleMessageGJ()}'),end=s.indexOf(',methods:{',begin);
  assert.ok(begin>=0&&end>begin);const watch=vm.runInNewContext('('+s.slice(begin+6,end)+')');
  const a=s.indexOf('handleMessageGJ:function(){if(this._readerSendPending)'),b=s.indexOf(',initData:function',a),fn=vm.runInNewContext('('+s.slice(a+16,b)+')');
  const callbacks=[],sent=[],v={bazi:['first'],cgArr:[],geju:'正官',guid:'local',$nextTick:fn=>callbacks.push(fn),$refs:{bookbox2:{isConnected:true,contentWindow:{postMessage:data=>sent.push(data)}}}};v.handleMessageGJ=()=>fn.call(v);
  watch.bazi.handler.call(v);watch.cgArr.handler.call(v);watch.geju.handler.call(v);assert.equal(callbacks.length,1);callbacks.shift()();assert.equal(sent.length,1);
  v.bazi=['second'];watch.bazi.handler.call(v);callbacks.shift()();assert.equal(sent.length,2);assert.equal(sent[1].data.bzArr[0],'second');
 }
});
