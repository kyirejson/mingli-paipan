const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const CASES='wzbz_local_userlist_v14',NOTES='wzbz_local_notes_v14';
function boot(data=new Map(),vault={},nativeOverride){
 class Store{get length(){return data.size;}key(i){return [...data.keys()][i]??null;}getItem(k){return data.get(String(k))??null;}setItem(k,v){data.set(String(k),String(v));}removeItem(k){data.delete(String(k));}clear(){data.clear();}}
 const saved=[],events=[],plugin={read:async()=>({...vault}),save:async({payload})=>{saved.push(payload);if(vault.current!==payload)vault.previous=vault.current;vault.current=payload;return {ok:true};},...nativeOverride};
 const c={console,Date,JSON,Map,Set,Promise,Array,Object,String,Number,Error,crypto:require('node:crypto').webcrypto,setTimeout,clearTimeout,Storage:Store,localStorage:new Store(),location:{origin:'https://localhost'},document:{hidden:false},addEventListener(){},dispatchEvent:e=>events.push(e),CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts.detail;}},Capacitor:{getPlatform:()=> 'android',Plugins:{DataVault:plugin}}};
 c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync('dist/static/js/data-preservation.js','utf8'),c);
 return {c,data,vault,saved,events,guard:c.WZBZDataProtection};
}
const row=(guid,name='旧命盘')=>({guid,name,solarTime:'2001-01-09 01:29',bz:'辛 巳 辛 丑 丁 丑 辛 丑',isdel:0});
const snapshot=data=>JSON.stringify({format:'zaohua-data-vault',schema:1,data});
test('覆盖升级反复冷启动，命盘、笔记、草稿、分组及设置原值保持',async()=>{
 const data=new Map([[CASES,JSON.stringify([row('old-a'),row('old-b','另一个')])],[NOTES,JSON.stringify({'old-a':{content:'原笔记\n第二行',feedbackData:'原始反馈'}})],['wzbz_note_drafts_v1','{"old-b":{"content":"未提交草稿"}}'],['wzbz_local_groups_v14','[{"guid":"g1","name":"亲友"}]'],['setting_age','false']]);
 const before=new Map(data),vault={};
 for(let version=15;version<19;version++){
  const ctx=boot(data,vault);await ctx.guard.ready;await ctx.guard.flush();
  for(const [key,value] of before)assert.equal(data.get(key),value,'version '+version+' '+key);
  assert.equal(ctx.guard.status.native,true);
 }
});
test('WebView 存储为空时从独立原生备份找回，原有记录与当前新增记录按 GUID 合并',async()=>{
 const vault={current:snapshot({[CASES]:JSON.stringify([row('old')]),[NOTES]:'{"old":{"content":"重要笔记"}}'})};
 const data=new Map([[CASES,JSON.stringify([row('new')])]]),ctx=boot(data,vault);await ctx.guard.ready;
 assert.deepEqual(JSON.parse(data.get(CASES)).map(x=>x.guid),['new','old']);assert.equal(JSON.parse(data.get(NOTES)).old.content,'重要笔记');
 data.clear();const again=boot(data,vault);await again.guard.ready;assert.equal(JSON.parse(data.get(CASES)).length,2);
});
test('禁止清空、删键及批量覆盖掉已有命盘；清缓存仍保留记录',async()=>{
 const ctx=boot(new Map([[CASES,JSON.stringify([row('a'),row('b')])],['temporary-cache','x']]));await ctx.guard.ready;
 assert.throws(()=>ctx.c.localStorage.setItem(CASES,'[]'),/阻止/);assert.throws(()=>ctx.c.localStorage.setItem(CASES,JSON.stringify([row('a')])),/阻止/);assert.throws(()=>ctx.c.localStorage.removeItem(CASES),/阻止/);
 ctx.c.localStorage.clear();assert.equal(JSON.parse(ctx.data.get(CASES)).length,2);assert.equal(ctx.data.has('temporary-cache'),false);
});
test('旧键迁移保留源数据，已有记录优先，同 GUID 的冲突原文另存',async()=>{
 const legacy=JSON.stringify([row('old'),row('same','旧名字')]);
 const ctx=boot(new Map([['wzbz_local_userlist_v13',legacy],[CASES,JSON.stringify([row('same','新名字')])]]));await ctx.guard.ready;
 assert.equal(ctx.data.get('wzbz_local_userlist_v13'),legacy);const rows=JSON.parse(ctx.data.get(CASES));assert.equal(rows.length,2);assert.equal(rows[0].name,'新名字');assert.ok(ctx.data.get('wzbz_recovery_conflicts_v1').includes('旧名字'));
});
test('历史缓存只在用户选择找回后合并，不把未保存的最近盘自动塞进记录',async()=>{
 const ctx=boot(new Map([['wzbz_recentlyList',JSON.stringify([row('recent')])],[CASES,'[]']]));await ctx.guard.ready;
 assert.equal(ctx.data.get(CASES),'[]');assert.equal(ctx.guard.recoverableCount(),1);assert.equal(await ctx.guard.recoverLegacy(),1);assert.equal(JSON.parse(ctx.data.get(CASES))[0].guid,'recent');
});
test('损坏数据保持原样并阻止初始化，不拿默认示例覆盖',async()=>{
 const raw='[{broken';const ctx=boot(new Map([[CASES,raw]]),{current:snapshot({[CASES]:JSON.stringify([row('old')])})});
 await assert.rejects(ctx.guard.ready);assert.equal(ctx.data.get(CASES),raw);assert.equal(ctx.saved.length,0);
});
test('一个保护副本损坏时仍使用另一有效副本，并保留损坏原文',async()=>{
 const vault={current:snapshot({[CASES]:JSON.stringify([row('a')])}),previous:'broken-backup'};
 const ctx=boot(new Map(),vault);await ctx.guard.ready;assert.equal(JSON.parse(ctx.data.get(CASES))[0].guid,'a');assert.match(ctx.data.get('wzbz_recovery_conflicts_v1'),/broken-backup/);
});
test('原生保存失败可重试，写入队列不会把较旧数据当成最新备份',async()=>{
 const ctx=boot(new Map([[CASES,JSON.stringify([row('a')])]]));await ctx.guard.ready;
 let fail=true;ctx.c.Capacitor.Plugins.DataVault.save=async({payload})=>{if(fail){fail=false;throw Error('disk full');}ctx.vault.current=payload;return {ok:true};};
 ctx.c.localStorage.setItem(NOTES,'{"a":{"content":"新笔记"}}');await assert.rejects(ctx.guard.flush(),/disk full/);assert.match(ctx.data.get(NOTES),/新笔记/);await ctx.guard.flush();assert.match(ctx.vault.current,/新笔记/);
 const pending=[];ctx.c.Capacitor.Plugins.DataVault.save=({payload})=>new Promise(resolve=>pending.push({payload,resolve}));
 ctx.c.localStorage.setItem(NOTES,'{"a":{"content":"中间值"}}');const one=ctx.guard.flush();await Promise.resolve();await Promise.resolve();
 ctx.c.localStorage.setItem(NOTES,'{"a":{"content":"新笔记"}}');const two=ctx.guard.flush();
 pending[0].resolve({ok:true});await one;await Promise.resolve();await Promise.resolve();assert.equal(pending.length,2);assert.match(pending[1].payload,/新笔记/);pending[1].resolve({ok:true});await two;
});
test('保留用户主动标记删除的原行，旧备份不会把它自动复活',async()=>{
 const deleted={...row('a'),isdel:1};const ctx=boot(new Map([[CASES,JSON.stringify([deleted])]]),{current:snapshot({[CASES]:JSON.stringify([row('a')])})});await ctx.guard.ready;
 assert.equal(JSON.parse(ctx.data.get(CASES))[0].isdel,1);assert.equal(JSON.parse(ctx.vault.current).data[CASES],ctx.data.get(CASES));
});
test('合并恢复不会删除现有命盘和笔记，失败事务可以原样回滚',async()=>{
 const ctx=boot(new Map([[CASES,JSON.stringify([row('a')])],[NOTES,'{"a":{"content":"当前"}}']]));await ctx.guard.ready;
 vm.runInContext(fs.readFileSync('dist/static/js/local-backup.js','utf8'),ctx.c);const backup=JSON.parse(ctx.c.WZBZBackup.exportText());backup.data[CASES]=JSON.stringify([row('b')]);backup.data[NOTES]='{"b":{"content":"备份笔记"}}';
 ctx.c.WZBZBackup.restore(JSON.stringify(backup));await ctx.guard.flush();assert.equal(JSON.parse(ctx.data.get(CASES)).length,2);assert.equal(JSON.parse(ctx.data.get(NOTES)).a.content,'当前');assert.equal(JSON.parse(ctx.data.get(NOTES)).b.content,'备份笔记');
 const before=new Map(ctx.data);assert.throws(()=>ctx.guard.transaction([CASES,NOTES],()=>{ctx.c.localStorage.setItem(CASES,JSON.stringify([row('a'),row('b'),row('c')]));throw Error('interrupted');}),/interrupted/);assert.equal(ctx.data.get(CASES),before.get(CASES));await ctx.guard.flush();
});
test('恢复原生设置发生在应用初始化前，不让启动默认值压过原设置',async()=>{
 let resolve;const ctx=boot(new Map(),{}, {read:()=>new Promise(r=>resolve=r)});
 ctx.c.localStorage.setItem('wzbz_preferenceIsShow','{"nightMode":1}');await Promise.resolve();
 resolve({current:snapshot({'wzbz_preferenceIsShow':'{"nightMode":2}'})});await ctx.guard.ready;assert.equal(JSON.parse(ctx.data.get('wzbz_preferenceIsShow')).nightMode,2);
});
test('原生备份需随机访问令牌，令牌不写入备份资料',async()=>{
 let token;const ctx=boot(new Map([[CASES,JSON.stringify([row('a')])]]),{}, {read:async args=>{token=args.token;return {};}});await ctx.guard.ready;
 assert.match(token,/^[a-f0-9]{64}$/);assert.equal(ctx.guard.authorize(token),true);assert.equal(ctx.guard.authorize('invalid'),false);assert.ok(ctx.saved.every(raw=>!raw.includes(token)));
});
test('升级前读回核对失败时拒绝继续，保留原数据',async()=>{
 const ctx=boot(new Map([[CASES,JSON.stringify([row('a')])]]));await ctx.guard.ready;assert.equal(await ctx.guard.checkpoint(),true);
 ctx.c.Capacitor.Plugins.DataVault.read=async()=>({current:snapshot({})});await assert.rejects(ctx.guard.checkpoint(),/备份核对未完成/);assert.equal(JSON.parse(ctx.data.get(CASES))[0].guid,'a');
});
test('立即退出后浏览器副本滞后时，以较新的原生修订恢复笔记，并保留旧内容',async()=>{
 const primary=new Map([[CASES,JSON.stringify([row('a')])],[NOTES,'{"a":{"content":"旧笔记"}}']]),vault={};
 const ctx=boot(primary,vault);await ctx.guard.ready;const stale=new Map(primary);
 ctx.c.localStorage.setItem(NOTES,'{"a":{"content":"新笔记"}}');await ctx.guard.checkpoint();
 const restarted=boot(stale,vault);await restarted.guard.ready;assert.equal(JSON.parse(stale.get(NOTES)).a.content,'新笔记');assert.match(stale.get('wzbz_recovery_conflicts_v1'),/旧笔记/);
 const currentPrimary=new Map(stale);currentPrimary.set(NOTES,'{"a":{"content":"更新的本机笔记"}}');const versions=JSON.parse(currentPrimary.get('wzbz_local_revision_v1'));versions[NOTES]++;currentPrimary.set('wzbz_local_revision_v1',JSON.stringify(versions));
 const next=boot(currentPrimary,vault);await next.guard.ready;assert.equal(JSON.parse(currentPrimary.get(NOTES)).a.content,'更新的本机笔记');
});
test('原名人资料 58 条完整保留、按需加载；失败后可以重试',async()=>{
 const csv=fs.readFileSync('dist/static/data/celebrity-legacy.csv','utf8'),meta=JSON.parse(fs.readFileSync('dist/static/data/celebrity-legacy.source.json','utf8'));
 assert.equal(csv.trim().split('\n').length,58);assert.equal(meta.status,'legacy-unverified');assert.match(csv,/崇祯/);assert.match(csv,/爱因斯坦/);assert.match(csv,/\*\*/);
 let calls=0;const c={AbortController,setTimeout,clearTimeout,fetch:async()=>{calls++;return calls===1?{ok:false,status:503}:{ok:true,text:async()=>csv};}};c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync('dist/static/js/celebrity-library.js','utf8'),c);
 assert.equal(calls,0);await assert.rejects(c.WZBZCelebrityLibrary.load());assert.equal(await c.WZBZCelebrityLibrary.load(),csv.trim().split(/[\r\n]+/).join('\n'));await c.WZBZCelebrityLibrary.load();assert.equal(calls,2);
});
