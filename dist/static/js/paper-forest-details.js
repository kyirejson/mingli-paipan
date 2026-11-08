(function(global) {
  'use strict';
  var NOTES='wzbz_local_notes_v14', LEGACY='wzbz_fivearts_record_data_v1', DRAFTS='wzbz_note_drafts_v1', _tempNotesRaw=null, _tempNotesCache=[];
  function temporaryNotes(){try{var raw=localStorage.getItem(NOTES);if(!raw){_tempNotesRaw=null;_tempNotesCache=[];return _tempNotesCache;}if(raw===_tempNotesRaw)return _tempNotesCache;var all=read(NOTES,{});_tempNotesRaw=raw;_tempNotesCache=Object.values(all).filter(function(n){return n&&n.temporary&&n.content;});return _tempNotesCache;}catch(_){return [];}}
  function read(key, fallback) {
    var raw=localStorage.getItem(key);
    if(!raw) return fallback;
    var value=JSON.parse(raw);
    if(!value || typeof value!=='object' || Array.isArray(value)!==Array.isArray(fallback)) throw Error('本机记录格式异常，原内容已保留');
    return value;
  }
  function validKey(key) { return key && !['__proto__','constructor','prototype'].includes(key); }
  function fingerprint(text) { var hash=2166136261;for(var i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619);return (hash>>>0).toString(16)+':'+text.length; }
  function migrateNotes() {
    var records=read(LEGACY,{}), notes=read(NOTES,{}), cases=read('wzbz_local_userlist_v14',[]), changed=false, backedUp=false;
    Object.keys(records).forEach(function(key) {
      var record=records[key];
      if(!record || typeof record.note!=='string' || !record.note.trim()) return;
      var guid=key;
      if(key==='@last') {
        var matches=cases.filter(function(c){return !Number(c.isdel) && (c.solarTime||c.birthDay)===record.baseTime;});
        guid=matches.length===1?matches[0].guid:'temporary:'+fingerprint(String(record.baseTime||''));
      }
      if(!validKey(guid)) return;
      if(!backedUp && !localStorage.getItem('wzbz_notes_migration_backup_v1')) {
        localStorage.setItem('wzbz_notes_migration_backup_v1',JSON.stringify({notes:localStorage.getItem(NOTES),fivearts:localStorage.getItem(LEGACY)}));
      }
      backedUp=true;
      var note=notes[guid] || {userGuid:guid,content:'',bzData:'',bzStruct:'',feedbackData:'',feedbackStruct:''};
      if(guid.indexOf('temporary:')===0){note.temporary=true;note.baseTime=record.baseTime||'';}
      var id=key+'|'+fingerprint(record.note), migrated=note.fiveArtsMigrated || [];
      if(!migrated.includes(id)) {
        note.content=[note.content, '【五术笔记】\n'+record.note.trim()].filter(Boolean).join('\n\n');
        note.fiveArtsMigrated=migrated.concat(id);notes[guid]=note;
      }
      delete record.note;changed=true;
    });
    if(changed) {
      // Write the destination first. Retrying after a partial write is idempotent.
      localStorage.setItem(NOTES,JSON.stringify(notes));
      localStorage.setItem(LEGACY,JSON.stringify(records));
    }
    return notes;
  }
  function button(h,label,click,cls) {return h('button',{class:cls||'pf-detail-button',attrs:{type:'button'},on:{click:click}},Array.isArray(label)?label:[label]);}
  function ageLabel(info) {
    var now=new Date(), match=String(info.solarTime||'').match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if(!match)return '';
    var year=+match[1],month=+match[2],day=+match[3];
    if(new Date(year,month-1,day)>now)return '尚未出生';
    if(localStorage.getItem('setting_age')==='true') {
      var age=now.getFullYear()-year-((now.getMonth()+1<month || now.getMonth()+1===month&&now.getDate()<day)?1:0);
      return Math.max(0,age)+'周岁';
    }
    var birth=String(info.lunarTime||'').match(/^(\d{4})年/),current=now.getFullYear();
    if(global.Solar)current=global.Solar.fromDate(now).getLunar().getYear();
    return Math.max(1,current-(birth?+birth[1]:year)+1)+'虚岁';
  }
  function renderIdentity(h) {
    var t=this,info=t.infoData||{},visible=t.showEye;
    return h('section',{class:['avatar_box','pf-case-identity']},[
      h('div',{class:'pf-case-heading'},[h('h2',[visible?(info.name||'未命名命例'):'***']),t.tabIndex!==0&&Number(t.MRType)===0&&!t.isComp?h('div',{class:'pf-identity-actions'},[
        button(h,[global.PaperForest.icon(h,'eye')],t.onEye,'pf-icon-action'),button(h,[global.PaperForest.icon(h,'edit')],t.onEdit,'pf-icon-action')]):null]),
      h('div',{class:'pf-case-badges'},[h('span',[visible?(Number(info.sex)===1?'男 · 乾造':'女 · 坤造'):'隐私已隐藏']),h('span',[visible?'生肖 · '+(info.sxStr||'—'):'生肖 · *']),h('span',[visible?ageLabel(info):'**岁'])]),
      t.tabIndex!==0?h('div',{class:'pf-case-dates'},[h('p',[t.avatarDate1]),h('p',[t.avatarDate2])]):null,
      t.tabIndex===2&&Number(t.MRType)===0?button(h,'胎命身',t.onTMS):null
    ]);
  }
  function renderBasicInfo(h) {
    var t=this,info=t.infoData||{},extras={7:['星宿',info.xingxiu],8:['空亡',t.kongwangVal],9:['胎息',info.taixi,info.taixi_nayin],10:['命卦',info.minggua,info.minggua_nayin]};
    function cell(label,value,extra){return h('div',{class:'pf-info-cell'},[label?h('span',{class:'pf-info-label'},[label]):null,h('span',{class:'pf-info-value'},[String(value==null?'':value),extra?'（'+extra+'）':''])]);}
    var rows=(t.infoLabelArr||[]).map(function(label,index){
      var key=t.infoLabelValArr[index];if(!info[key] || index===4&&!(t.rysl&&t.rysl.switch))return null;
      if(index===6)return h('div',{class:'pf-info-row pf-info-pair'},[cell((info.jqArr1||[])[0],(info.jqArr1||[])[1]),cell((info.jqArr2||[])[0],(info.jqArr2||[])[1])]);
      var value=t.getInfoDisplayValue(index),extra=t.showInfoExtra(index)&&info[key+'_nayin'];
      if(index===4 && /^\s*\*+\s*$/.test(String(info[key])))value='暂无数据';
      if(index===0)value+='（'+t.sexVal+'）';
      if(Array.isArray(value))value=value.join('');
      var children=[cell(label,value,extra)];if(extras[index]&&extras[index][1])children.push(cell.apply(null,extras[index]));
      return h(index===4?'button':'div',{class:['pf-info-row',{'pf-info-pair':children.length>1}],attrs:index===4?{type:'button'}:{},on:index===4?{click:function(){t.onClickValue(index);}}:{}},children);
    });
    return h('div',{ref:'infoBoxWrapperRef',class:'info_box_wrapper pf-basic-info'},[
      h('AvartarBox',{attrs:{MRType:t.MRType,tabIndex:0,infoData:info}}),
      h('section',{class:'pf-info-table'},rows),
      h('section',{class:'pf-info-section'},[
        Number(info.unknowhour)!==1?h('div',{class:'pf-reference-cards'},['日主属性','阴阳参考','旺衰参考'].map(function(title,i){return h('div',{class:'pf-reference-card'},[
          button(h,[h('span',[title]),h('strong',[(t.xzData||{})[t.xzAttrValArr[i]]||'—']),global.PaperForest.icon(h,'next')],function(){t.onXZSetting(i,false,(t.xzData||{})[t.xzAttrValArr[i]]);},'pf-reference-open'),
          i===2?button(h,[global.PaperForest.icon(h,'edit')],function(){t.onXZSetting(2);},'pf-reference-edit'):null
        ]);})) : null,
        h('div',{class:'pf-energy-tabs'},(t.xzWXPTabArr||[]).map(function(label,i){return button(h,label,function(){t.onChangeWXP(i);},['pf-energy-tab',{'is-selected':t.wxpIndex===i}]);})),
        h('div',{class:'pf-energy-list'},(t.wxArr||[]).map(function(label,i){return h('div',{class:'pf-energy-row'},[h('b',[label]),h('div',{class:'pf-energy-track'},[h('i',{class:t.wxClassArr[i],style:{width:Math.max(0,Math.min(100,Number(t.wxpwidth[i])||0))+'%'}})]),h('span',[String(t.wxpcount[i])+t.wxunit+' '+(t.wxssArr[i]||'')])]);})),
        h('div',{class:'pf-season-elements'},(t.wxData||[]).map(function(value){return h('span',[value]);}))
      ]),
      h('section',{class:'pf-info-section pf-chenggu'},[h('h3',['袁天罡称骨']),h('strong',[t.chengguWeightText]),h('p',[(t.chengguDatas.tips||[]).filter(Boolean).join('；')])]),
      h('iframe',{ref:'birthmapIframeRef',class:['birthmap_box',{'hideClass':!t.showBirthmap}],attrs:{frameborder:'0',scrolling:'no',title:'天体图'}}),
      t.showMask?h('div',{class:'info_mask'}):null
    ]);
  }
  function detailShell(h,title,close,content,cls) {
    return h('div',{class:'pf-detail-overlay',on:{click:function(e){if(e.target===e.currentTarget)close();}}},[
      h('section',{class:['pf-detail-dialog',cls],attrs:{role:'dialog','aria-modal':'true','aria-label':title}},[
        h('header',[h('h2',[title]),button(h,[global.PaperForest.icon(h,'close')],close,'pf-icon-action')]),h('div',{class:'pf-detail-content'},content)
      ])
    ]);
  }
  function renderXZTip(h) {
    var t=this,body=[];
    if(t.tipCode===2||t.tipCode===3){
      body=[h('h3',['系统参考']),button(h,t.selectTitle||'默认',function(){t.onSelect(-1);},['pf-select-row',{'is-selected':t.selectIndex===-1}]),h('h3',['笔记中的自定义选择'])];
      (t.xzItems||[]).forEach(function(label,i){body.push(button(h,label,function(){t.onSelect(i);},['pf-select-row',{'is-selected':t.selectIndex===i}]));});
    }else if(t.tipCode===1){
      body.push(h('h3',['八字'+t.selectTitle]),h('p',[t.yySummaryText]));
      (t.rzimg||[]).forEach(function(item){if(item.content)body.push(h('article',{class:'pf-reading-article',domProps:{innerHTML:item.content}}));else body.push(h('img',{class:'pf-reading-image',attrs:{src:t.$store.getters.isDark?item.src_dark:item.src,alt:'阴阳参考'}}));});
    }else{
      var src=typeof t.rzimg==='string'?t.rzimg:Array.isArray(t.rzimg)&&t.rzimg[0]?(t.$store.getters.isDark?t.rzimg[0].src_dark:t.rzimg[0].src):'';
      src=readingUrl(src,t.$store.getters.isDark);
      body.push(h('iframe',{key:src,class:'pf-reading-frame',attrs:{src:src,title:t.tipTitle,frameborder:'0'},on:{load:function(){t.onIframeLoad('single');}}}));
    }
    return detailShell(h,t.tipTitle,t.onClose,body,'pf-reference-dialog');
  }
  function readingUrl(src,dark){
    var match=String(src||'').match(/\/rigan\/(?:nightMode\/)?(10|[1-9])\.html/);
    if(match)return new URL('static/readings/bazi/day-'+match[1]+'.html?dark='+(dark?1:0),document.baseURI).href;
    match=String(src||'').match(/\/geju\/content\/(0[1-9])\.html/);
    return match?new URL('static/readings/bazi/reference-'+match[1]+'.html?dark='+(dark?1:0),document.baseURI).href:src;
  }
  function noteContent(note){
    if(!note)return '';
    try{var draft=read(DRAFTS,{})[note.userGuid];return draft&&typeof draft.content==='string'?draft.content:String(note.content||'');}catch(_){return String(note.content||'');}
  }
  function initNotes(){
    if(!this.noteData)return;
    var self=this,draft;try{draft=read(DRAFTS,{})[this.noteData.userGuid];}catch(_){}
    this._restoringNoteDraft=true;
    if(draft&&draft.fields){
      [['selects','feedback'],['selectsX','judgment']].forEach(function(pair){
        (self[pair[0]]||[]).forEach(function(item){var rows=Array.isArray(draft.fields[pair[1]])?draft.fields[pair[1]]:[];var saved=rows.find(function(row){return row&&row.name===(item.rname||item.name);});if(saved)item.data=saved.data;});
      });
    }
    this.contentVal=noteContent(this.noteData);
    this.noteStatus=draft?'草稿待保存':'已保存';
    if(this.$watch&&!this._noteFieldsWatch)this._noteFieldsWatch=this.$watch(function(){function sig(list){return (list||[]).map(function(x){return x?(x.rname||x.name||'')+'='+(typeof x.data==='string'?x.data:JSON.stringify(x.data??'')):'';}).join('\u0001');}return sig(self.selects)+'\u0002'+sig(self.selectsX);},function(){if(!self._restoringNoteDraft&&!self.noteSaving)changeNote(self,self.contentVal);});
    if(this.$nextTick)this.$nextTick(function(){self._restoringNoteDraft=false;});else this._restoringNoteDraft=false;
  }
  function noteFields(view){
    function rows(list){return (list||[]).map(function(item){var d=item.data==null?'':item.data;return {name:item.rname||item.name,data:typeof d==='object'?JSON.parse(JSON.stringify(d)):d};});}
    return {feedback:rows(view.selects),judgment:rows(view.selectsX)};
  }
  function changeNote(view,text){
    view.contentVal=text;view.noteStatus='草稿待保存';
    try{var drafts=read(DRAFTS,{});drafts[view.noteData.userGuid]={content:text,fields:noteFields(view),updatedAt:Date.now()};localStorage.setItem(DRAFTS,JSON.stringify(drafts));}
    catch(_){view.noteStatus='草稿未能写入，请及时保存';}
  }
  async function saveNotes(){
    if(this.noteSaving||!this.noteData)return;
    this.noteSaving=true;this.noteStatus='正在保存…';
    var content=this.contentVal,fields=JSON.stringify(noteFields(this));
    try{
      var save=this.$listeners.save;if(!save)throw Error('保存入口暂不可用');
      await save(content);
      var note=read(NOTES,{})[this.noteData.userGuid];
      if(!note||String(note.content||'')!==content)throw Error('保存未完成，草稿已保留');
      var expected=[['bzData',this.selectsX],['feedbackData',this.selects]];
      expected.forEach(function(pair){
        var stored=typeof note[pair[0]]==='string'?JSON.parse(note[pair[0]]||'[]'):note[pair[0]]||[];
        if(!(pair[1]||[]).every(function(item){return stored.some(function(row){return row.name===(item.rname||item.name)&&String(row.data||'')===String(item.data||'');});}))throw Error('标签尚未保存，请重试');
      });
      if(this.contentVal!==content||JSON.stringify(noteFields(this))!==fields)changeNote(this,this.contentVal);
      else {
        var drafts=read(DRAFTS,{});delete drafts[this.noteData.userGuid];localStorage.setItem(DRAFTS,JSON.stringify(drafts));
        this.noteStatus='已保存';
      }
    }catch(e){this.noteStatus=e.message||'保存失败，草稿已保留';}
    finally{this.noteSaving=false;}
  }
  function insertNote(view,label){
    var input=view.$refs.unifiedNoteInput,start=input?input.selectionStart:view.contentVal.length,end=input?input.selectionEnd:start;
    var text=(start&&view.contentVal[start-1]!=='\n'?'\n':'')+'【'+label+'】\n';
    changeNote(view,view.contentVal.slice(0,start)+text+view.contentVal.slice(end));
    view.$nextTick(function(){if(input){input.focus();input.setSelectionRange(start+text.length,start+text.length);}});
  }
  function renderNotes(h){
    var t=this,note=t.noteData,editable=Number(t.MRType)===0&&note;
    function group(title,list,scope){return h('details',{class:'pf-note-fields'},[h('summary',[title]),h('div',(list||[]).filter(function(x){return x.isShow!==false;}).map(function(item,i){
      return h('label',{class:'pf-note-field'},[h('span',[item.name+(item.sname||'')]),Number(item.type)===1?button(h,item.data||'请选择',function(){t.tabIndex=scope;t.onSelectOption(scope,scope===1?100+list.indexOf(item):list.indexOf(item));},'pf-note-select'):
        h('textarea',{attrs:{rows:2,placeholder:'填写'+item.name,disabled:!editable},domProps:{value:typeof item.data==='string'?item.data:''},on:{input:function(e){item.data=e.target.value;changeNote(t,t.contentVal);}}})]);
    }))]);}
    var temporary=temporaryNotes();
    return h('section',{class:'note_wrapper pf-unified-notes'},[
      h('header',{class:'pf-notes-heading'},[h('h2',['断事笔记']),h('p',[(t.infoData||{}).name||'当前命例',' · 五术同参'])]),
      editable?h('div',{class:'pf-note-editor'},[
        h('div',{class:'pf-note-tags'},['八字','紫微','奇门','六爻','梅花','后续反馈'].map(function(label){return button(h,label,function(){insertNote(t,label);},'pf-note-tag');})),
        h('textarea',{ref:'unifiedNoteInput',class:'pf-note-textarea',attrs:{maxlength:20000,placeholder:'记录判断依据、应期与后续反馈…',rows:12,'aria-label':'断事笔记'},domProps:{value:t.contentVal},on:{input:function(e){changeNote(t,e.target.value);}}}),
        h('div',{class:'pf-note-counter'},[h('span',{attrs:{role:'status'}},[t.noteStatus]),h('span',[t.contentVal.length+' / 20000'])])
      ]):h('p',{class:'pf-caption'},[t.tipsStr||t.mrTipsStr||'暂无笔记']),
      group('命主反馈',t.selects,0),group('判断与标签',t.selectsX,1),
      temporary.length?h('details',{class:'pf-note-fields'},[h('summary',['历史临时笔记']),temporary.map(function(n){return h('article',[h('h4',[n.baseTime||'未归档笔记']),h('p',{style:{whiteSpace:'pre-wrap'}},[n.content]),editable?button(h,'复制到当前笔记',function(){if(!t.contentVal.includes(n.content))changeNote(t,[t.contentVal,n.content].filter(Boolean).join('\n\n'));}):null]);})]):null,
      (t.pickers||[]).length?h('details',{class:'pf-note-fields'},[h('summary',['既有事件记录']),t.pickers.map(function(item){return h('p',[item.name+'：'+(typeof item.data==='string'?item.data:'已录入事件')]);})]):null,
      editable?h('footer',{class:'pf-notes-footer'},[button(h,t.noteSaving?'正在保存…':'保存笔记',function(){t.onSave();},'pf-notes-save')]):null,
      t.showItems?h('van-action-sheet',{class:'picker_box',attrs:{'get-container':'body','close-on-click-overlay':false},props:{value:t.showItems},on:{input:function(v){t.showItems=v;},'click-overlay':t.onCloseItems}},[h('ItemsBox',{ref:'itemsBoxRef',attrs:{tabIndex:t.tabIndex,itemsData:t.itemsData},on:{edit:t.onEditItems,select:t.onSelectItems}})]):null
    ]);
  }
  function renderWuyunAnalysis(h){
    var t=this;
    var groups=[['岁运总览',[['岁运','suiYun','clickSuiYunDialog'],['司天','siTian','clickSiTianDialog'],['在泉','zaiQuan','clickZaiQuanDialog'],['交运日','jiaoYunRi','clickJiaoYunRiTipsDialog']]],['当前运气',[['主运','zhuYun','clickZhuYunDialog'],['客运','keYun','clickKeYunDialog'],['主气','zhuQi','clickZhuQiDialog'],['客气','keQi','clickKeQiDialog']]],['节令参考',[['客主加临','keZhuJiaLin','clickKeZhuJiaLinTipsDialog'],['所在节气','jieQi','clickJieQiContentDialog']]]];
    var out=[h('header',{class:'pf-wuyun-year'},[button(h,t.siZhuStr+'年',t.clickStarYearTipsDialog),h('p',[t.starYunStr+' · '+t.starQiStr])])];
    groups.forEach(function(group){out.push(h('section',{class:'pf-wuyun-section'},[h('h3',[group[0]]),h('div',{class:'pf-wuyun-cards'},group[1].map(function(item){return button(h,[h('span',[item[0]]),h('strong',[t[item[1]+'Str']||'—']),t[item[1]+'Tips']?h('small',[t[item[1]+'Tips']]):null,global.PaperForest.icon(h,'next')],t[item[2]],'pf-wuyun-card');}))]));});
    out.push(button(h,'全年运气分析',t.clickLuckyYear,'pf-notes-save'));
    if(t.wuYunDialogTitle&&t.wuYunDialogValue)out.push(h('WuYunDialog',{attrs:{wuYunDialogTitle:t.wuYunDialogTitle,wuYunDialogValue:t.wuYunDialogValue},on:{closeDialog:t.onCloseDialog}}));
    if(t.liuQiDialogTitle&&t.liuQiDialogValue)out.push(h('LiuQiDialog',{attrs:{liuQiDialogTitle:t.liuQiDialogTitle,liuQiDialogValue:t.liuQiDialogValue},on:{closeDialog:t.onCloseDialog}}));
    if(t.isShowStarYearTipsDialog)out.push(h('StarYearTipsDialog',{attrs:{keyType:t.keyType},on:{closeStarYearTipsDialog:t.onCloseDialog}}));
    if(t.isShowJieQiTipsDialog)out.push(h('IFrameDialog',{attrs:{jieQiLink:t.jieQiLinkStr},on:{closeTipsDialog:t.onCloseDialog}}));
    return h('div',{class:'pf-wuyun-analysis'},out);
  }
  global.PaperForestDetails=Object.freeze({renderIdentity:renderIdentity,renderBasicInfo:renderBasicInfo,renderXZTip:renderXZTip,renderNotes:renderNotes,renderWuyunAnalysis:renderWuyunAnalysis,initNotes:initNotes,noteContent:noteContent,saveNotes:saveNotes,migrateNotes:migrateNotes,ageLabel:ageLabel});
})(window);
