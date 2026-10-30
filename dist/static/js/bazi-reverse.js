// Jie/month and sixty-day lookup derived from lunar-javascript (6tail, MIT).
// License: ../licenses/lunar-javascript.txt; https://github.com/6tail/lunar-javascript
(function(global) {
  'use strict';
  var GAN='甲乙丙丁戊己庚辛壬癸', ZHI='子丑寅卯辰巳午未申酉戌亥', cache=new Map();
  function index(gz) { for(var i=0;i<60;i++)if(GAN[i%10]+ZHI[i%12]===gz)return i; return -1; }
  function pillars(solar, midnight) {
    var copy=global.Solar.fromYmdHms(solar.getYear(),solar.getMonth(),solar.getDay(),solar.getHour(),solar.getMinute(),solar.getSecond());
    var eight=copy.getLunar().getEightChar();
    eight.setSect(midnight?2:1);
    global.WZBZTimePolicy.correctEightChar(copy,eight,midnight);
    return [eight.getYear(),eight.getMonth(),eight.getDay(),eight.getTime()];
  }
  function validated(value) {
    var text=String(value||'').replace(/\s/g,'');
    if(text.length!==8)throw Error('请补全年、月、日、时四柱');
    var result=[text.slice(0,2),text.slice(2,4),text.slice(4,6),text.slice(6,8)];
    if(result.some(function(gz){return index(gz)<0;}))throw Error('四柱中有无效的干支组合');
    return result;
  }
  async function search(value, options) {
    options=options||{};
    var target=validated(value),min=Number(options.minYear||1801),max=Number(options.maxYear||2099),midnight=options.midnight!==false;
    if(!Number.isInteger(min)||!Number.isInteger(max)||min<1||max>2099||min>max)throw Error('查找年份范围无效');
    var key=target.join('')+'|'+min+'|'+max+'|'+midnight;
    if(cache.has(key)){var cached=cache.get(key);cache.delete(key);cache.set(key,cached);return (await cached).slice();}
    var task=(async function(){
      var monthOffset=(ZHI.indexOf(target[1][1])+10)%12;
      if(((GAN.indexOf(target[0][0])+1)*2+monthOffset)%10!==GAN.indexOf(target[1][0]))return [];
      var matches=[],year=(index(target[0])-57+60)%60+1;
      while(year<min-1)year+=60;
      for(;year<=max;year+=60){
        // The same Jie/month and sixty-day offsets used by lunar-javascript's Solar.fromBaZi.
        var lunar=global.Lunar.fromYmd(year,1,1),names=lunar.getJieQiList(),term=lunar.getJieQiTable()[names[4+monthOffset*2]];
        var dayOffset=(index(target[2])-index(term.getLunar().getDayInGanZhiExact2())+60)%60;
        var middle=ZHI.indexOf(target[3][1])*2, hours=middle===0?[0,23]:[middle];
        for(var shift=-1;shift<=1;shift++){
          var day=term.next(dayOffset+shift);
          if(day.getYear()<min||day.getYear()>max)continue;
          hours.forEach(function(hour){
            var candidates=[[hour,0,0]];
            if(hour>0&&hour!==23)candidates.push([hour-1,0,0]);
            if(day.toYmd()===term.toYmd())candidates.push([term.getHour(),term.getMinute(),term.getSecond()]);
            for(var i=0;i<candidates.length;i++){
              var t=candidates[i];
              if((t[0]===23?23:Math.floor((t[0]+1)/2)%12*2)!==(hour===23?23:middle))continue;
              var solar=global.Solar.fromYmdHms(day.getYear(),day.getMonth(),day.getDay(),t[0],t[1],t[2]);
              if(pillars(solar,midnight).join('')===target.join('')){matches.push(solar.toYmdHms());break;}
            }
          });
        }
        // A wide historical search must yield instead of holding the UI thread for all years.
        await new Promise(function(resolve){setTimeout(resolve,0);});
      }
      return Array.from(new Set(matches)).sort().reverse();
    })();
    cache.set(key,task);if(cache.size>32)cache.delete(cache.keys().next().value);
    try{return (await task).slice();}catch(error){cache.delete(key);throw error;}
  }
  global.WZBZBaziReverse=Object.freeze({search:search,pillars:pillars,validated:validated});
})(window);
