(function(global){
  'use strict';
  var loaded='',pending;
  async function load(){
    if(loaded)return loaded;if(pending)return pending;
    pending=(async function(){
      var controller=typeof AbortController==='function'?new AbortController():null,timer;
      try{
        var text=await Promise.race([(async function(){var response=await fetch('./static/data/celebrity-legacy.csv',{cache:'no-store',signal:controller?controller.signal:undefined});if(!response.ok)throw Error('HTTP '+response.status);return response.text();})(),new Promise(function(_,reject){timer=setTimeout(function(){if(controller)controller.abort();reject(Error('名人资料读取超时'));},10000);})]);
        var rows=text.trim().split(/[\r\n]+/).filter(Boolean);
        if(!rows.length||rows.some(function(row){var parts=row.split(',');return parts.length<8||!parts[0]||!/^mr\d+$/.test(parts[4]);}))throw Error('名人资料格式异常');
        loaded=rows.join('\n');return loaded;
      }finally{clearTimeout(timer);pending=null;}
    })();return pending;
  }
  function alignNotice(){
    var notice=global.document&&global.document.querySelector('.pf-famous-source');if(!notice)return;
    var parent=notice.parentNode,header=parent.querySelector('.header-box');if(!header)return;
    parent.style.setProperty('--pf-record-header-height',header.getBoundingClientRect().height+'px');
  }
  if(global.addEventListener)global.addEventListener('resize',function(){global.requestAnimationFrame(alignNotice);});
  global.WZBZCelebrityLibrary=Object.freeze({load:load,alignNotice:alignNotice});
})(window);
