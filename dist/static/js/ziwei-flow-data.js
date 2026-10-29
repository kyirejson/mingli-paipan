(function(global){
  'use strict';
  var states=new WeakMap();
  function cached(map,key,limit,build){
    if(map.has(key)){var value=map.get(key);map.delete(key);map.set(key,value);return value;}
    var value=build();map.set(key,value);if(map.size>limit)map.delete(map.keys().next().value);return value;
  }
  function state(chart){var s=states.get(chart);if(!s){s={decades:chart.decadalList(),years:new Map(),yearly:new Map(),daily:new Map(),hourly:new Map()};states.set(chart,s);}return s;}
  function get(chart,date,hour,full,rules){
    var E=global.FiveArtsEngine,s=state(chart),lunar=E.calendar(date+' 12:00').lunar,year=lunar.getYear(),month=lunar.getMonth(),day=lunar.getDay(),ruleKey=JSON.stringify(rules||{});
    var decades=s.decades,range=decades.find(function(d){return year>=d.yearRange[0]&&year<=d.yearRange[1];}),yearRange;
    if(range)yearRange=range.yearRange;else if(!decades.length)yearRange=[year,year+9];else{var first=decades[0],start=first.yearRange[0];yearRange=year<start?[start-first.ageRange[0]+1,start-1]:(start+=Math.floor((year-start)/10)*10,[start,start+9]);}
    if(!s.decadeItems)s.decadeItems=decades.map(function(d){return {label:d.ageRange.join('～'),gz:d.heavenlyStem+d.earthlyBranch,date:E.lunarSolar(d.yearRange[0],1,1),index:d.index};});
    var years=cached(s.yearly,yearRange.join('|')+'|'+hour+'|'+ruleKey,4,function(){return Array.from({length:yearRange[1]-yearRange[0]+1},function(_,i){var y=yearRange[0]+i,date=E.lunarSolar(y,1,1),gz=E.ziweiFlowGanzhi(date,hour,rules);return {label:String(y),gz:gz.yearly.join(''),date:date,year:y};});});
    var rows=[{scope:'decadal',label:'大限',items:s.decadeItems},{scope:'yearly',label:'流年',items:years}];
    if(full){
      var months=cached(s.years,year+'|'+ruleKey,4,function(){return chart.monthlyList(year).map(function(m){return {label:(m.isLeapMonth?'闰':'')+m.month+'月'+(m.part==='normal'?'':m.part==='first'?'前':'后'),gz:m.heavenlyStem+m.earthlyBranch,date:E.lunarSolar(year,m.isLeapMonth?-m.month:m.month,m.dayRange[0]),month:m.month,isLeap:m.isLeapMonth,dayRange:m.dayRange.slice()};});});
      var current=months.find(function(m){return m.month===Math.abs(month)&&m.isLeap===(month<0)&&day>=m.dayRange[0]&&day<=m.dayRange[1];}),days=current?current.dayRange[1]:30;
      var daily=cached(s.daily,[year,month,days,hour,ruleKey].join('|'),6,function(){return Array.from({length:days},function(_,i){var date=E.lunarSolar(year,month,i+1),gz=E.ziweiFlowGanzhi(date,hour,rules);return {label:i+1+'日',gz:gz.daily.join(''),date:date,dayNum:i+1};});});
      var hourly=cached(s.hourly,date+'|'+ruleKey,16,function(){return Array.from({length:13},function(_,i){return {label:i===12?'晚子':E.ZHI[i]+'时',gz:E.ziweiFlowGanzhi(date,i,rules).hourly.join(''),hour:i,date:date};});});
      rows.push({scope:'monthly',label:'流月',items:months.map(function(m){return Object.assign({},m,{current:m===current});})},{scope:'daily',label:'流日',items:daily},{scope:'hourly',label:'流时',items:hourly});
    }
    return {rows:rows,year:year,day:day};
  }
  function stats(chart){var s=states.get(chart);return s?{years:s.years.size,yearly:s.yearly.size,daily:s.daily.size,hourly:s.hourly.size}:null;}
  global.WZBZFlowData=Object.freeze({get:get,stats:stats});
})(window);
