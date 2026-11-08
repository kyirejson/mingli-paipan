(function(global){
  'use strict';
  var gan='甲乙丙丁戊己庚辛壬癸',zhi='子丑寅卯辰巳午未申酉戌亥';
  function correctEightChar(solar,eight,midnight){
    if(!midnight||solar.getHour()!==23)return eight;
    var day=gan.indexOf(eight.getDayGan());
    if(day<0)throw Error('无法确定晚子时日干');
    var stem=gan[(day%5)*2],gz=stem+'子',index=0;
    while(index<60&&(gan[index%10]+zhi[index%12])!==gz)index++;
    if(index===60)throw Error('无效的晚子时时柱');
    var xun='甲'+zhi[(Math.floor(index/10)*10)%12],empty=['戌亥','申酉','午未','辰巳','寅卯','子丑'][Math.floor(index/10)];
    eight.getTime=function(){return gz;};eight.getTimeGan=function(){return stem;};eight.getTimeZhi=function(){return '子';};
    eight.getTimeXun=function(){return xun;};eight.getTimeXunKong=function(){return empty;};
    if(global.LunarUtil){
      if(global.LunarUtil.NAYIN&&global.LunarUtil.NAYIN[gz])eight.getTimeNaYin=function(){return global.LunarUtil.NAYIN[gz];};
      if(global.LunarUtil.SHI_SHEN&&global.LunarUtil.SHI_SHEN[eight.getDayGan()+stem])eight.getTimeShiShenGan=function(){return global.LunarUtil.SHI_SHEN[eight.getDayGan()+stem];};
    }
    return eight;
  }
  function chartTime(info){return String(info&&(info.sunTime||info.strSunTime||info.solarTime)||'');}
  global.WZBZTimePolicy=Object.freeze({correctEightChar:correctEightChar,chartTime:chartTime});
})(window);
