const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('dist/static/newguji/public-sources.js','utf8'),gan='甲乙丙丁戊己庚辛壬癸',zhi='子丑寅卯辰巳午未申酉戌亥';
function context(fetch){const c={Map,Set,Array,String,Error,Promise,fetch};c.window=c;c.parent=c;vm.createContext(c);vm.runInContext(source,c);return c;}
function view(id,bazi,tab=0){return {books:[[{id,name:id===3?'三命通会':'八字提要'}]],swiperDex:0,swiperDex2:0,tabs:[{index:tab,value:'entry'}],tabsDex:0,gjData:{bzArr:bazi}};}

test('公开三命目录的120个日干时辰章节逐条对应，错误时干不能被当作有效条目',()=>{
 const api=context().BaziPublicClassics,catalog=JSON.parse(fs.readFileSync('docs/home-simplification-2026-11-03/sanming-public-catalog.json','utf8')).sanmingHours;
 assert.equal(Object.keys(catalog).length,120);
 for(let s=0;s<10;s++)for(let h=0;h<12;h++){
  const stem=gan[(s%5*2+h)%10],key=gan[s]+stem+zhi[h],v=view(3,['庚','辰','己','丑',gan[s],zhi[s%12],stem,zhi[h]]),result=api.resolve(v);
  assert.equal(Number(result.url.split('/').at(-2)),catalog[key]);assert.equal(result.expected,'六'+gan[s]+'日'+stem+zhi[h]+'时断');
 }
 assert.throws(()=>api.resolve(view(4,['庚','辰','己','丑','壬','申','甲','丑'])),/时柱与日干不相符/);
});

test('八字提要按12个月和10日干定位原文，不把1440条服务索引误当作120章页码',()=>{
 const api=context().BaziPublicClassics;
 for(let m=0;m<12;m++)for(let s=0;s<10;s++)for(let h=0;h<12;h++){
  const result=api.resolve(view(4,['庚','辰','己','寅卯辰巳午未申酉戌亥子丑'[m],gan[s],zhi[s%12],gan[(s%5*2+h)%10],zhi[h]]));
  assert.equal(result.url,'https://luckclub.cn/bazi/015/'+String(m*10+s+1).padStart(3,'0')+'/');assert.equal(result.expected,gan[s]+'日');
  assert.ok(!result.url.includes('guid'));
 }
});

test('原文请求只访问固定公开章节；失败、跳转或非原文响应不得进入缓存',async()=>{
 let calls=0,response={status:503};const c=context();c.Capacitor={isNativePlatform:()=>true,isPluginAvailable:()=>true,Plugins:{CapacitorHttp:{get:async()=>{calls++;return response;}}}};const api=c.BaziPublicClassics,s={url:'https://luckclub.cn/bazi/015/119/'};
 await assert.rejects(api.fetchText({url:'https://example.com/'}),/无效/);assert.equal(calls,0);
 await assert.rejects(api.fetchText(s),/HTTP 503/);
 response={status:200,url:'https://example.com/',data:'<article id="article-content">x</article>'};await assert.rejects(api.fetchText(s),/地址发生变化/);
 response={status:200,url:s.url,data:'not an article'};await assert.rejects(api.fetchText(s),/未返回/);
 response={status:200,url:s.url,data:'<article id="article-content">fixture</article>'};assert.equal(await api.fetchText(s),response.data);const before=calls;await api.fetchText(s);assert.equal(calls,before);
});

test('公开正文缓存有界，新打开的书不会无限保留所有历史章节',async()=>{
 let calls=0;const c=context(async()=>{calls++;return {ok:true,text:async()=>'<article id="article-content">fixture</article>'};}),api=c.BaziPublicClassics;
 for(let i=1;i<=13;i++)await api.fetchText({url:'https://luckclub.cn/bazi/015/'+String(i).padStart(3,'0')+'/'});
 assert.equal(calls,13);await api.fetchText({url:'https://luckclub.cn/bazi/015/013/'});assert.equal(calls,13);
 await api.fetchText({url:'https://luckclub.cn/bazi/015/001/'});assert.equal(calls,14);
});
