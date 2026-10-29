const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function assetsContext(){
 const scripts=[],timers=new Map();let sequence=0;
 const c={Promise,URL,Error,Object,Array,console,setTimeout(fn){timers.set(++sequence,fn);return sequence;},clearTimeout(id){timers.delete(id);},document:{baseURI:'https://localhost/',createElement(){return {remove(){this.removed=true;}}},head:{appendChild(script){scripts.push(script);}}}};
 c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync('dist/static/js/lazy-assets.js','utf8'),c);return {c,scripts,timers};
}
test('题库使用前不加载，并发请求共用一次加载，加载后直接复用',async()=>{
 const {c,scripts}=assetsContext();assert.equal(scripts.length,0);
 const a=c.WZBZAssets.ensure('quiz'),b=c.WZBZAssets.ensure('quiz');assert.equal(a,b);assert.equal(scripts.length,1);
 c.__WZBZ_TILIN_ALL__={sample:{}};scripts[0].onload();await Promise.all([a,b]);await c.WZBZAssets.ensure('quiz');assert.equal(scripts.length,1);
});
test('题库加载失败、内容缺失和超时允许重试',async()=>{
 const {c,scripts,timers}=assetsContext();let p=c.WZBZAssets.ensure('quiz');scripts[0].onerror();await assert.rejects(p,/加载失败/);assert.ok(scripts[0].removed);
 p=c.WZBZAssets.ensure('quiz');scripts[1].onload();await assert.rejects(p,/内容不完整/);
 p=c.WZBZAssets.ensure('quiz');[...timers.values()][0]();await assert.rejects(p,/加载超时/);
 p=c.WZBZAssets.ensure('quiz');c.__WZBZ_TILIN_ALL__={};scripts[3].onload();await p;
});
function bridgeContext(){
 const a=assetsContext(),calls=[];a.c.dispatchLocal=cfg=>{calls.push(cfg);return Promise.resolve({data:{code:0}})};a.c.localError=(code,message)=>Object.assign(Error(message),{localCode:code});
 const s=fs.readFileSync('dist/static/js/wzbz-native-bridge.js','utf8');vm.runInContext(s.slice(s.indexOf('  function localDispatchFailure'),s.indexOf('  // Intercept window.fetch')),a.c);return {...a,calls};
}
test('题目读取和成绩提交等待题库，普通排盘请求不触发题库加载',async()=>{
 const {c,scripts,calls}=bridgeContext(),dispatch=c.__WZBZ_AXIOS_INTERCEPT__;
 await dispatch({url:'https://localhost/getbasebz8.php'});assert.equal(scripts.length,0);
 const read=dispatch({url:'https://localhost/getQuestions.php'}),save=dispatch({url:'https://localhost/postSubmitLevel'});assert.equal(calls.length,1);assert.equal(scripts.length,1);
 c.__WZBZ_TILIN_ALL__={};scripts[0].onload();await Promise.all([read,save]);assert.equal(calls.length,3);
});
test('题库资源失败时返回明确错误，成绩不写入且不转发原服务器',async()=>{
 const {c,scripts,calls}=bridgeContext();const p=c.__WZBZ_AXIOS_INTERCEPT__({url:'https://localhost/postSubmitLevel'},()=>{throw Error('must not forward')});scripts[0].onerror();
 await assert.rejects(p,error=>error.response.status===503&&/题库加载失败/.test(error.message));assert.equal(calls.length,0);
});
function slideContext(){
 const frames=new Map(),ticks=[];let id=0;const c={global:{cancelIdleCallback(){}},ui:{preferences:{order:['bazi','ziwei','qimen','liuyao','meihua']}},V:{set(o,k,v){o[k]=v}},requestAnimationFrame(fn){frames.set(++id,fn);return id},cancelAnimationFrame(n){frames.delete(n)},setTimeout(){return 1},clearTimeout(){}};vm.createContext(c);
 const s=fs.readFileSync('dist/static/js/fivearts-ui.js','utf8'),start=s.indexOf('        slideTo: function('),end=s.indexOf('        change:',start),source=s.slice(start,end).trim().replace(/^slideTo: /,'').replace(/,$/,'');
 const slide=vm.runInContext('('+source+')',c),host={_slideRequest:0,active:'bazi',renderedTabs:{bazi:true,ziwei:true},$refs:{sliderTrack:{style:{transform:'translate3d(0%, 0, 0)'}}},$nextTick(fn){ticks.push(fn)},settleSlide(){}};
 return {host,slide(index){slide.call(host,index)},tick(){while(ticks.length)ticks.shift()()},frame(){const queue=[...frames];frames.clear();queue.forEach(([,f])=>f())}};
}
test('首次切盘先挂载目标，等待绘制机会再启动动画；已挂载盘直接切换',()=>{
 const s=slideContext();s.slide(2);assert.equal(s.host.active,'bazi');assert.equal(s.host.renderedTabs.qimen,true);s.tick();s.frame();assert.equal(s.host.active,'bazi');s.frame();assert.equal(s.host.active,'qimen');assert.match(s.host.$refs.sliderTrack.style.transition,/0.22s/);
 s.slide(1);assert.equal(s.host.active,'ziwei');
});
test('快速连续选择时只执行最后一次切盘，销毁后不执行待开始动画',()=>{
 const s=slideContext();s.slide(2);s.slide(4);s.tick();s.frame();s.frame();assert.equal(s.host.active,'meihua');
 const destroyed=slideContext();destroyed.slide(2);destroyed.host._isDestroyed=true;destroyed.tick();destroyed.frame();destroyed.frame();assert.equal(destroyed.host.active,'bazi');
});
test('手指拖动期间只更新位移，不挂载未打开的相邻盘',()=>{
 const s=fs.readFileSync('dist/static/js/fivearts-ui.js','utf8'),start=s.indexOf('        touchMove: function('),end=s.indexOf('        touchEnd:',start),source=s.slice(start,end).trim().replace(/^touchMove: /,'').replace(/,$/,'');
 const c={ui:{preferences:{order:['bazi','ziwei','qimen','liuyao','meihua']}},V:{set(){throw Error('must not mount while dragging')}},clearTimeout(){},requestAnimationFrame(){return 1}};vm.createContext(c);const move=vm.runInContext('('+source+')',c),host={_touch:{startX:350,startY:500,direction:null},active:'ziwei',renderedTabs:{bazi:true,ziwei:true}};
 move.call(host,{touches:[{clientX:100,clientY:500}],cancelable:true,preventDefault(){},stopPropagation(){}});assert.equal(host._isDragging,true);assert.equal(host.renderedTabs.qimen,undefined);assert.equal(host._dragOffset,-250);
});
test('两份排盘组件中的解说监听都在销毁时解除',()=>{
 for(const name of ['1.788084fb7fadc440744b.js','2.22f599c1df781213e096.js']){
  const s=fs.readFileSync('dist/static/js/'+name,'utf8'),start=s.indexOf('{name:"SmartBook"'),match=s.slice(start).match(/},(?:\$e|Ee)=\{render:/);assert.ok(start>=0&&match,name);
  const source=s.slice(start,start+match.index+1),events=new Map(),c={R:{r:null,t:null},F:{r:null,t:null},console,window:{addEventListener(k,v){events.set(k,v)},removeEventListener(k,v){assert.equal(events.get(k),v);events.delete(k)}}};vm.createContext(c);const options=vm.runInContext('('+source+')',c);
  const bus={handlers:new Map(),$on(k,v){this.handlers.set(k,v)},$off(k,v){assert.equal(this.handlers.get(k),v);this.handlers.delete(k)}};const view={$EventBus:bus,initData(){},$refs:{}};
  options.created.call(view);assert.equal(bus.handlers.size,2);assert.equal(events.size,1);options.beforeDestroy.call(view);assert.equal(bus.handlers.size,0);assert.equal(events.size,0);
 }
});
