(function(global) {
  'use strict';
  var pad=function(n){return String(n).padStart(2,'0');};
  function message(view,text){view.$set(view.datetimeData,'error',text||'');return false;}
  function dateFromParts(y,m,d,h,minute,second){
    var numbers=[y,m,d,h||0,minute||0,second||0].map(Number);
    if(numbers.some(function(n){return !Number.isInteger(n);})||numbers[0]<1||numbers[0]>2099||numbers[1]<1||numbers[1]>12||numbers[2]<1||numbers[3]<0||numbers[3]>23||numbers[4]<0||numbers[4]>59||numbers[5]<0||numbers[5]>59)throw Error('日期或时间无效');
    var solar=global.Solar.fromYmdHms(Number(y),Number(m),Number(d),Number(h||0),Number(minute||0),Number(second||0));
    var date=new Date(2000,0,1);date.setFullYear(solar.getYear(),solar.getMonth()-1,solar.getDay());date.setHours(solar.getHour(),solar.getMinute(),solar.getSecond(),0);
    if(date.getFullYear()!==numbers[0]||date.getMonth()+1!==numbers[1]||date.getDate()!==numbers[2])throw Error('所选公历日期不存在');
    return {solar:solar,date:date};
  }
  function dateText(date){return String(date.getFullYear()).padStart(4,'0')+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate())+' '+pad(date.getHours())+':'+pad(date.getMinutes());}
  function parseSolar(text){
    var match=String(text||'').match(/^(\d{1,4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
    if(!match)throw Error('请选择完整的日期、小时和分钟');
    var n=match.slice(1).map(function(x){return Number(x||0);});
    if(n[0]<1||n[0]>2099||n[3]>23||n[4]>59||n[5]>59)throw Error('日期或时间超出支持范围');
    return dateFromParts.apply(null,n);
  }
  function timeParts(values){
    if(values[3]==='未知')return {hour:0,minute:0,unknown:1};
    if(values[4]==='未知'||!/^\d{1,2}$/.test(String(values[3]))||!/^\d{1,2}$/.test(String(values[4])))throw Error('请选择小时和分钟，或将时辰设为未知');
    var hour=Number(values[3]),minute=Number(values[4]);if(hour<0||hour>23||minute<0||minute>59)throw Error('小时或分钟无效');
    return {hour:hour,minute:minute,unknown:0};
  }
  function selectedTime(values,column){
    var hour=values[3],minute=values[4];
    if((column===3||column===4)&&values[column]==='未知')return {hour:'未知',minute:'未知'};
    if(hour==='未知'&&minute==='未知')return {hour:hour,minute:minute};
    return {hour:hour==='未知'?'00':pad(Number(hour)),minute:minute==='未知'?'00':pad(Number(minute))};
  }
  async function changeSolar(view,picker,values,column){
    if(!picker||!values||values.length<5)return;
    var request=(view._solarChangeRequest||0)+1;view._solarChangeRequest=request;
    var year=Number(values[0]),month=Number(values[1]),limit=new Date(2000,0,1);limit.setFullYear(year,month,0);
    var count=limit.getDate(),day=Math.max(1,Math.min(Number(values[2]),count)),time=selectedTime(values,column),days=Array.from({length:count},function(_,i){return pad(i+1);});
    view.$set(view.solars,2,Object.assign({},view.solars[2],{values:days}));view.solarDays=days;
    view.solarValues=[year,month,day,time.hour==='未知'?-1:Number(time.hour),time.minute==='未知'?-1:Number(time.minute)];
    await view.$nextTick();if(request!==view._solarChangeRequest||picker._isDestroyed)return;
    picker.setIndexes([year-view.YearStartForPicker,month-1,day-1,time.hour==='未知'?0:Number(time.hour)+1,time.minute==='未知'?0:Number(time.minute)+1]);
    var selected=confirmSolar(view,true);if(selected){view.curBirthday=selected.date;view.isUpdatedArr[1]=false;view.isUpdatedArr[2]=false;message(view,'');}
  }
  async function changeLunar(view,picker,values,column){
    if(!picker||!values||values.length<5)return;
    var request=(view._lunarChangeRequest||0)+1;view._lunarChangeRequest=request;
    var year=Number(values[0]),months=view.buildLunarMonthList(year).map(function(m){return m.name;}),name=String(values[1]),monthIndex=months.indexOf(name);
    if(monthIndex<0)monthIndex=months.indexOf(name.replace(/^闰/,''));if(monthIndex<0)monthIndex=0;
    name=months[monthIndex];var number=global.LunarUtil.MONTH.indexOf(name.replace(/^闰/,'').replace(/月$/,'')),month=global.LunarMonth.fromYm(year,name.indexOf('闰')===0?-number:number);
    if(!month)return message(view,'所选农历月份不存在');
    var count=month.getDayCount(),day=Math.max(1,Math.min(global.LunarUtil.DAY.indexOf(String(values[2])),count)),time=selectedTime(values,column),days=global.LunarUtil.DAY.slice(1,count+1);
    view.$set(view.lunars,1,Object.assign({},view.lunars[1],{values:months}));view.$set(view.lunars,2,Object.assign({},view.lunars[2],{values:days}));
    view.lunarValues=[year,name,days[day-1],time.hour==='未知'?-1:Number(time.hour),time.minute==='未知'?-1:Number(time.minute)];
    await view.$nextTick();if(request!==view._lunarChangeRequest||picker._isDestroyed)return;
    picker.setIndexes([year-view.YearStartForPicker,monthIndex,day-1,time.hour==='未知'?0:Number(time.hour)+1,time.minute==='未知'?0:Number(time.minute)+1]);
    var selected=confirmLunar(view,true);if(selected){view.curBirthday=selected.date;view.isUpdatedArr[0]=false;view.isUpdatedArr[2]=false;message(view,'');}
  }
  function confirmSolar(view,quiet){
    try{
      var values=view.$refs.solarBox.$refs.pickerRef.getValues(),time=timeParts(values),date=dateFromParts(values[0],values[1],values[2],time.hour,time.minute);
      if(date.solar.getYear()<1||date.solar.getYear()>2099)throw Error('年份超出支持范围');
      return {date:date.date,value:date.solar.toYmd()+' '+(time.unknown?'时辰未知':pad(time.hour)+':'+pad(time.minute)),unknowhour:time.unknown};
    }catch(error){if(!quiet)message(view,error.message||'公历日期无效');return false;}
  }
  function confirmLunar(view,quiet){
    try{
      var values=view.$refs.lunarBox.$refs.pickerRef.getValues(),time=timeParts(values),year=Number(values[0]),name=String(values[1]),leap=name.indexOf('闰')===0;
      var month=global.LunarUtil.MONTH.indexOf(name.replace(/^闰/,'').replace(/月$/,'')),day=global.LunarUtil.DAY.indexOf(String(values[2]));
      if(year<1||year>2099||month<1||day<1)throw Error('请选择完整的农历年月日');
      var lunarMonth=global.LunarMonth.fromYm(year,leap?-month:month);
      if(!lunarMonth||day>lunarMonth.getDayCount())throw Error('所选农历月份或日期不存在');
      var solar=global.Lunar.fromYmdHms(year,leap?-month:month,day,time.hour,time.minute,0).getSolar();
      if(solar.getYear()>2099)throw Error('对应公历日期已超出 2099 年');
      return {date:dateFromParts(solar.getYear(),solar.getMonth(),solar.getDay(),time.hour,time.minute).date,value:year+'年'+name+values[2]+' '+(time.unknown?'时辰未知':pad(time.hour)+':'+pad(time.minute)),unknowhour:time.unknown};
    }catch(error){if(!quiet)message(view,error.message||'农历日期无效');return false;}
  }
  function confirmSizhu(view,quiet){
    var box=view.$refs.sizhuBox;if(!box)return false;
    var list=box.sizhuList,unknown=list[6]&&list[6].value==='未知',fifth=box.isFenZhuOpen&&!unknown,length=fifth?10:8;
    function fail(text){return quiet?false:message(view,text);}
    if(list.length<length||list.slice(0,length).some(function(x){return !x.value;}))return fail('请补全'+(fifth?'五柱':'年、月、日、时四柱'));
    if(box.isDatetimeLoading)return fail('正在查找对应日期，请稍候');
    if(box.lookupError)return fail(box.lookupError);
    if(!box.datetimeList.length)return fail('当前范围没有匹配日期，请检查四柱或调整查找范围');
    if(!box.datetimeList[box.datetimeIndex])return fail('四柱已填完整，请选择一条对应的出生日期');
    var selected=box.datetimeList[box.datetimeIndex],solar=selected.solar,parts=solar.split(' '),text=list.slice(0,6).map(function(x){return x.value;}).join('');
    text=text.slice(0,2)+' '+text.slice(2,4)+' '+text.slice(4,6)+' '+(unknown?'时辰未知':list[6].value+list[7].value);
    var minuteUnknown=fifth&&list[8]&&list[8].value==='未知',fen=fifth?(minuteUnknown?'未知':list[8].value+list[9].value):'';
    try{
      var parsed=parseSolar(unknown?parts[0]+' 00:00':solar);
      if(unknown&&global.WZBZBaziReverse.pillars(parsed.solar,box.setting_midnight).slice(0,3).join('')!==list.slice(0,6).map(function(x){return x.value;}).join(''))return fail('此日期处于节气或换日边界，请补全时辰后确认');
      return {date:parsed.date,dateStr:solar,value:text+(fen?' '+fen:''),sizhu:text,fenzhu:fen,unknowhour:unknown?1:0,unknowminute:minuteUnknown?1:0};
    }catch(error){return fail('候选日期无效，请重新查找');}
  }
  async function lookup(box,birthday,range){
    var request=(box._calendarRequest||0)+1;box._calendarRequest=request;box.datetimeIndex=-1;box.datetimeList=[];box.datetimeList2=[];box.lookupError='';
    var list=box.sizhuList,unknown=list[6]&&list[6].value==='未知';
    if(list.slice(0,6).some(function(x){return !x.value;})||(!unknown&&(!list[6].value||!list[7].value)))return;
    var text=list.slice(0,6).map(function(x){return x.value;}).join('');
    if(unknown){var day='甲乙丙丁戊己庚辛壬癸'.indexOf(list[4].value);text+='甲乙丙丁戊己庚辛壬癸'[(day%5)*2]+'子';}
    else text+=list[6].value+list[7].value;
    box.sizhuIndex=box.dateResultIndex;box.isDatetimeLoading=true;
    try{
      var dates=await global.WZBZBaziReverse.search(text,{minYear:Math.max(1,range.startYear),maxYear:Math.min(2099,range.endYear),midnight:box.setting_midnight});
      if(request!==box._calendarRequest||box._isDestroyed)return;
      var rows=dates.map(function(value){
        value=box.applyFenZhuMinuteToSolar(value);var parsed=parseSolar(value),lunar=parsed.solar.getLunar(),time=unknown?'时辰未知':box.getLunarHourText(value.split(' ')[1]);
        if(!unknown&&global.WZBZBaziReverse.pillars(parsed.solar,box.setting_midnight).join('')!==text)return null;
        var solar=unknown?value.split(' ')[0]+' 时辰未知':value;
        return {solar:solar,lunar:lunar.getYear()+'年'+lunar.getMonthInChinese()+'月'+lunar.getDayInChinese()+' '+time,solarText:box.getUnknownMinuteDateText(solar),lunarText:'',dateArr:[parsed.solar.getYear(),parsed.solar.getMonth(),parsed.solar.getDay()]};
      }).filter(Boolean);
      if(unknown)rows=rows.filter(function(row,i,a){return a.findIndex(function(x){return x.solar===row.solar;})===i;});
      box.datetimeList2=rows;box.handleSizhuResult();
      if(birthday){
        var date=birthday instanceof Date?birthday:new Date(String(birthday).replace(/-/g,'/'));
        var key=function(h){return h===23?'late':Math.floor((h+1)/2)%12;};
        box.datetimeIndex=rows.findIndex(function(row){var p=parseSolar(row.solar.replace('时辰未知','00:00'));return p.date.getFullYear()===date.getFullYear()&&p.date.getMonth()===date.getMonth()&&p.date.getDate()===date.getDate()&&(unknown||key(p.date.getHours())===key(date.getHours()));});
      }
      if(rows.length===1&&box.datetimeIndex<0)box.datetimeIndex=0;
    }catch(error){if(request===box._calendarRequest){box.lookupError=error.message||'本地反查失败，请重试';box.datetimeList=[];box.datetimeList2=[];}}
    finally{if(request===box._calendarRequest)box.isDatetimeLoading=false;}
  }
  function close(view){view.datetimeData.index=view.datetimeData.index_real;view.curTabIndex=view.datetimeData.index_real;view.curBirthday=view.datetimeData.data;view.isUpdatedArr.fill(false);message(view,'');view.onClose();}
  function changeTab(view,index){
    if(index===view.curTabIndex||index<0||index>2)return;
    var selected=view.curTabIndex===0?confirmSolar(view,true):view.curTabIndex===1?confirmLunar(view,true):confirmSizhu(view,true);
    if(selected)view.curBirthday=selected.date;
    message(view,'');view.curTabIndex=index;view.$emit('tab',index);
    if(!view.isUpdatedArr[index]){if(index===0)view.initSolarDate();else if(index===1)view.initLunarDate();else view.ensureSizhuReady({birthday:view.curBirthday});}
  }
  async function applySolar(view,text){
    try{
      var parsed=parseSolar(text);view.curBirthday=parsed.date;view.isUpdatedArr[1]=false;view.isUpdatedArr[2]=false;view.initSolarDate();
      view.solars[3].defaultIndex=parsed.date.getHours()+1;view.solars[4].defaultIndex=parsed.date.getMinutes()+1;view.solarValues=[parsed.date.getFullYear(),parsed.date.getMonth()+1,parsed.date.getDate(),parsed.date.getHours(),parsed.date.getMinutes()];
      message(view,'');return true;
    }catch(error){return message(view,error.message||'请输入有效日期');}
  }
  async function useNow(view){
    var date=new Date();view.curBirthday=date;view.isUpdatedArr.fill(false);
    if(view.curTabIndex===0)return applySolar(view,dateText(date));
    view.initLunarDate();await view.$nextTick();var picker=view.$refs.lunarBox.$refs.pickerRef,indexes=picker.getIndexes();indexes[3]=date.getHours()+1;indexes[4]=date.getMinutes()+1;picker.setIndexes(indexes);view.onChangeLunar(picker,picker.getValues(),3);message(view,'');
  }
  async function confirmPicker(view){
    if(view.datetimeData.confirming)return;
    message(view,'');var box=view.curTabIndex===0?view.$refs.solarBox:view.$refs.lunarBox;
    if(view.curTabIndex<2&&box&&box.$refs.pickerRef.confirm){box.$refs.pickerRef.confirm();await view.$nextTick();}
    return view.onConfirm();
  }
  async function confirmForm(view,data){
    if(view.isConfirmingDatetime)return;
    view.datetimeData.isManual=true;view.$set(view.datetimeData,'confirming',true);view.$set(view.datetimeData,'error','');
    try{return await view.onConfirmDatetime(data);}
    catch(error){view.$set(view.datetimeData,'error','时间校正失败，请重新确认时间');}
    finally{view.isConfirmingDatetime=false;view.datetimeData.confirming=false;}
  }
  function preview(view){
    var result=view.curTabIndex===0?confirmSolar(view,true):view.curTabIndex===1?confirmLunar(view,true):confirmSizhu(view,true);
    if(!result)return {main:view.curTabIndex===2?'输入四柱，查找对应日期':'请选择出生日期和时间',sub:view.curTabIndex===2?'同一四柱可能对应不同年份，请核对出生日期':''};
    var lunar=global.Solar.fromDate(result.date).getLunar();
    return {main:result.value,sub:view.curTabIndex===1?'对应公历 '+dateText(result.date):view.curTabIndex===2?'对应公历 '+dateText(result.date):'农历 '+lunar.getYear()+'年'+lunar.getMonthInChinese()+'月'+lunar.getDayInChinese()};
  }
  function button(h,text,action,cls){return h('button',{class:cls,attrs:{type:'button'},on:{click:action}},[text]);}
  function renderDatetime(h){
    var self=this,p=preview(this),range=this.yearRangeData.show||this.yearRangeSizhuData.show;
    return h('van-action-sheet',{class:'pf-calendar-modal',attrs:{'get-container':'body','close-on-click-overlay':false},props:{value:this.datetimeData.show},on:{input:function(value){if(!value)close(self);},'click-overlay':function(){close(self);}}},[
      h('section',{class:'pf-calendar-sheet',attrs:{'aria-label':'选择出生时间'}},[
        this.yearRangeData.show?h('YearRangeBox',{props:{isSolar:this.curTabIndex===0,yearRangeData:this.yearRangeData},on:{back:this.onYearRange,novip:this.onNovip}}):null,
        this.yearRangeSizhuData.show?h('YearRangeSizhuBox',{props:{yearRangeData:this.yearRangeSizhuData},on:{back:this.onYearRangeOfSizhu,novip:this.onNovip}}):null,
        h('div',{class:'pf-calendar-content',style:{display:range?'none':''}},[
          h('header',{class:'pf-calendar-heading'},[h('h2',['选择出生时间']),button(h,'取消',function(){close(self);},'pf-calendar-cancel')]),
          h('nav',{class:'pf-calendar-tabs',attrs:{'aria-label':'历法'}},['公历','农历',this.sizhuTabLabel].map(function(label,i){return h('button',{class:{'is-selected':self.curTabIndex===i},attrs:{type:'button','aria-pressed':String(self.curTabIndex===i)},on:{click:function(){changeTab(self,i);}}},[label]);})),
          h('div',{class:'pf-calendar-preview',attrs:{'aria-live':'polite'}},[h('strong',[p.main]),h('small',[p.sub])]),
          h('div',{class:'pf-calendar-body'},[
            h('SolarBox',{key:'solar-'+this.solarBoxKey,ref:'solarBox',style:{display:this.curTabIndex===0?'':'none'},props:{solars:this.solars},on:{change:this.onChangeSolar,yearRange:this.onYearRange}}),
            h('LunarBox',{key:'lunar-'+this.lunarBoxKey,ref:'lunarBox',style:{display:this.curTabIndex===1?'':'none'},props:{lunars:this.lunars},on:{change:this.onChangeLunar,yearRange:this.onYearRange}}),
            h('SizhuBox',{ref:'sizhuBox',style:{display:this.curTabIndex===2?'':'none'},props:{yearRangeData:this.yearRangeSizhuData},on:{yearRange:this.onYearRangeOfSizhu}}),
            this.curTabIndex<2?h('XLSBox',{props:{isXLS:this.curIsXLS},on:{xls:this.onChangeXLS}}):null
          ]),
          this.datetimeData.error?h('p',{class:'pf-calendar-error',attrs:{role:'alert'}},[this.datetimeData.error]):null,
          h('footer',{class:'pf-calendar-footer'},[this.curTabIndex<2?button(h,'当前时间',function(){useNow(self);},'pf-calendar-now'):null,h('button',{class:'pf-calendar-confirm',attrs:{type:'button',disabled:!!this.datetimeData.confirming},on:{click:function(){confirmPicker(self);}}},[this.datetimeData.confirming?'正在确认…':'使用此时间'])])
        ])
      ])
    ]);
  }
  function renderWheel(h,lunar){
    var self=this;return h('div',{class:'pf-calendar-wheel'},[
      h('div',{class:'pf-calendar-column-labels'},['年','月','日','时','分'].map(function(label){return h('span',[label]);})),
      h('van-picker',{ref:'pickerRef',props:{columns:lunar?this.lunars:this.solars,itemHeight:42,visibleItemCount:5,allowHtml:false},on:{change:lunar?this.onChangeLunar:this.onChangeSolar}}),
      button(h,'调整可选年份范围',function(){self.onYearRange();},'pf-calendar-range')
    ]);
  }
  function renderSizhu(h){
    var self=this,labels=this.headerArr;return h('div',{class:'pf-sizhu-picker'},[
      h('div',{class:['pf-sizhu-pillars',{'has-fifth':this.isFenZhuOpen}]},labels.map(function(label,i){return h('section',[h('small',[label]),[i*2,i*2+1].map(function(index){return button(h,self.sizhuList[index]&&self.sizhuList[index].value||'选'+(index%2?'地支':'天干'),function(){self.onSizhu(index);},['pf-sizhu-value',{'is-selected':self.sizhuIndex===index||((i===1||i===3||i===4)&&Math.floor(self.sizhuIndex/2)===i)}]);})]);})),
      h('div',{class:'pf-sizhu-tools'},[button(h,'查找范围：'+this.yearRangeData.value+'年',this.onYearRange,'pf-calendar-range'),button(h,'清空',function(){self.onClear();message(self,'');},'pf-calendar-cancel')]),
      this.sizhuIndex<this.dateResultIndex?h('div',{class:'pf-sizhu-options'},(this.resList||[]).reduce(function(all,value){return all.concat(Array.isArray(value)?value:[value]);},[]).map(function(value){return button(h,value,function(){self.onSelect(value);message(self,'');},'pf-sizhu-option');}).concat(this.showResultUnknownOption?[button(h,'未知',function(){self.onSelect('未知');},'pf-sizhu-option')]:[])):null,
      this.sizhuIndex>=this.dateResultIndex?h('section',{class:'pf-sizhu-matches'},[
        h('h3',[this.isDatetimeLoading?'正在本地查找…':this.datetimeList.length?'选择对应出生日期（'+this.datetimeList.length+'条）':'没有匹配日期']),
        h('p',{class:'pf-calendar-hint'},[this.lookupError||'四柱无法还原具体分钟；下列为符合四柱的参考时刻，请核对年份。']),
        this.datetimeList.map(function(row,i){return h('button',{key:row.solar,class:['pf-sizhu-match',{'is-selected':self.datetimeIndex===i}],attrs:{type:'button','aria-pressed':String(self.datetimeIndex===i)},on:{click:function(){self.onSelectOfDate(i);message(self,'');}}},[h('strong',[row.solarText||row.solar]),h('small',[row.lunarText||row.lunar]),h('span',[self.datetimeIndex===i?'已选':'选择'])]);}),
        !this.isDatetimeLoading&&!this.datetimeList.length?button(h,'重新查找',function(){self.getSizhuResult();},'pf-calendar-range'):null
      ]):null
    ]);
  }
  global.WZBZCalendarInput=Object.freeze({parseSolar:parseSolar,confirmSolar:confirmSolar,confirmLunar:confirmLunar,confirmSizhu:confirmSizhu,lookup:lookup,close:close,changeTab:changeTab,changeSolar:changeSolar,changeLunar:changeLunar,applySolar:applySolar,useNow:useNow,confirmForm:confirmForm,renderDatetime:renderDatetime,renderWheel:renderWheel,renderSizhu:renderSizhu});
})(window);
