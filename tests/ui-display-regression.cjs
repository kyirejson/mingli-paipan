const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=name=>fs.readFileSync('dist/static/js/'+name,'utf8').replace(/\r\n/g,'\n');
function method(name,next){const s=source('fivearts-ui.js'),start=s.indexOf(name+': function'),end=s.indexOf(next+': function',start);return s.slice(start+name.length+2,end).trim().replace(/,$/,'');}
function h(tag,data,children){if(arguments.length===2){children=data;data={};}return {tag,data,children};}
function flatten(n,out=[]){if(Array.isArray(n))n.forEach(x=>flatten(x,out));else if(n&&typeof n==='object'){out.push(n);flatten(n.children,out);}return out;}

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
