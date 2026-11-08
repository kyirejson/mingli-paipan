const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=name=>fs.readFileSync('dist/static/js/'+name,'utf8').replace(/\r\n/g,'\n');
function method(name,next){const s=source('fivearts-ui.js'),start=s.indexOf(name+': function'),end=s.indexOf(next+': function',start);return s.slice(start+name.length+2,end).trim().replace(/,$/,'');}
function h(tag,data,children){if(arguments.length===2){children=data;data={};}return {tag,data,children};}
function flatten(n,out=[]){if(Array.isArray(n))n.forEach(x=>flatten(x,out));else if(n&&typeof n==='object'){out.push(n);flatten(n.children,out);}return out;}

test('无框双栏六爻逐爻显示状态、动变与五行，六亲和动爻标记分列',()=>{
 const c={console,Date,Intl,Math,JSON,Map,Set,h};c.window=c;vm.createContext(c);
 for(const file of ['time-policy.js','fivearts-engine.js','divination-calendar-fix.js'])vm.runInContext(source(file),c);
 c.E=c.FiveArtsEngine;c.calendarDetails=()=>null;c.renderLiuyaoReading=()=>null;
 const s=source('fivearts-ui.js');vm.runInContext(s.slice(s.indexOf('  function renderLiuyao(h,r){'),s.indexOf('\n  function renderQimen(')),c);
 function text(n){if(Array.isArray(n))return n.map(text).join('');return n&&typeof n==='object'?text(n.children):n==null?'':String(n);}
 for(const config of [{upper:7,lower:8,moving:[]},{upper:7,lower:8,moving:[1]},{upper:7,lower:8,moving:[1,2,3,4,5,6]},{upper:1,lower:8,moving:[2,4]}])for(const useIndex of [1,3,6]){
  const r=c.E.liuyao('2026-10-29 12:00',{method:'specified',...config}),before=JSON.stringify([r.rows,r.changedRows,r.moving]),v={yongIndex:useIndex,session:{modules:{liuyao:{method:'time'}}}},a=c.E.liuyaoAnnotations(r),relations=Array.from(c.E.yongshen(r.rows,useIndex));
  const nodes=flatten(c.renderLiuyao.call(v,h,r)),rows=nodes.filter(n=>n.data?.class?.[0]==='fa-liu-row');assert.deepEqual(rows.map(n=>n.data.attrs['data-line']),[6,5,4,3,2,1]);
  for(const row of r.rows){
   const pair=rows.find(n=>n.data.attrs['data-line']===row.index),items=flatten(pair),halves=pair.children.filter(n=>n?.data?.class?.[0]==='fa-liu-cell');assert.equal(halves.length,2);
   assert.ok(text(pair).includes(row.god));assert.ok(text(halves[0]).includes(row.role+row.ganzhi+row.element));
   const side=pair.children.find(n=>n?.data?.class==='fa-liu-god'),relation=flatten(side).filter(n=>n.data?.class?.[0]==='fa-role-tag');
   assert.equal(relation.length,1);assert.equal(text(relation[0]),relations[row.index-1]+'神');
   assert.ok(relation[0].data.attrs.title.includes('相对第'+useIndex+'爻用神'));
   assert.equal(items.filter(n=>n.data?.class?.[0]==='fa-role-tag').length,1);
   if(row.hidden)assert.ok(text(pair).includes(row.hidden.role+row.hidden.ganzhi+row.hidden.element));
   const annotation=a.rows[row.index-1],left=flatten(halves[0]),right=flatten(halves[1]);
   assert.equal(left.find(n=>n.data?.class==='fa-liu-role').children[0],row.role);
   const glyph=left.find(n=>n.data?.class==='fa-moving-mark');assert.equal(text(glyph),row.moving?(row.yang?'○':'×'):'');
   assert.equal(glyph.data.class,'fa-moving-mark');assert.notEqual(glyph,left.find(n=>n.data?.class==='fa-liu-role'));
   assert.equal(text(items.find(n=>n.data?.class==='fa-liu-arrow')),row.moving?'→':'');
   const leftStates=left.filter(n=>n.data?.class?.[0]==='fa-liu-state').map(text),rightStates=right.filter(n=>n.data?.class?.[0]==='fa-liu-state').map(text);
   assert.deepEqual(leftStates,Array.from(annotation.tags.concat(annotation.changes)));assert.deepEqual(rightStates,Array.from(annotation.changedTags));
   assert.ok(left.some(n=>n.data?.class?.[0]==='fa-liu-element'));assert.ok(!left.concat(right).some(n=>n.data?.class?.[0]==='fa-role-tag'));
   halves[0].data.on.click();assert.equal(v.liuyaoSelected,row.index);assert.equal(v.liuyaoSide,'main');assert.equal(v.yongIndex,useIndex);halves[1].data.on.click();assert.equal(v.liuyaoSide,'changed');assert.equal(v.yongIndex,useIndex);
  }
  assert.equal(nodes.filter(n=>n.data?.class==='fa-moving-mark'&&text(n)).length,config.moving.length);assert.equal(JSON.stringify([r.rows,r.changedRows,r.moving]),before);
 }
});

test('主题以 body 为来源，同步根变量入口及原生控件配色，支持日夜反复切换',()=>{
 let mode=null,callback,observed,attributes={};
 const body={getAttribute:()=>mode},document={body,documentElement:{setAttribute:(k,v)=>attributes[k]=v,style:{}},addEventListener(){}};
 const c={document,MutationObserver:class{constructor(fn){callback=fn;}observe(el,opts){observed={el,opts};}},addEventListener(){}};c.window=c;vm.createContext(c);vm.runInContext(source('paper-forest.js'),c);
 assert.equal(attributes['data-theme'],'light');assert.equal(document.documentElement.style.colorScheme,'light');assert.equal(observed.el,body);
 for(const value of ['dark','light','dark',null]){mode=value;callback();assert.equal(attributes['data-theme'],value==='dark'?'dark':'light');assert.equal(document.documentElement.style.colorScheme,value==='dark'?'dark':'light');}
});

test('两份旧排盘组件在 iframe 已移除时切主题不抛错，有效窗口仍收到消息',()=>{
 for(const file of ['1.788084fb7fadc440744b.js','2.22f599c1df781213e096.js']){
  const s=source(file),start=s.indexOf('onToggleTheme:function(){var e=this.$refs.bzppIframe;');assert.ok(start>=0);
  const fn=vm.runInNewContext('('+s.slice(start+'onToggleTheme:'.length,s.indexOf(',cancle:',start))+')');
  for(const frame of [undefined,{}, {contentWindow:null}])assert.doesNotThrow(()=>fn.call({$refs:{bzppIframe:frame},isDark:true}));
  const received=[];fn.call({$refs:{bzppIframe:{contentWindow:{postMessage:(message,origin)=>received.push([message,origin])}}},isDark:true});
  assert.equal(received.length,1);assert.equal(received[0][0].type,'changeMode');assert.equal(received[0][0].data,true);
 }
});

test('旧八字滑块在最终布局帧后重新测量，合并连续请求，销毁前不排入新工作',()=>{
 const frames=new Map();let id=0,resizes=0,queries=0,ticks=[];
 const c={requestAnimationFrame(fn){frames.set(++id,fn);return id;},cancelAnimationFrame(key){frames.delete(key);}};vm.createContext(c);
 const fn=vm.runInContext('('+method('refreshLegacySize','assistantToNote')+')',c);
 const view={$nextTick:fn=>ticks.push(fn),$el:{querySelector(selector){queries++;assert.match(selector,/van-swipe/);return {__vue__:{resize(){resizes++;}}};}}};
 fn.call(view);fn.call(view);ticks.splice(0).forEach(fn=>fn());assert.equal(frames.size,1);assert.equal(resizes,0);
 [...frames.values()][0]();assert.equal(resizes,1);assert.equal(queries,1);frames.clear();
 fn.call(view);view._isDestroyed=true;ticks.splice(0).forEach(fn=>fn());assert.equal(frames.size,0);
});

test('紫微默认保留大限流年，展开后五层运限和起时选中逻辑均保留',()=>{
 const s=source('fivearts-ui.js'),start=s.indexOf('renderZiweiFlows: function(h, r, full)'),end=s.indexOf('\n      },',start);
 const rows=['decadal','yearly','monthly','daily','hourly'].map((scope,i)=>({scope,label:scope,items:[{label:'测试'+i,gz:'甲子',date:'2026-10-30',hour:i===4?6:undefined}]}));
 const c={h,button:(h,label,click,cls)=>h('button',{class:cls,on:{click}},label),getCachedHoroscope:()=>({decadal:{index:0}}),global:{WZBZFlowData:{get:()=>({rows,year:2026,day:30})}}};vm.createContext(c);
 const fn=vm.runInContext('('+s.slice(start+'renderZiweiFlows: '.length,end)+'\n      })',c),view={flowDate:'2026-10-30',flowHour:0,ziweiMoreFlows:false};
 let tree=fn.call(view,h,{chart:{}},true),nodes=flatten(tree);assert.deepEqual(nodes.filter(n=>n.data?.attrs?.['data-flow-scope']).map(n=>n.data.attrs['data-flow-scope']),['decadal','yearly']);
 nodes.find(n=>n.data?.class==='fa-more-flows').data.on.click();tree=fn.call(view,h,{chart:{}},true);nodes=flatten(tree);
 assert.deepEqual(nodes.filter(n=>n.data?.attrs?.['data-flow-scope']).map(n=>n.data.attrs['data-flow-scope']),rows.map(r=>r.scope));
 const hourly=nodes.find(n=>n.data?.attrs?.['data-flow-scope']==='hourly');flatten(hourly).find(n=>n.tag==='button').data.on.click();assert.equal(view.flowHour,6);assert.equal(view.flowScope,'hourly');assert.equal(view.flowDate,'2026-10-30');
 nodes.find(n=>n.data?.class==='fa-more-flows').data.on.click();assert.equal(view.ziweiMoreFlows,false);
});

test('司令原始占位值显示暂无数据，正常内容和隐私遮罩分别保留',()=>{
 const c={console,localStorage:{getItem(){return null;}},PaperForest:{icon(){return null;}}};c.window=c;vm.createContext(c);vm.runInContext(source('paper-forest-details.js'),c);
 function text(raw,display){const v={infoData:{rysl:raw,unknowhour:1},infoLabelArr:['','','','','人元司令分野'],infoLabelValArr:['a','b','c','d','rysl'],rysl:{switch:true},getInfoDisplayValue:()=>display,showInfoExtra:()=>false,chengguDatas:{},xzWXPTabArr:[],wxArr:[],wxData:[]};return flatten(c.PaperForestDetails.renderBasicInfo.call(v,h)).find(n=>n.data?.class==='pf-info-value').children[0];}
 assert.equal(text('*','*'),'暂无数据');assert.equal(text('癸水用事','癸水用事'),'癸水用事');assert.equal(text('癸水用事','***'),'***');
});

test('宫位详读逐宫保留当前盘式星曜、运限和年龄，切宫不改写命盘与会话',()=>{
 const s=source('fivearts-ui.js'),start=s.indexOf('  function openPalaceReading('),end=s.indexOf('  function modalContents(',start),ui={};
 const branches='子丑寅卯辰巳午未申酉戌亥'.split(''),chart={palaces:branches.map((branch,i)=>({name:i===0?'命宫':i===1?'仆役':'宫'+i,heavenlyStem:'甲',earthlyBranch:branch,isBodyPalace:i===2,isOriginalPalace:i===3,decadal:{range:[i*10+1,i*10+10]},ages:[i+1,i+13,i+25,i+37,i+49],changsheng12:'长生'+i,boshi12:'博士'+i,jiangqian12:'将前'+i,suiqian12:'岁前'+i}))};
 const session={guid:'retained-case'},host={owner:{},session},flow={name:'流年',palaceNames:branches.map((_,i)=>'流宫'+i),mutagen:['星0','','','']},horoscope={decadal:{palaceNames:branches.map((_,i)=>'限宫'+i)}};
 const c={ui,E:{ZHI:branches},open(owner,type,scope){assert.equal(owner,host.owner);assert.equal(type,'palace');assert.equal(scope,session);},getCachedPalaceStars(chart,p,mode,flow,index){return [{name:'星'+index,brightness:'庙',mutagen:index===0?'禄':''}];},getCachedTransformations(chart,index){return [{star:'星'+index,code:'A',target:(index+1)%12}];},choices:(h,pairs,value,change)=>({tag:'choices',pairs,value,change})};vm.createContext(c);vm.runInContext(s.slice(start,end),c);
 const original=JSON.stringify({chart,session});c.openPalaceReading(host,{chart},'sanhe',flow,horoscope,2026,2000,0,5);
 assert.equal(ui.editor.selected,5);assert.equal(ui.editor.palaces.length,12);assert.equal(ui.editor.palaces[1].name,'交友');
 for(let i=0;i<12;i++){let p=ui.editor.palaces[i];assert.equal(p.stars[0].name,'星'+i);assert.equal(p.stars[0].brightness,'庙');assert.ok(p.rows.some(([k,v])=>k==='小限'&&v.includes(i+49+'岁')));assert.ok(p.rows.some(([k,v])=>k==='本宫四化'&&v==='星'+i+'化禄 → '+chart.palaces[(i+1)%12].name));assert.ok(p.rows.some(([k,v])=>k==='流年'&&v==='流宫'+i));}
 assert.equal(ui.editor.palaces[0].stars[0].flowMutagen,'流禄');
 let tree=c.renderPalaceReading(h,ui.editor);flatten(tree).find(n=>n.tag==='choices').change(10);assert.equal(ui.editor.selected,10);assert.equal(JSON.stringify({chart,session}),original);
});

test('六爻状态三色分流、主次爻行标记、首屏纳甲要点与静爻折叠保留全部六爻资料',()=>{
 const c={console,Date,Intl,Math,JSON,Map,Set,h};c.window=c;c.global=c;vm.createContext(c);
 for(const file of ['time-policy.js','fivearts-engine.js','divination-calendar-fix.js','fivearts-readings.js','liuyao-reading.js'])vm.runInContext(source(file),c);
 c.E=c.FiveArtsEngine;c.readingData=c.FiveArtsReadingsData;c.readingPromise=null;c.ui={readingStatus:'ready'};
 c.heading=(h,t)=>h('h3',{},[t]);c.button=(h,l,fn,cls)=>h('button',{class:cls,on:{click:fn}},[l]);c.sourceLink=(h,l,u)=>h('a',{attrs:{href:u}},[l]);c.openGua=()=>{};c.openClassic=()=>{};c.calendarDetails=()=>null;c.V={set(o,k,v){o[k]=v;}};c.saveSession=()=>{};
 const s=source('fivearts-ui.js');vm.runInContext(s.slice(s.indexOf('  function guaLineStructure'),s.indexOf('\n  function renderQimen(')),c);
 function text(n){if(Array.isArray(n))return n.map(text).join('');return n&&typeof n==='object'?text(n.children):n==null?'':String(n);}
 const r=c.E.liuyao('2026-10-29 12:00',{method:'specified',upper:1,lower:8,moving:[2,5]}),view={yongIndex:2,liuyaoSelected:2,liuyaoSide:'main',liuyaoManualUse:true,liuyaoTopic:'all',session:{liuyaoReference:'huangjince',modules:{liuyao:{method:'specified'}}}};
 const tree=c.renderLiuyao.call(view,h,r),nodes=flatten(tree);
 const rows=nodes.filter(n=>n.data?.class?.[0]==='fa-liu-row');assert.equal(rows.length,6);
 const yongRow=rows.find(n=>n.data.attrs['data-line']===2);assert.equal(yongRow.data.class[1]['is-yong-row'],true);assert.equal(yongRow.data.class[1]['is-moving-row'],true);
 const states=nodes.filter(n=>n.data?.class?.[0]==='fa-liu-state');assert.ok(states.some(n=>n.data.class[1]['is-boost']));assert.ok(states.some(n=>n.data.class[1]['is-alert']));
 const najia=nodes.find(n=>n.data?.class==='fa-liuyao-najia-summary');assert.ok(najia);assert.match(text(najia),/本盘纳甲要点 · 黄金策/);assert.match(text(najia),/【应期参考】.*第2爻/);
 const lineArticles=nodes.filter(n=>n.data?.class?.[0]==='fa-liuyao-line-reading');assert.equal(lineArticles.length,6);
 const quietDetails=nodes.find(n=>n.data?.class==='fa-liuyao-quiet-lines');assert.ok(quietDetails);assert.equal(flatten(quietDetails).filter(n=>n.data?.class?.[0]==='fa-liuyao-line-reading').length,3);
});

test('紫微三合盘保留天厨等全部杂曜，本宫详解同步合成总括与当前运限叠宫且无重复ID',()=>{
 const {setup}=require('./helpers/ziwei-reading.cjs'),{c,data}=setup();
 let comp;c.WZBZReading.register({component:(k,o)=>comp=o});
 const s=source('fivearts-ui.js');vm.runInContext(s.slice(s.indexOf('  function ziweiPalaceStars('),s.indexOf('  function getCachedTransformations(')),c);
 const r=c.FiveArtsEngine.ziwei('1990-05-15 10:30','男'),horo=r.chart.horoscope('2026-11-08',5);
 const allSanheStars=r.chart.palaces.flatMap((p,i)=>c.ziweiPalaceStars(p,'sanhe',horo.yearly,i).map(x=>x.name));
 const allAdjective=r.chart.palaces.flatMap(p=>p.adjectiveStars.map(x=>x.name));
 for(const name of allAdjective)assert.ok(allSanheStars.includes(name),'missing star: '+name);
 function text(n){if(Array.isArray(n))return n.map(text).join('');return n&&typeof n==='object'?text(n.children):n==null?'':String(n);}
 const inst={enabled:true,chart:r.chart,selected:0,mode:'sanhe',flights:[],flow:horo.yearly,flowScope:'yearly',flowDate:'2026-11-08',bank:data,status:'ready',error:'',near:true,tab:'palace',allPalaces:true};
 inst.view=comp.computed.view.call(inst);
 const tree=comp.render.call(inst,h),nodes=flatten(tree);
 const summaries=nodes.filter(n=>n.data?.class==='zr-palace-summary'),flows=nodes.filter(n=>n.data?.class==='zr-flow-banner');
 assert.equal(summaries.length,12);assert.equal(flows.length,12);
 summaries.forEach(n=>assert.match(text(n),/【本宫总括】/));
 flows.forEach(n=>assert.match(text(n),/【当前流年叠宫】.*2026-11-08/));
 const ids=nodes.filter(n=>n.data?.attrs?.['data-reading-id']).map(n=>n.data.attrs['data-reading-id']);
 assert.equal(new Set(ids).size,ids.length);
});
