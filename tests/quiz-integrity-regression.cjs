const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const plain=x=>JSON.parse(JSON.stringify(x));
function context(){const data=new Map(),c={console,Date,Intl,Math,JSON,Map,Set,Promise,setTimeout,removeEventListener(){},localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)}};c.window=c;vm.createContext(c);for(const file of ['quiz-integrity.js','tiku-data.js'])vm.runInContext(fs.readFileSync('dist/static/js/'+file,'utf8'),c);return {c,data,q:c.WZBZQuiz};}
function catalog(c){let exports={};c.webpackJsonp=(ids,modules)=>modules.RR1C({},exports,{d:(target,key,get)=>Object.defineProperty(target,key,{get})});vm.runInContext(fs.readFileSync('dist/static/js/94.95aef4ca71071d1d3ea0.js','utf8'),c);return exports;}

test('JSON与运行时题库完全一致：1763条原记录保留、隔离两道不成立四柱、活动题均有唯一选项和有效答案',()=>{
 const {c,q}=context();assert.deepEqual(plain(c.__WZBZ_TILIN_ALL__),JSON.parse(fs.readFileSync('dist/static/data/tiku_tilin_all.json','utf8')));let total=0,active=0,ids=new Set();
 for(const [group,rows] of Object.entries(c.__WZBZ_TILIN_ALL__))for(const [id,row] of Object.entries(rows)){total++;assert.equal(id,row.id);assert.ok(!ids.has(id));ids.add(id);if(row.auditIssue)continue;active++;let options=row.options.split('|');assert.equal(options.length,new Set(options).size,id);assert.ok(options.every(x=>x.trim()));assert.match(row.answer,/^[0-3]$/);assert.ok(row.content.trim()&&row.analysis.trim());assert.ok(q.questionSet(group)[id]);}
 assert.equal(total,1763);assert.equal(active,1761);assert.ok(!q.questionSet('0503000')['0503045']);assert.ok(!q.questionSet('0504000')['0504003']);
});

test('35关真实晋级分数与目录一致，低于90/80/70分不再按60分误判通过',()=>{
 const {c,q}=context(),levels=catalog(c).tilinCatalog;for(const level of levels)for(const child of level.children){assert.equal(q.threshold(child.id),level.advanceScore);assert.equal(q.passed({score:level.advanceScore-1},child.id),false);assert.equal(q.passed({score:level.advanceScore},child.id),true);}assert.equal(q.passed({score:100},'not-a-level'),false);
});

test('习题35目录均复用真实本地题、数量准确，读取副本不会污染原题',()=>{
 const {c,q}=context(),exports=catalog(c),practice=exports.xitiCatalog;assert.equal(practice.length,7);
 for(let g=0;g<7;g++)for(let j=0;j<5;j++){const child=practice[g].children[j],source=exports.tilinCatalog[g].children[j],rows=q.questionSet(child.id);assert.ok(child.id.startsWith(practice[g].id.slice(0,3)));assert.equal(Object.keys(rows).length,child.total);assert.deepEqual(plain(rows),plain(q.questionSet(source.id)));const first=Object.keys(rows)[0];rows[first].answer='99';assert.notEqual(q.questionSet(source.id)[first].answer,'99');}
});

test('重做低分保留历史通过状态和最佳一场的完整数据，累计次数仍增长',()=>{
 const {q}=context(),first=q.attempt('0101000',{}, {correct:9,wrong:1,usetime:10}),retry=q.attempt('0101000',first,{correct:4,wrong:6,usetime:20});assert.equal(first.score,90);assert.equal(retry.score,40);assert.equal(retry.bestScore,90);assert.equal(retry.bestAttempt.usetime,10);assert.equal(retry.mytotal,20);assert.equal(retry.mycorrect,13);assert.equal(q.passed(retry,'0101000'),true);
 const migrated=q.attempt('0101000',{score:95,usetime:12,correct:19,wrong:1},{correct:1,wrong:9,usetime:25});assert.equal(migrated.bestScore,95);assert.equal(migrated.bestAttempt.correct,19);
});

test('晋级只统计连续完成的关卡，不因后面一关分高就把中间关卡全标通过',()=>{
 const {q}=context();assert.equal(q.maxCleared({'0102000':{score:100}}),0);assert.equal(q.maxCleared({'0101000':{score:90},'0102000':{score:89},'0103000':{score:100}}),101000);assert.equal(q.maxCleared({'0101000':{score:90},'0102000':{score:90}}),102000);
});

test('无题、负数、小数数量、超题量和非法用时拒绝写入；成绩按实际答题数计算',()=>{
 const {q}=context();for(const values of [{correct:0,wrong:0},{correct:-1,wrong:2},{correct:.5,wrong:.5},{correct:100,wrong:0},{correct:1,wrong:0,usetime:-1}])assert.throws(()=>q.attempt('0101000',{},values));assert.equal(q.attempt('0101000',{}, {correct:2,wrong:1,score:999}).score,66);
});

test('练习重开恢复真实选项、对错和本机次数；不把练习答案带入闯关考试',()=>{
 const {q,data}=context();data.set('wzbz_local_tiku_v14',JSON.stringify({student:{answers:{'0101001':{answer:'D',status:'1',total:2,correct:1}}}}));const source={id:'0101001',answer:'3',options:'A|B|C|D'},row=q.prepareQuestion(source,{type:'xiti',userguid:'student'});assert.equal(row.myanswer,'3');assert.equal(row.status,'1');assert.equal(row.replyNumSelf,2);assert.equal(row.replyNum,0);assert.equal(q.prepareQuestion(source,{type:'tilin',userguid:'student'}).myanswer,undefined);assert.equal(source.myanswer,undefined);
});

function owner(){const events=[],notices=[],questions=[{id:'0101001',answer:'3',t_optionList:[{id:3,selected:true}]},{id:'0101002',answer:'2',t_optionList:[{id:1,selected:true}]}];return {events,notices,questions,testData:{id:'0100000',cid:'0101000',advanceScore:90,questions},userguid:'student',title:'test',$refs:{footerRef:{duration:5}},$store:{dispatch:(key,value)=>events.push({key,value})},$toast:{fail:message=>notices.push(message)},handleSubmitQuestion(q){q.t_isDone=true;},updateLevelList(){events.push('levels');},$router:{replace:path=>events.push(path)}};}

test('成绩提交失败退出加载、保留原选择且不泄露答案，可再次重试',async()=>{
 const {q,data}=context(),view=owner();await q.submitLevel(view,async()=>{throw Error('存储空间不足')});assert.equal(view.notices[0],'存储空间不足');assert.equal(view.testData.t_isDone,undefined);assert.equal(view.questions[0].t_isDone,undefined);assert.equal(view.questions[0].t_optionList[0].selected,true);assert.equal(data.has('school_tilin_resultData'),false);assert.equal(view.events.at(-1).value.show,false);assert.equal(view._quizSubmitting,false);
});

test('快速重复提交只保存一次；保存成功后显示真实得分并直接替换评分页',async()=>{
 const {q,data}=context(),view=owner();let resolve,calls=0,payload;const pending=new Promise(r=>resolve=r),send=async values=>{calls++;payload=values;await pending;return {data:{code:0}}};const first=q.submitLevel(view,send);await q.submitLevel(view,send);assert.equal(calls,1);resolve();await first;assert.equal(payload.score,50);assert.equal(payload.content,'0101001:1,0101002:0');const result=JSON.parse(data.get('school_tilin_resultData'));assert.equal(result.wrongNum,1);assert.equal(result.cleared,0);assert.ok(view.events.some(x=>x.name==='SchoolTestResult'));assert.equal(view.events.at(-1).value.show,false);
});

test('未完成的答题不能提交，正确判断使用原选项ID而非随机显示字母',async()=>{
 const {q}=context(),view=owner();view.questions[1].t_optionList[0].selected=false;let calls=0;await q.submitLevel(view,()=>calls++);assert.equal(calls,0);assert.match(view.notices[0],/完成全部/);assert.equal(q.grade([{answer:'0',t_optionList:[{id:2,selected:false,code:'A'},{id:0,selected:true,code:'D'}]}]).score,100);
});

test('有效命例的年上起月、日上起时、附带日期与性别一致，不为错盘保留跳转',()=>{
 const {c}=context();for(const file of ['lunar.js','time-policy.js','bazi-reverse.js'])vm.runInContext(fs.readFileSync('dist/static/js/'+file,'utf8'),c);const g='甲乙丙丁戊己庚辛壬癸',z='子丑寅卯辰巳午未申酉戌亥',pair='(['+g+']['+z+'])',rx=new RegExp(pair+'[年\\s，,、]*'+pair+'[月\\s，,、]*'+pair+'[日\\s，,、]*'+pair);let cases=0,extras=0;
 for(const rows of Object.values(c.__WZBZ_TILIN_ALL__))for(const q of Object.values(rows)){if(q.auditIssue)continue;const m=q.content.match(rx);if(!m)continue;cases++;const p=m.slice(1);assert.equal(g.indexOf(p[1][0]),((g.indexOf(p[0][0])%5)*2+2+(z.indexOf(p[1][1])+10)%12)%10,q.id);assert.equal(g.indexOf(p[3][0]),((g.indexOf(p[2][0])%5)*2+z.indexOf(p[3][1]))%10,q.id);if(q.extra){extras++;assert.match(q.extra,/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}\|[01]$/);const [date,sex]=q.extra.split('|'),solar=c.Solar.fromYmdHms(...date.split(/[- :]/).map(Number),0);assert.equal(c.WZBZBaziReverse.pillars(solar,true).join(''),p.join(''),q.id);if(/^(男|乾)/.test(q.content))assert.equal(sex,'1',q.id);if(/^(女|坤)/.test(q.content))assert.equal(sex,'0',q.id);}}
 assert.ok(cases>=310);assert.ok(extras>=260);
});

test('旧练习调用方忽略返回值时仍能生成原对象选项，随机显示不污染答案ID',()=>{
 const {c,q,data}=context(),s=fs.readFileSync('dist/static/js/11.17cdb4427b706e032f4f.js','utf8'),start=s.indexOf('getInitQuestionDetail:function'),end=s.indexOf('getPreloadQids:function',start);c.j={Q:rows=>rows.reverse()};const fn=vm.runInContext('('+s.slice(start+'getInitQuestionDetail:'.length,end).replace(/,$/,'')+')',c);
 const input=q.questionSet('101001000')['0101001'];fn.call({type:'xiti',userguid:'student'},input);assert.equal(input.t_optionList.length,4);assert.equal(input.replyNum,0);assert.equal(input.correctNum,0);assert.equal(input.t_answerStr,'D');
 const exam=q.questionSet('0101000')['0101001'];fn.call({type:'tilin',userguid:'student'},exam);assert.equal(exam.t_answerStr,'A');assert.equal(exam.t_optionList[0].id,3);assert.equal(q.chapterNumber('101000000'),1);assert.equal(q.chapterNumber('013000000'),13);
});

function exerciseOwner(){const v=owner();v.type='xiti';v.curIndex=0;v.curQuestion=v.questions[0];v.showFooterBtns=true;v.updateExerciseList=()=>v.events.push('exercise');v.updateCurExerciseData=()=>v.events.push('current');v.updateCurTermQuestion=()=>v.events.push('related');v.handleFooterStatus=()=>v.events.push('footer');return v;}

test('练习保存失败不显示正确答案、不改变统计，按钮保留以便重试',async()=>{
 const {q}=context(),view=exerciseOwner();await q.handleQuestion(view,'submit',async()=>{throw Error('空间不足')});assert.equal(view.curQuestion.t_isDone,undefined);assert.equal(view.showFooterBtns,true);assert.equal(view.events.length,0);assert.equal(view.notices[0],'空间不足');assert.equal(view._quizSubmitting,false);
});

test('练习保存成功才更新解析和进度，保存原选项ID而非显示顺序',async()=>{
 const {q}=context(),view=exerciseOwner();view.curQuestion.t_optionList[0].code='A';let payload;await q.handleQuestion(view,'submit',async value=>{payload=value;return {data:{code:0}}});assert.equal(payload.ans,'D');assert.equal(payload.status,'1');assert.equal(view.showFooterBtns,false);assert.equal(view.curQuestion.t_isDone,true);assert.deepEqual(view.events,['exercise','current','related','footer']);
});

test('评分失败保留重做按钮、隐藏下一关，最后一关通过后仍可重做',()=>{
 const {c}=context();vm.runInContext(fs.readFileSync('dist/static/js/paper-forest.js','utf8'),c);function h(tag,data,children){if(arguments.length===2){children=data;data={};}return {tag,data,children};}function walk(node,out=[]){if(Array.isArray(node))node.forEach(n=>walk(n,out));else if(node&&typeof node==='object'){out.push(node);walk(node.children,out);}return out;}
 for(const [cleared,hasNext,next] of [[0,true,false],[1,false,false],[1,true,true]]){const view={resultData:{score:50,cleared,advanceScore:90,durationStr:'00:00:01',num:10,wrongNum:5},hasNext,onHandleClick(){}};const buttons=walk(c.PaperForest.renderResult.call(view,h)).filter(n=>n.tag==='button');const text=JSON.stringify(buttons);assert.ok(text.includes('重新探索'));assert.equal(text.includes('探索下一级'),next);}
});

test('连续两次点收藏会顺序完成收藏与取消，切换当前题目不改变待保存目标',async()=>{
 const {q}=context(),view=exerciseOwner();view.collectedList=[false,false];view.curQuestion.collected=0;let resolve;const pending=new Promise(r=>resolve=r),sent=[];const send=async value=>{sent.push(value);if(sent.length===1)await pending;return {data:{code:0}}};let first=q.collectQuestion(view,send);await q.collectQuestion(view,send);view.curIndex=1;view.curQuestion=view.questions[1];resolve();await first;assert.deepEqual(sent.map(x=>[x.topicid,x.flag]),[['0101001',1],['0101001',2]]);assert.equal(view.questions[0].collected,0);assert.equal(view.collectedList[0],false);assert.equal(view._quizCollections.size,0);
});

test('收藏失败恢复原标记，不把未保存的状态当成成功',async()=>{
 const {q}=context(),view=exerciseOwner();view.collectedList=[false,false];view.curQuestion.collected=0;await q.collectQuestion(view,async()=>{throw Error('保存失败')});assert.equal(view.collectedList[0],false);assert.equal(view.curQuestion.collected,0);assert.equal(view.notices[0],'保存失败');assert.equal(view._quizCollections.size,0);
});

test('题目滑块程序定位到同一页不触发上一题；跳题与离开组件会清理待发事件',()=>{
 const s=fs.readFileSync('dist/static/js/11.17cdb4427b706e032f4f.js','utf8'),start=s.indexOf('onSwipeChange:function(t)'),end=s.indexOf('onTouchstart:function',start);let timer,event,cleared=[];const c={g:null,setTimeout:fn=>{timer=fn;return 7},clearTimeout:id=>cleared.push(id)};vm.createContext(c);const swipe=vm.runInContext('('+s.slice(start+'onSwipeChange:'.length,end).replace(/,$/,'')+')',c),view={prevSwipeIndex:1,curIndex_t:5,$emit:(key,index)=>event=index};swipe.call(view,1);assert.equal(timer,undefined);assert.equal(view.curIndex_t,5);swipe.call(view,2);timer();assert.equal(event,6);
 const a=s.indexOf('curIndex:{handler:function(t){g&&'),b=s.indexOf('},immediate:!0}',a);assert.ok(a>0&&b>a);c.g=9;const handler=vm.runInContext('('+s.slice(a+'curIndex:{handler:'.length,b+1)+')',c);handler.call({list:[1,2,3],swipeNum:3},2);assert.ok(cleared.includes(9));assert.equal(c.g,null);
});

test('百科缺少配套练习时返回明确空集，其他无效目录仍报错',()=>{
 const s=fs.readFileSync('dist/static/js/wzbz-native-bridge.js','utf8'),a=s.indexOf("    if (url.indexOf('getQuestions.php')"),b=s.indexOf("    if (url.indexOf('postSubmitLevel')",a),c={localQuestions:()=>null,okResponse:(cfg,data)=>data,localError:(code,message)=>Object.assign(Error(message),{code})};vm.createContext(c);const query=vm.runInContext('(function(q){var url="getQuestions.php",cfg={};'+s.slice(a,b)+'})',c);assert.deepEqual(plain(query({type:'zhishi',cid:'00001'}).data),{});assert.throws(()=>query({type:'tilin',cid:'9999999'}),e=>e.code===501);
});
