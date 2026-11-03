const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={};context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync('dist/static/js/note-records.js','utf8'),context);
const defaults=[{name:'旺衰',show:1,type:1,items:'强,弱',index:0}],feedback=[{name:'断事笔记',show:1,type:3,items:''}];

test('损坏的笔记JSON、非数组和混入的空行可以读取，默认结构不被渲染层改写',()=>{
 for(const raw of ['original-feedback','{broken','null','false','{}']){
  const value=context.WZBZNoteRows.read(raw,defaults);assert.equal(value[0].name,'旺衰');value[0].name='edited';assert.equal(defaults[0].name,'旺衰');
 }
 const rows=[null,{name:'有效记录',items:'甲,乙'},{name:null}];const result=context.WZBZNoteRows.read(rows,defaults);assert.equal(result.length,1);result[0].items='changed';assert.equal(rows[1].items,'甲,乙');
});

test('两份排盘组件均能打开原样保留的异常反馈笔记，不再把解析错误当成联网错误',()=>{
 for(const file of ['1.788084fb7fadc440744b.js','2.22f599c1df781213e096.js']){
  const s=fs.readFileSync('dist/static/js/'+file,'utf8'),start=s.indexOf('handleNoteData:function')+'handleNoteData:'.length,end=s.indexOf('this.noteData=e}',start)+'this.noteData=e}'.length;
  const c={window:context,E:defaults,$:defaults,Z:feedback,C:()=>JSON.stringify,z:()=>Array.from};vm.createContext(c);
  const fn=vm.runInContext('('+s.slice(start,end)+')',c),raw={bzData:'broken',feedbackData:'original-feedback'},copy=JSON.stringify(raw),view={caseGuid:'synthetic-case'};
  assert.doesNotThrow(()=>fn.call(view,JSON.parse(copy)));assert.ok(Array.isArray(view.noteData.bzData));assert.ok(Array.isArray(view.noteData.feedbackData));assert.equal(JSON.stringify(raw),copy);
 }
});

test('大运反馈内部数据损坏时只回退显示副本，原始笔记字符串保持不变',()=>{
 const raw=JSON.stringify([{name:'2026年大运',type:2,data:'broken'},{name:'2027年',type:2,data:null}]);const rows=context.WZBZNoteRows.read(raw,[]);
 assert.equal(rows[0].data,'');assert.equal(rows[1].data,'');assert.equal(JSON.parse(raw)[0].data,'broken');
 const valid=JSON.stringify([{name:'2026年大运',type:2,data:JSON.stringify({data:'吉|1|0',list:[{name:'2027年',data:'平|1|0'}]})}]);assert.equal(context.WZBZNoteRows.read(valid,[])[0].data,JSON.parse(valid)[0].data);
});
