(function(global) {
  'use strict';
  var KEY='wzbz_local_tiku_v14', thresholds=[90,90,80,80,80,70,70];
  function copy(value){return JSON.parse(JSON.stringify(value));}
  function normalizedLevel(id){return String(id).padStart(7,'0');}
  function chapterNumber(id){var number=Number(String(id).slice(0,3));return number>=101&&number<=107?number-100:number;}
  function threshold(id){var value=normalizedLevel(id);if(!/^0[1-7]0[1-5]000$/.test(value))throw Error('关卡不存在');return thresholds[Number(value.slice(0,2))-1];}
  function questionSet(id){
    id=String(id);
    if(/^10[1-7]00[1-5]000$/.test(id))id='0'+id[2]+'0'+id[5]+'000';
    var rows=(global.__WZBZ_TILIN_ALL__||{})[normalizedLevel(id)];
    if(!rows)return null;
    var result={};Object.keys(rows).forEach(function(key){if(!rows[key].auditIssue)result[key]=copy(rows[key]);});return result;
  }
  function practiceCatalog(levels){return levels.map(function(level){return {id:String(100+level.level)+'000000',name:level.name,children:level.children.map(function(child){
    return {id:String(100+level.level)+String(child.level).padStart(3,'0')+'000',name:['第一级','第二级','第三级','第四级','第五级'][child.level-1],total:Object.keys(questionSet(child.id)||{}).length};
  })};});}
  function passed(record,id){var required;try{required=threshold(id);}catch(_){return false;}return !!record&&Math.max(Number(record.score)||0,Number(record.bestScore)||0)>=required;}
  function maxCleared(levels){var last=0;for(var group=1;group<=7;group++)for(var child=1;child<=5;child++){
    var id='0'+group+'0'+child+'000';if(!passed(levels[id],id))return last;last=Number(id);
  }return last;}
  function attempt(id,previous,values){
    var correct=Number(values.correct),wrong=Number(values.wrong),duration=Number(values.usetime||0),total=correct+wrong,questions=questionSet(id);
    if(!questions)throw Error('当前版本尚未提供此关题目');
    if(!Number.isInteger(correct)||!Number.isInteger(wrong)||correct<0||wrong<0||total<1||total>Object.keys(questions).length||!Number.isFinite(duration)||duration<0)throw Error('答题数量或用时无效');
    var score=Math.floor(correct/total*100),oldBest=Math.max(Number(previous.score)||0,Number(previous.bestScore)||0);
    var bestAttempt=score>=oldBest?{score:score,usetime:duration,correct:correct,wrong:wrong}:
      previous.bestAttempt||{score:oldBest,usetime:Number(previous.usetime)||0,correct:Number(previous.correct)||0,wrong:Number(previous.wrong)||0};
    return {levelid:normalizedLevel(id),score:score,bestScore:Math.max(oldBest,score),bestAttempt:bestAttempt,usetime:duration,correct:correct,wrong:wrong,
      mytotal:(Number(previous.mytotal)||0)+total,mycorrect:(Number(previous.mycorrect)||0)+correct,alltotal:0,allcorrect:0,content:String(values.content||'')};
  }
  function prepareQuestion(question,owner){
    var result=copy(question);result.replyNum=result.replyNum||0;result.correctNum=result.correctNum||0;
    if(owner.type==='tilin')return result;
    try{
      var all=JSON.parse(localStorage.getItem(KEY)||'{}'),user=all[owner.userguid],record=user&&user.answers&&user.answers[result.id];
      if(record){result.status=record.status;result.myanswer=record.answer?String(record.answer.charCodeAt(0)-65):'';result.replyNumSelf=Number(record.total)||0;result.correctNumSelf=Number(record.correct)||0;}
    }catch(_){}
    return result;
  }
  function grade(questions){
    if(!questions.length)throw Error('没有可提交的题目');
    var correct=0;questions.forEach(function(q){var selected=q.t_optionList.filter(function(option){return option.selected;});if(selected.length!==1)throw Error('请完成全部题目后再提交');if(String(selected[0].id)===String(q.answer))correct++;});
    return {correct:correct,wrong:questions.length-correct,score:Math.floor(correct/questions.length*100)};
  }
  function showError(owner,error){if(owner.$toast&&owner.$toast.fail)owner.$toast.fail(error.message||'提交失败，请重试');else if(typeof owner.$toast==='function')owner.$toast(error.message||'提交失败，请重试');}
  async function submitExercise(owner,send){
    if(owner._quizSubmitting)return;
    owner._quizSubmitting=true;
    try{
      var question=owner.curQuestion,selected=question.t_optionList.filter(function(option){return option.selected;});
      if(selected.length!==1)throw Error('请选择一个答案后再提交');
      var response=await send({userguid:owner.userguid,catalogid:owner.testData.cid,topicid:question.id,
        status:String(Number(String(selected[0].id)===String(question.answer))),ans:String.fromCharCode(Number(selected[0].id)+65)}),data=response&&response.data;
      if(data&&(data.isSuccess===false||typeof data.code==='number'&&data.code!==0))throw Error(data.message||'答案保存失败，请重试');
      owner.handleSubmitQuestion(question);
      owner.testData.questions.splice(owner.curIndex,1,question);
      owner.updateExerciseList();owner.updateCurExerciseData();
      if(owner.type==='xiti')owner.updateCurTermQuestion();
      owner.showFooterBtns=false;owner.handleFooterStatus();
    }catch(error){showError(owner,error);}
    finally{owner._quizSubmitting=false;}
  }
  async function handleQuestion(owner,action,send){
    if(action==='submit')return owner.type==='tilin'?owner.handleTilinSubmit():submitExercise(owner,send);
    if(action==='prev'&&owner.curIndex>0)owner.curIndex--;
    if(action==='next'&&owner.curIndex<owner.testData.questions.length-1){owner.curIndex++;if(owner.type==='tilin')owner.$EventBus.$emit('school_progress_lastSelectedIndex',owner.curIndex);}
    owner.handleFooterStatus();
  }
  async function collectQuestion(owner,send){
    var question=owner.curQuestion,index=owner.curIndex;
    if(!owner._quizCollections)owner._quizCollections=new Map();
    var state=owner._quizCollections.get(question.id);
    if(!state){state={actual:!!question.collected,desired:!!question.collected,running:false};owner._quizCollections.set(question.id,state);}
    state.desired=!state.desired;owner.collectedList.splice(index,1,state.desired);
    if(state.running)return;
    state.running=true;
    try{
      while(state.desired!==state.actual){
        var selected=state.desired,response=await send({userguid:owner.userguid,topicid:question.id,flag:selected?1:2}),data=response&&response.data;
        if(data&&(data.isSuccess===false||typeof data.code==='number'&&data.code!==0))throw Error(data.message||'收藏保存失败');
        state.actual=selected;question.collected=selected?1:0;
        if(selected)question.collectTime=Date.now();else delete question.collectTime;
        if(owner.curExerciseData){var exercise=owner.curExerciseData.questions.find(function(q){return q.id===question.id;});if(exercise)Object.assign(exercise,question);owner.$store.dispatch('school/setCurExerciseData',Object.assign({},owner.curExerciseData));}
        if(owner.curTermQuestions&&owner.curTermQuestions.length){var term=owner.curTermQuestions.find(function(q){return q.id===question.id;});if(term)Object.assign(term,question);owner.$store.dispatch('school/setCurTermQuestions',owner.curTermQuestions.slice());}
      }
    }catch(error){state.desired=state.actual;owner.collectedList.splice(index,1,state.actual);showError(owner,error);}
    finally{state.running=false;owner._quizCollections.delete(question.id);}
  }
  async function submitLevel(owner,send){
    if(owner._quizSubmitting)return;
    owner._quizSubmitting=true;
    try{
      var tally=grade(owner.testData.questions),duration=owner.$refs.footerRef?owner.$refs.footerRef.duration:0;
      owner.$store.dispatch('setAppLoading',{content:'正在提交…',show:true});
      var payload={userguid:owner.userguid,levelid:Number(owner.testData.cid),score:tally.score,usetime:duration,correct:tally.correct,wrong:tally.wrong,
        content:owner.testData.questions.map(function(q){var selected=q.t_optionList.find(function(o){return o.selected;});return q.id+':'+Number(String(selected.id)===String(q.answer));}).join(',')};
      var response=await send(payload),data=response&&response.data;
      if(data&&(data.isSuccess===false||typeof data.code==='number'&&data.code!==0))throw Error(data.message||'成绩保存失败，请重试');
      owner.testData.questions.forEach(function(q){owner.handleSubmitQuestion(q);});
      var result={id:owner.testData.id,cid:owner.testData.cid,title:owner.title,cleared:Number(tally.score>=owner.testData.advanceScore),advanceScore:owner.testData.advanceScore,score:tally.score,duration:duration,num:owner.testData.questions.length,wrongNum:tally.wrong};
      owner.testData.t_cleared=!!result.cleared;owner.testData.t_isDone=true;
      if(result.cleared)owner.testData.cleared=1;
      if(tally.score>=(owner.testData.score||0))Object.assign(owner.testData,{score:tally.score,duration:duration,num:result.num,wrongNum:tally.wrong});
      localStorage.setItem('school_tilin_levelData',JSON.stringify(owner.testData));localStorage.setItem('school_tilin_resultData',JSON.stringify(result));
      await owner.updateLevelList();
      if(owner.isAndroidApp)localStorage.setItem('tiku_back','1');
      global.removeEventListener('popstate',owner.handleSysBack);
      await owner.$router.replace({name:'SchoolTestResult'});
    }catch(error){showError(owner,error);}
    finally{owner._quizSubmitting=false;owner.$store.dispatch('setAppLoading',{show:false});}
  }
  global.WZBZQuiz=Object.freeze({threshold:threshold,questionSet:questionSet,practiceCatalog:practiceCatalog,chapterNumber:chapterNumber,passed:passed,maxCleared:maxCleared,attempt:attempt,prepareQuestion:prepareQuestion,grade:grade,submitLevel:submitLevel,handleQuestion:handleQuestion,collectQuestion:collectQuestion});
})(window);
