(function(global){
  'use strict';
  function validCase(data){
    var b=data&&data.bzArr,gan='甲乙丙丁戊己庚辛壬癸',zhi='子丑寅卯辰巳午未申酉戌亥';
    return Array.isArray(b)&&b.length===8&&b.every(function(v,i){return typeof v==='string'&&v.length===1&&((i%2?zhi:gan).includes(v)||(i>=6&&v==='*'));});
  }
  function match(view,book,api){
    if(!validCase(view.gjData)){view.tabs=[];view.tabsDex=0;view.matchNotice='等待当前命盘信息';return 0;}
    if(global.BaziClassicsCatalogue){
      var publicTabs=global.BaziClassicsCatalogue.tabs(view,book,api);
      if(publicTabs){view.tabs=publicTabs;view.matchNotice=publicTabs.length?'':'当前底本未提供对应篇目。';if(!Number.isInteger(view.tabsDex)||view.tabsDex<0||view.tabsDex>=publicTabs.length)view.tabsDex=0;return publicTabs.length?view.tabsDex+1:0;}
    }
    var branch=api['getGuji'+book.id+'_branch'],raw=branch(view.gjData.bzArr,view.gjData.geju),seen=new Set();
    view.tabs=(raw||[]).filter(function(tab){
      var fn=api['getIndex'+book.id+'_'+(tab.index+1)],key=tab.index+'|'+tab.value;
      if(seen.has(key)||typeof fn!=='function')return false;
      seen.add(key);var index=fn(view.gjData.bzArr,tab.value);
      return Number.isInteger(index)&&index>0;
    });
    if(!view.tabs.length)view.matchNotice='当前信息或格局在该书目录中暂无匹配条目。';
    else view.matchNotice=view.tabs.length<raw.length?'已略过当前目录未提供的条目。':'';
    if(!Number.isInteger(view.tabsDex)||view.tabsDex<0||view.tabsDex>=view.tabs.length)view.tabsDex=0;
    var tab=view.tabs[view.tabsDex];
    return tab?api['getIndex'+book.id+'_'+(tab.index+1)](view.gjData.bzArr,tab.value):0;
  }
  function request(view){
    var book=view.books[view.swiperDex]&&view.books[view.swiperDex][view.swiperDex2],tab=view.tabs[view.tabsDex];
    if(!validCase(view.gjData)||!book||!tab||!Number.isInteger(view.tipResult)||view.tipResult<1)return '';
    var source=global.BaziPublicClassics&&global.BaziPublicClassics.resolve(view);
    return source?source.url:'';
  }
  function notifyHeight(view){
    if(view._isDestroyed)return;
    view.$nextTick(function(){
      if(view._isDestroyed)return;
      var root=document.getElementById('gj_app'),height=root&&root.offsetHeight;
      if(height>0)global.parent.postMessage({type:'smartbooks_height',data:height},'*');
    });
  }
  function cancel(view){
    view._bookRequest=(view._bookRequest||0)+1;
    if(view._bookCancel)view._bookCancel();
    view._bookCancel=null;
    if(view._bookController)view._bookController.abort();
    view._bookController=null;view.loadingBook=false;view.bookSrc='';view.showBookBox=false;
    if(view._lastBlobUrl){URL.revokeObjectURL(view._lastBlobUrl);view._lastBlobUrl=null;}
  }
  // Sanitized local reader document runs in an opaque sandbox; only size is sent.
  var heightScript='<script>(function(){var last=0;function send(){var h=Math.ceil(Math.max(document.body?document.body.scrollHeight:0,document.documentElement.scrollHeight));if(h>0&&Math.abs(h-last)>1){last=h;parent.postMessage({type:"smartbooks_iframeheight",data:h},"*")}}window.addEventListener("load",send);document.addEventListener("load",send,true);if(window.ResizeObserver&&document.body)new ResizeObserver(send).observe(document.body);send()})();<\/script>';
  function documentText(text){
    if(!/<head\b/i.test(text)||!/<\/head\s*>/i.test(text))throw Error('服务未返回可阅读的古籍页面');
    return /<\/body\s*>/i.test(text)?text.replace(/<\/body\s*>/i,heightScript+'</body>'):text+heightScript;
  }
  async function load(view){
    cancel(view);var url,sequence=view._bookRequest,timer,stop,source;
    view.readError='';
    try{url=request(view);}catch(error){view.readError='古籍条目无法定位：'+error.message;notifyHeight(view);return;}
    if(!url){notifyHeight(view);return;}
    view.loadingBook=true;
    var controller=typeof AbortController==='function'?new AbortController():null;
    view._bookController=controller;
    try{
      source=global.BaziPublicClassics&&global.BaziPublicClassics.resolve(view);
      var text=await Promise.race([
        (async function(){
          if(!source)throw Error('当前条目未配置可用底本');
          return global.BaziPublicClassics.fetchText(source,controller?controller.signal:undefined);
        })(),
        new Promise(function(_,reject){
          stop=function(){clearTimeout(timer);reject(Error('请求已取消'));};
          view._bookCancel=stop;
          timer=setTimeout(function(){reject(Error('请求超时'));if(controller)controller.abort();},15000);
        })
      ]);
      if(sequence!==view._bookRequest||view._isDestroyed)return;
      var html=documentText(global.BaziPublicClassics.documentText(text,source,view.isDark));
      view._lastBlobUrl=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));
      view.bookHeight='360px';view.showBookBox=true;
      view.bookSrc=view._lastBlobUrl;
    }catch(error){
      if(sequence!==view._bookRequest||view._isDestroyed)return;
      view.readError='古籍加载失败，请重试。'+(String(error.message||'').slice(0,80));
      view.bookHeight='0px';
    }finally{
      clearTimeout(timer);
      if(view._bookCancel===stop)view._bookCancel=null;
      if(sequence===view._bookRequest){view.loadingBook=false;view._bookController=null;notifyHeight(view);}
    }
  }
  function accept(view,event){
    if(!event||!event.data||typeof event.data!=='object')return false;
    var type=event.data.type;
    if(['GujiData','bazi_nightMode','bzGejuSet','bazi_smartbooks_feedback'].includes(type))
      return event.source===global.parent&&(type!=='GujiData'||validCase(event.data.data));
    var frame=document.getElementById('bookbox');
    return !!frame&&event.source===frame.contentWindow;
  }
  global.BaziClassicsReader=Object.freeze({validCase:validCase,match:match,request:request,cancel:cancel,load:load,accept:accept,notifyHeight:notifyHeight,documentText:documentText});
})(window);
