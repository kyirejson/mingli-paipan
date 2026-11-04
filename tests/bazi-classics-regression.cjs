const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {classicsContext,view}=require('./helpers/bazi-classics.cjs');
test('三命时柱与千里正官的乱码条目恢复原有索引',()=>{
 const {c}=classicsContext();
 assert.equal(c.api.getIndex3_1(['甲','子','丙','寅','乙','卯','庚','辰']),98);
 const tabs=c.api.getGuji9_branch(['甲','子','丙','寅','甲','子','甲','子'],'正官');
 assert.ok(tabs.some(t=>t.value==='论正官'));assert.ok(tabs.every(t=>c.api.getIndex9_1([],t.value)>0));
 assert.equal(c.api.getIndex9_1([],'论正官'),19);
});
test('十干十二月 × 全部11书均使用独立底本地址，不把旧服务页码用于新站',()=>{
 const ctx=classicsContext(),{c,reader}=ctx,v=view(ctx),gan='甲乙丙丁戊己庚辛壬癸',months='寅卯辰巳午未申酉戌亥子丑';let count=0;
 for(let d=0;d<10;d++)for(let m=0;m<12;m++){
  v.gjData.bzArr=['甲','子','丙',months[m],gan[d],'子丑寅卯辰巳午未申酉'[d],gan[(d%5*2+1)%10],'丑'];
  for(let g=0;g<c.books.length;g++)for(let i=0;i<c.books[g].length;i++){
   const book=c.books[g][i];v.swiperDex=g;v.swiperDex2=i;v.tabsDex=0;v.tipResult=reader.match(v,book,c.api);assert.ok(v.tipResult>0,book.name);assert.ok(v.tabs.length);
   assert.match(reader.request(v),/^https:\/\/(luckclub\.cn|tianjihq\.com|libokang\.com)\//);assert.ok(v.tabs.every(t=>!t.publicSource||t.publicSource.expected));count++;
  }
 }
 assert.equal(count,1320);
});
test('重复格局不重复目录，目录缩短后选中项回到有效范围',()=>{
 const ctx=classicsContext(),v=view(ctx);v.gjData.geju='正官格,正官,杂气正官';v.tabsDex=7;
 assert.ok(ctx.reader.match(v,{id:9,name:'千里命稿'},ctx.c.api)>0);assert.equal(new Set(v.tabs.map(t=>t.value)).size,v.tabs.length);assert.equal(v.tabsDex,0);
 v.gjData.geju='';assert.ok(ctx.reader.match(v,{id:5,name:'子平真诠'},ctx.c.api)>0);assert.ok(v.tabs.some(t=>t.value==='论用神'));assert.ok(v.tabs.every(t=>!t.value.includes('正官')));
});
test('没有真实命盘时不拿默认示例请求资料，未知时辰仍保留可匹配日月条目',async()=>{
 const ctx=classicsContext(),v={...ctx.c.component.data(),$nextTick:fn=>fn()};
 assert.equal(v.tabs.length,0);
 assert.equal(ctx.reader.validCase(v.gjData),false);await ctx.reader.load(v);assert.equal(v.bookSrc,'');
 const unknown=view(ctx,['辛','巳','辛','丑','丁','丑','*','*']);assert.ok(ctx.reader.match(unknown,{id:3},ctx.c.api)>0);assert.ok(unknown.tabs.every(t=>t.index!==0));
});
test('五行精纪不再请求旧服务的疑误日时页，底本原章独立配置',()=>{
 const ctx=classicsContext(),{M}=ctx.c.tables,gan='甲乙丙丁戊己庚辛壬癸',zhi='子丑寅卯辰巳午未申酉戌亥';
 assert.equal(M.length,222);assert.equal(M.filter(Boolean).length,216);
 assert.deepEqual(Array.from(M,(key,i)=>key===null?i+1:0).filter(Boolean),[24,28,51,201,206,207]);
 for(const key of M.filter(Boolean)){
  assert.equal(key.length,4);const d=gan.indexOf(key[0]),h=zhi.indexOf(key[3]);
  assert.ok(d>=0&&h>=0);assert.equal(key[2],gan[(d%5*2+h)%10],key);
 }
 assert.equal(ctx.c.api.getIndex10_5(['甲','子','丙','寅','乙','丑','甲','申']),29);
 const v=view(ctx,['甲','子','丙','寅','乙','丑','甲','申']);
 assert.ok(ctx.reader.match(v,{id:10,name:'五行精纪'},ctx.c.api)>0);assert.ok(v.tabs.every(t=>t.publicSource.url.includes('/bazi/013/')));assert.ok(v.tabs.some(t=>t.publicSource.url.endsWith('/017/')));
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
test('全部公开阅读请求不发送guid、生日、登录或会员字段',()=>{
 const ctx=classicsContext(),v=view(ctx);v.tipResult=ctx.reader.match(v,{id:1},ctx.c.api);v.gjData.guid='case&b=99';
 const url=new URL(ctx.reader.request(v));assert.equal(url.hostname,'luckclub.cn');assert.equal(url.search,'');assert.ok(!url.href.includes('case'));
 v.tipResult=-1;assert.equal(ctx.reader.request(v),'');
});
function readingUnit(fetch){const ctx=classicsContext(fetch),v=view(ctx);ctx.c.BaziPublicClassics={...ctx.c.BaziPublicClassics,documentText:text=>text};v.tipResult=ctx.reader.match(v,{id:1},ctx.c.api);return {...ctx,v};}
test('慢的旧请求不能覆盖新书新章节，切换时取消旧请求并清空旧正文',async()=>{
 const pending=[],ctx=readingUnit((url,opts)=>new Promise(resolve=>pending.push({url,opts,resolve}))),v=ctx.v;
 const first=ctx.reader.load(v);
 v.tipResult=2;const second=ctx.reader.load(v);assert.ok(pending[0].opts.signal.aborted);assert.equal(v.bookSrc,'');
 pending[1].resolve({ok:true,text:async()=>'<html><head></head><body id="article-content">newest</body></html>'});await second;
 const current=v.bookSrc;assert.match(await ctx.blobs.get(current).text(),/newest/);
 pending[0].resolve({ok:true,text:async()=>'<html><head></head><body id="article-content">stale</body></html>'});await first;
 assert.equal(v.bookSrc,current);assert.equal(ctx.blobs.size,1);
 ctx.reader.cancel(v);assert.equal(ctx.blobs.size,0);assert.equal(v.bookSrc,'');
});
test('HTTP错误或非古籍响应明确失败，不把错误页和旧正文伪装为本次结果',async()=>{
 for(const response of [{ok:false,status:503},{ok:true,text:async()=>'{"error":"not available"}'}]){
  const ctx=readingUnit(async()=>response),v=ctx.v;await ctx.reader.load(v);
  assert.match(v.readError,/加载失败/);assert.equal(v.bookSrc,'');assert.equal(v.loadingBook,false);
 }
});
test('正文流挂起也会超时；没有 AbortController 时仍能退出加载状态',async()=>{
 for(const hasAbort of [true,false]){
  const ctx=readingUnit(async()=>({ok:true,text:()=>new Promise(()=>{})})),timers=new Map();let id=0;
  ctx.c.setTimeout=fn=>{timers.set(++id,fn);return id;};ctx.c.clearTimeout=key=>timers.delete(key);
  if(!hasAbort)ctx.c.AbortController=undefined;
  const v=ctx.v;const promise=ctx.reader.load(v);
  await Promise.resolve();assert.equal(timers.size,1);timers.values().next().value();await promise;
  assert.match(v.readError,/请求超时/);assert.equal(v.loadingBook,false);assert.equal(v.bookSrc,'');assert.equal(timers.size,0);
 }
});
test('切书或销毁立即清除旧计时器，即使网络忽略取消信号也不等待旧请求',async()=>{
 const ctx=readingUnit(()=>new Promise(()=>{})),timers=new Map();let id=0;
 ctx.c.setTimeout=fn=>{timers.set(++id,fn);return id;};ctx.c.clearTimeout=key=>timers.delete(key);
 const v=ctx.v;const pending=ctx.reader.load(v);
 assert.equal(timers.size,1);ctx.reader.cancel(v);assert.equal(timers.size,0);await pending;
 assert.equal(v.readError,'');assert.equal(v.loadingBook,false);assert.equal(v._bookCancel,null);
});
test('仅给受控阅读文档添加高度上报，不注入外站样式脚本',()=>{
 const {reader}=classicsContext();
 const html=reader.documentText('<html><head><title>原文</title></head><body vip="0"><div class="content_vip">源站访问提示</div><p>问真评注</p><img src="watermark.png"></body></html>',true);
 assert.match(html,/vip="0"/);assert.match(html,/content_vip/);assert.match(html,/问真评注/);assert.match(html,/watermark\.png/);assert.match(html,/<\/script>/);assert.ok(!html.includes('bzapi3.iwzbz.com'));
 const script=html.match(/<script>([\s\S]*?)<\/script>/);assert.ok(script);assert.doesNotThrow(()=>new Function(script[1]));
});
test('阅读器撤回旧问真取文请求路径，不保留权限页面伪装回退',()=>{
 const source=fs.readFileSync('dist/static/newguji/reader.js','utf8');assert.doesNotMatch(source,/bzapi3|iwzbz|getnewguji3|response\.text\(\)/);
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
test('穷通合章按真实目录，丁火八九月与十一十二月不能套连续页号',()=>{
 const ctx=classicsContext(),v=view(ctx);
 for(const [month,chapter] of [['酉','044'],['戌','044'],['子','046'],['丑','046']]){v.gjData.bzArr[3]=month;v.tipResult=ctx.reader.match(v,{id:1},ctx.c.api);assert.ok(ctx.reader.request(v).endsWith('/'+chapter+'/'));}
});
test('天元各干显示真实四篇，戊土保留原底本分开的续篇',()=>{
 const ctx=classicsContext(),v=view(ctx),stems='甲乙丙丁戊己庚辛壬癸';
 for(const stem of stems){v.gjData.bzArr[4]=stem;ctx.reader.match(v,{id:7,name:'天元巫咸'},ctx.c.api);assert.equal(v.tabs.length,stem==='戊'?5:4);assert.ok(v.tabs.every(t=>!/[日时]柱/.test(t.value)));assert.ok(v.tabs.some(t=>t.value.includes('时引篇')));}
});
test('未知时辰的八字提要允许读月日整章，不伪造一个子时条目',()=>{
 const ctx=classicsContext(),v=view(ctx);v.gjData.bzArr[6]=v.gjData.bzArr[7]='*';ctx.reader.match(v,{id:4,name:'八字提要'},ctx.c.api);assert.equal(v.tabs.length,1);assert.match(v.tabs[0].value,/各时辰原章/);assert.equal(v.tabs[0].publicSource.mode,'chapter');
});
test('时柱非法时呈现定位错误，不出现未处理Promise或请求默认条目',async()=>{
 const ctx=classicsContext(),v=view(ctx);v.swiperDex=0;v.swiperDex2=2;v.gjData.bzArr[6]='甲';v.tabs=[{index:0,value:'非法时柱'}];v.tipResult=1;await ctx.reader.load(v);assert.match(v.readError,/时柱与日干不相符/);assert.equal(v.bookSrc,'');
});
