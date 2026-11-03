/* On-demand reader for openly accessible source pages. No book text is bundled. */
(function(global){
  'use strict';
  var gan='甲乙丙丁戊己庚辛壬癸',zhi='子丑寅卯辰巳午未申酉戌亥',months='寅卯辰巳午未申酉戌亥子丑';
  var cache=new Map(),limit=12;
  function resolve(view){
    var book=view.books[view.swiperDex]&&view.books[view.swiperDex][view.swiperDex2],tab=view.tabs[view.tabsDex],b=view.gjData.bzArr;
    if(!book||!tab||!Array.isArray(b)||b.length!==8||![3,4].includes(book.id))return null;
    var stem=gan.indexOf(b[4]),hour=zhi.indexOf(b[7]),month=months.indexOf(b[3]),chapter,expected,mode;
    if(stem<0||month<0)throw Error('当前命盘缺少有效的日干或月支');
    if(hour>=0&&b[6]!==gan[(stem%5*2+hour)%10])throw Error('当前时柱与日干不相符');
    if(book.id===4){
      if(hour<0)return null;
      chapter=month*10+stem+1;expected=b[4]+'日';mode='tiyao';
    }else if(tab.index===0){
      if(hour<0)return null;
      chapter=184+stem*12+hour;expected='六'+b[4]+'日'+b[6]+b[7]+'时断';mode='dayHour';
    }else if(tab.index===1){chapter=14;expected='论天干阴阳生死';mode='stem';
    }else if(tab.index===2){chapter=63;expected='论十二月支得日干吉凶';mode='month';
    }else{chapter={甲:65,乙:65,丙:66,丁:66,戊:67,己:67,庚:68,辛:68,壬:69,癸:69}[b[4]];expected='论'+{甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'}[b[4]];mode='element';}
    return {url:'https://luckclub.cn/bazi/'+(book.id===4?'015':'005')+'/'+String(chapter).padStart(3,'0')+'/',
      book:book.name,expected:expected,mode:mode,bazi:b.slice(),label:tab.value};
  }
  function allowed(url){return /^https:\/\/luckclub\.cn\/bazi\/(?:005|015)\/\d{3}\/$/.test(url);}
  async function fetchText(source,signal){
    if(!allowed(source.url))throw Error('无效的古籍原文地址');
    if(cache.has(source.url)){var hit=cache.get(source.url);cache.delete(source.url);cache.set(source.url,hit);return hit;}
    var cap,text;
    try{cap=global.parent.Capacitor;}catch(_){}
    if(cap&&cap.isNativePlatform&&cap.isNativePlatform()&&cap.isPluginAvailable('CapacitorHttp')){
      var result=await cap.Plugins.CapacitorHttp.get({url:source.url,responseType:'text',connectTimeout:15000,readTimeout:15000,disableRedirects:true,headers:{Accept:'text/html'}});
      if(result.status!==200)throw Error('HTTP '+result.status);
      if(result.url&&result.url!==source.url)throw Error('古籍原文地址发生变化');
      text=result.data;
    }else{
      var response=await global.fetch(source.url,{credentials:'omit',cache:'no-store',signal:signal});
      if(!response.ok)throw Error('HTTP '+response.status);
      text=await response.text();
    }
    if(typeof text!=='string'||text.length>1000000||!text.includes('id="article-content"'))throw Error('服务未返回古籍原文');
    cache.set(source.url,text);while(cache.size>limit)cache.delete(cache.keys().next().value);
    return text;
  }
  function clean(text){return String(text||'').replace(/\s+/g,'').trim();}
  function extract(text,source){
    var doc=new DOMParser().parseFromString(text,'text/html'),article=doc.querySelector('#article-content');
    if(!article)throw Error('古籍原文章节缺失');
    var heading=article.querySelector('h1'),title=heading&&heading.textContent.trim();
    if(clean(title)!==clean(source.expected))throw Error('古籍标题与当前条目不一致');
    // Only original article paragraphs; translations and site navigation are separate.
    var blocks=Array.from(article.children).filter(function(e){return /^(P|H2|H3|H4|BLOCKQUOTE)$/.test(e.tagName);})
      .map(function(e){return {text:e.textContent.trim(),heading:/^H/.test(e.tagName)||!!e.querySelector('strong')};}).filter(function(e){return e.text;});
    var b=source.bazi,selected;
    if(source.mode==='tiyao'){
      var key=b[3]+'月'+b[4]+'日'+b[6]+b[7]+'时',start=blocks.findIndex(function(p){return clean(p.text)===key;});
      if(start<0&&b[7]==='子'){
        var end=blocks.findIndex(function(p){return p.heading;});selected=blocks.slice(0,end<0?blocks.length:end);
      }else if(start>=0){
        var end=start+1;while(end<blocks.length&&!blocks[end].heading)end++;
        selected=blocks.slice(start+1,end);
      }
      if(!selected||!selected.length)throw Error('原文中未找到当前月日时条目');
      return {title:key,blocks:selected};
    }
    if(source.mode==='dayHour'){
      var target=b[4]+b[5]+'日'+b[6]+b[7]+'时',matched=blocks.filter(function(p){return clean(p.text).startsWith(target);});
      // Some editions omit an individual day or contain a damaged day label. Do not guess a replacement.
      if(!matched.length)return {title:title+' · 日干时辰总论',blocks:blocks,level:'stem-hour'};
      selected=blocks.filter(function(p){return !/^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]日/.test(clean(p.text))||clean(p.text).startsWith(target);});
      return {title:target,blocks:selected,level:'exact-day'};
    }
    if(source.mode==='stem'){
      selected=blocks.filter(function(p){return clean(p.text).startsWith(b[4]+{甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'}[b[4]]);});
      if(!selected.length){
        var lead=b[4]+{甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'}[b[4]]+'继';
        var joined=blocks.find(function(p){return p.text.includes(lead);});
        if(joined)selected=[{text:joined.text.slice(joined.text.indexOf(lead)),heading:false}];
      }
      if(!selected.length)throw Error('原文中未找到当前日干条目');
      return {title:title+' · '+b[4]+'日',blocks:selected};
    }
    if(source.mode==='month'){
      var start=blocks.findIndex(function(p){return clean(p.text)===b[3]+'月';});
      if(start<0)throw Error('原文中未找到当前月份');
      selected=[];
      for(var i=start+1;i<blocks.length;i++){
        if(/^[子丑寅卯辰巳午未申酉戌亥]月$/.test(clean(blocks[i].text)))break;
        selected.push(blocks[i]);
      }
      if(!selected.length)throw Error('原文中未找到当前月日条目');
      return {title:b[3]+'月 · 各日干原论',blocks:selected,level:'month'};
    }
    if(!blocks.length)throw Error('原文内容为空');
    return {title:title+' · 原典相关章节',blocks:blocks};
  }
  function escape(text){return String(text).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function documentText(text,source,dark){
    var entry=extract(text,source);
    return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
      '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; script-src \'unsafe-inline\'">'+
      '<title>'+escape(source.book+' · '+entry.title)+'</title><style>:root{color-scheme:'+(dark?'dark':'light')+'}html,body{margin:0;background:'+(dark?'#18231e':'#f5f1e9')+';color:'+(dark?'#e2e8dc':'#233b33')+';font:17px/1.9 system-ui,sans-serif;overflow-wrap:anywhere}main{padding:18px 16px}h1{font:600 21px/1.6 serif;margin:0 0 16px}p{margin:0 0 16px;text-indent:2em}h2{font-size:18px}footer{border-top:1px solid '+(dark?'#3b4d40':'#dcded2')+';padding-top:12px;font-size:12px}a{color:'+(dark?'#afd0b4':'#23483b')+'}</style></head><body><main><h1>'+escape(entry.title)+'</h1>'+
      entry.blocks.map(function(p){return '<'+(p.heading?'h2':'p')+'>'+escape(p.text)+'</'+(p.heading?'h2':'p')+'>';}).join('')+
      '<footer>《'+escape(source.book)+'》原文 · 来源：<a href="'+escape(source.url)+'" referrerpolicy="no-referrer">古籍典藏</a></footer></main></body></html>';
  }
  global.BaziPublicClassics=Object.freeze({resolve:resolve,fetchText:fetchText,extract:extract,documentText:documentText});
})(window);
