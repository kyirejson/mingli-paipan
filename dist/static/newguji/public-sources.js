/* On-demand reader for openly accessible source pages. No book text is bundled. */
(function(global){
  'use strict';
  var gan='甲乙丙丁戊己庚辛壬癸',zhi='子丑寅卯辰巳午未申酉戌亥',months='寅卯辰巳午未申酉戌亥子丑';
  var cache=new Map(),limit=12;
  function resolve(view){
    var book=view.books[view.swiperDex]&&view.books[view.swiperDex][view.swiperDex2],tab=view.tabs[view.tabsDex],b=view.gjData.bzArr;
    if(tab&&tab.publicSource)return Object.assign({},tab.publicSource,{bazi:b.slice()});
    if(!book||!tab||!Array.isArray(b)||b.length!==8||![3,4].includes(book.id))return null;
    var stem=gan.indexOf(b[4]),hour=zhi.indexOf(b[7]),month=months.indexOf(b[3]),chapter,expected,mode;
    if(stem<0||month<0)throw Error('当前命盘缺少有效的日干或月支');
    if(hour>=0&&b[6]!==gan[(stem%5*2+hour)%10])throw Error('当前时柱与日干不相符');
    if(book.id===4){
      chapter=month*10+stem+1;expected=b[4]+'日';mode=hour<0?'chapter':'tiyao';
    }else if(tab.index===0){
      if(hour<0)return null;
      chapter=184+stem*12+hour;expected='六'+b[4]+'日'+b[6]+b[7]+'时断';mode='dayHour';
    }else if(tab.index===1){chapter=14;expected='论天干阴阳生死';mode='stem';
    }else if(tab.index===2){chapter=63;expected='论十二月支得日干吉凶';mode='month';
    }else{chapter={甲:65,乙:65,丙:66,丁:66,戊:67,己:67,庚:68,辛:68,壬:69,癸:69}[b[4]];expected='论'+{甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'}[b[4]];mode='element';}
    return {url:'https://luckclub.cn/bazi/'+(book.id===4?'015':'005')+'/'+String(chapter).padStart(3,'0')+'/',
      book:book.name,expected:expected,mode:mode,bazi:b.slice(),label:tab.value};
  }
  function allowed(url){return /^https:\/\/luckclub\.cn\/bazi\/(?:001|002|003|004|005|006|007|008|010|013|015)\/\d{3}\/$/.test(url)||/^https:\/\/tianjihq\.com\/zh-CN\/learn\/books\/tianyuan-wuxian-jing\/(?:[1-9]|[1-3]\d|4[0-3])$/.test(url)||url===encodeURI('https://libokang.com/classics/bazi/李虚中命书/');}
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
    if(typeof text!=='string'||text.length>1500000||!(text.includes('id="article-content"')||source.mode==='tianyuan'&&text.includes('<article')||source.mode==='pairedPillar'&&text.includes('class="reader"')))throw Error('服务未返回古籍正文');
    cache.set(source.url,text);while(cache.size>limit)cache.delete(cache.keys().next().value);
    return text;
  }
  function clean(text){return String(text||'').replace(/[\s\u00ad]/g,'').trim();}
  function group(blocks,target,pattern){
    var start=blocks.findIndex(function(p){return clean(p.text).startsWith(target);});if(start<0)return [];
    var end=start+1;while(end<blocks.length&&!pattern.test(clean(blocks[end].text)))end++;
    return blocks.slice(start,end);
  }
  function extractOriginal(text,source,doc){
    var article=doc.querySelector('#article-content');
    if(source.mode==='pairedPillar'){
      var root=doc.querySelector('main.reader'),bookTitle=root&&root.querySelector('h1');if(!root||!bookTitle||clean(bookTitle.textContent)!==clean(source.expected))throw Error('李虚中底本书名不一致');
      var heading=Array.from(root.querySelectorAll('h2')).find(function(h){return clean(h.textContent)==='李虚中命书卷上';}),pairs=[];
      for(var el=heading&&heading.nextElementSibling;el&&el.tagName!=='H2';el=el.nextElementSibling)if(el.classList.contains('pair'))pairs.push(el);
      var pattern=new RegExp(source.target+'[天地神贵禄][^，。；：]{1,5}，[乃为是自不]'),found=pairs.filter(function(p){var o=p.querySelector('.o');return o&&pattern.test(clean(o.textContent));});
      // This edition preserves a repeated 辛酉 copying 庚申. Select the distinct
      // 包秀结英 passage explicitly, rather than letting source order decide.
      if(source.target==='辛酉')found=found.filter(function(p){return /辛酉神头禄，乃包秀结英/.test(clean(p.querySelector('.o').textContent));});
      if(found.length!==1)throw Error('干支原段缺失或存在冲突：'+source.target);
      var original=found[0].querySelector('.o'),translated=found[0].querySelector('.t');if(!translated||!translated.textContent.trim())throw Error('对应白话译注缺失');
      return {title:source.target+' · 干支纳音原论',blocks:[{text:original.textContent.trim(),heading:false}],annotations:[{text:translated.textContent.trim(),heading:false}],chapterAnnotations:[],level:'paired-passage',paired:true,notice:'按干支纳音体系对照，保留所在原段及其对译；同段可能包含相邻干支。'+(source.target==='辛酉'?'底本另有重出的辛酉文字，此处定位“包秀结英”原段。':''),annotationLabel:'所在原段白话译注'};
    }
    if(source.mode==='tianyuan'){
      article=doc.querySelector('article');var h=article&&article.querySelector('h1'),body=article&&article.querySelector('div.mt-7.space-y-5');
      if(!h||clean(h.textContent)!==clean(source.expected)||!body)throw Error('巫咸底本篇名或正文不一致');
      var original=Array.from(body.children).filter(function(e){return e.tagName==='P';}).map(function(e){return {text:e.textContent.trim(),heading:false};}).filter(function(p){return p.text;});
      if(!original.length)throw Error('巫咸底本正文为空');return {title:source.expected,blocks:original,level:'chapter',oldAnnotations:true};
    }
    if(!article)throw Error('古籍原文章节缺失');
    var heading=article.querySelector('h1'),title=heading&&heading.textContent.trim();
    if(clean(title)!==clean(source.expected))throw Error('古籍标题与当前条目不一致');
    // Only original article paragraphs; translations and site navigation are separate.
    var blocks=Array.from(article.children).filter(function(e){return /^(P|H2|H3|H4|BLOCKQUOTE)$/.test(e.tagName);})
      .map(function(e){return {text:e.textContent.trim(),heading:/^H/.test(e.tagName)||!!e.querySelector('strong')&&clean(e.querySelector('strong').textContent)===clean(e.textContent)};}).filter(function(e){return e.text;});
    var b=source.bazi,selected;
    if(source.mode==='chapter')return {title:title,blocks:blocks,level:'chapter'};
    if(source.mode==='stemSection'){
      selected=group(blocks,source.target,/^[甲乙丙丁戊己庚辛壬癸][木火土金水]/);
      if(selected.length)return {title:title+' · '+source.target,blocks:selected,level:'stem-section'};
      return {title:title+' · 全章',blocks:blocks,level:'chapter',notice:'该电子本未按日干独立分段，按原章呈现。'};
    }
    if(source.mode==='pillar'){
      if(blocks.filter(function(p){return clean(p.text).startsWith(source.target);}).length!==1)throw Error('干支原文存在缺项或冲突');
      selected=group(blocks,source.target,/^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/);
      if(!selected.length)throw Error('底本未找到'+source.target+'干支条');
      return {title:source.target+' · 干支纳音原论',blocks:selected,level:'pillar',notice:'此书采用古法干支纳音体系，此处作条文对照。'};
    }
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
  function extract(text,source){
    var doc=new DOMParser().parseFromString(text,'text/html'),entry=extractOriginal(text,source,doc);
    if(entry.paired)return entry;
    var pane=doc.querySelector('#pane-translation'),body=pane&&Array.from(pane.children).find(function(e){return e.classList.contains('space-y-3');});
    var translated=body?Array.from(body.querySelectorAll('p,h2,h3,h4')).map(function(e){return {text:e.textContent.trim(),heading:/^H/.test(e.tagName)};}).filter(function(p){return p.text;}):[];
    entry.annotations=[];entry.chapterAnnotations=[];
    if(translated.length){
      if(source.mode==='tiyao'){
        var key=source.bazi[6]+source.bazi[7]+'时';entry.annotations=group(translated,key,/^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]时/);
        if(!entry.annotations.length&&source.bazi[7]==='子'){var n=translated.findIndex(function(p){return /^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]时/.test(clean(p.text));});entry.annotations=translated.slice(0,n<0?translated.length:n);}
      }else if(source.mode==='dayHour'&&entry.level==='exact-day'){
        var target=source.bazi.slice(4).join('').replace(/^(.{2})(.{2})$/,'$1日$2时');
        entry.annotations=group(translated,target,/^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]日/);
      }else if(entry.level==='stem-section')entry.annotations=group(translated,source.target,/^[甲乙丙丁戊己庚辛壬癸][木火土金水]/);
      else if(entry.level==='pillar')entry.annotations=group(translated,source.target,/^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/);
      else if(entry.level==='chapter')entry.annotations=translated;
      if(!entry.annotations.length)entry.chapterAnnotations=translated;
    }
    entry.blocks=entry.blocks.map(function(p){var t=p.text.replace(/\*\*/g,'');return {text:t,heading:p.heading||t==='原文',kind:/^(?:【徐注】|眉批[：:]|原注[：:]|任氏曰)/.test(t)?'annotation':'original'};});
    return entry;
  }
  function escape(text){return String(text).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function documentText(text,source,dark){
    var entry=extract(text,source),ink=dark?'#e2e8dc':'#233b33',paper=dark?'#18231e':'#f5f1e9',surface=dark?'#202e27':'#fbf8f1',line=dark?'#3b4d40':'#dcded2',accent=dark?'#afd0b4':'#23483b';
    function paragraphs(items){return items.map(function(p){return '<p>'+escape(p.text)+'</p>';}).join('');}
    var commentary=entry.annotations.length?'<section class="translation"><h2>'+escape(entry.annotationLabel||'白话解说')+'</h2>'+paragraphs(entry.annotations)+'</section>':'';
    if(!commentary&&entry.chapterAnnotations.length)commentary='<section class="chapter-translation"><h2>整章白话</h2><p class="notice">本章含其他条目，以下不是当前单条的逐句译文。</p>'+paragraphs(entry.chapterAnnotations)+'</section>';
    var original='<section class="original"><h2>'+(entry.oldAnnotations?'原文与随文旧注':'原文及原注')+'</h2>'+entry.blocks.map(function(p){return '<'+(p.heading?'h3':'p')+(p.kind==='annotation'?' class="annotation"':'')+'>'+escape(p.text)+'</'+(p.heading?'h3':'p')+'>';}).join('')+'</section>';
    var settings='<script>(function(){window.addEventListener("message",function(e){if(e.source!==parent||!e.data||e.data.type!=="classics-reading-preferences")return;var p=e.data;if(["commentary","original","compare"].indexOf(p.mode)>=0)document.body.dataset.mode=p.mode;if([16,18,20,22,24].indexOf(p.font)>=0)document.documentElement.style.fontSize=p.font+"px";});})();<\\/script>'.replace('<\\/script>','</script>');
    return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
      '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; script-src \'unsafe-inline\'">'+
      '<title>'+escape(source.book+' · '+entry.title)+'</title><style>:root{color-scheme:'+(dark?'dark':'light')+';font-size:18px}html,body{margin:0;background:'+paper+';color:'+ink+';font-family:system-ui,sans-serif;line-height:1.95;overflow-wrap:anywhere}main{max-width:44em;margin:auto;padding:18px 18px 30px;box-sizing:border-box}h1{font:600 1.28rem/1.6 serif;margin:0 0 18px;color:'+accent+'}h2{font:600 1rem/1.6 serif;color:'+accent+';margin:0 0 16px;padding-bottom:8px;border-bottom:1px solid '+line+'}h3{font:600 1rem/1.8 serif;margin:18px 0 12px}p{margin:0 0 1.05em;text-align:justify;text-indent:2em}section{margin:0 0 26px}.original{font-family:serif}.annotation{padding:10px 12px;border-left:2px solid '+accent+';background:'+surface+';font-family:system-ui,sans-serif;text-indent:0}.notice{font:14px/1.7 system-ui,sans-serif;text-indent:0;color:'+ink+';opacity:.8}.original{display:none}body[data-mode="original"] .translation,body[data-mode="original"] .chapter-translation,body[data-mode="original"] .chapter-appendix{display:none}body[data-mode="original"] .original,body[data-mode="compare"] .original,body[data-no-commentary="true"] .original{display:block}.book-label{font:12px/1.5 system-ui,sans-serif;letter-spacing:2px;color:'+accent+';margin:0 0 8px;text-indent:0}footer{border-top:1px solid '+line+';padding-top:14px;font:12px/1.7 system-ui,sans-serif}a{color:'+accent+';text-underline-offset:3px}</style></head><body data-mode="commentary" data-no-commentary="'+(!commentary)+'"><main><p class="book-label">'+escape(source.book)+'</p><h1>'+escape(entry.title)+'</h1>'+
      (entry.notice?'<p class="notice">'+escape(entry.notice)+'</p>':'')+commentary+original+
      (entry.annotations.length&&entry.chapterAnnotations.length?'<details class="chapter-appendix"><summary>整章白话（含其他条目）</summary>'+paragraphs(entry.chapterAnnotations)+'</details>':'')+
      (entry.oldAnnotations?'<p class="notice">本底本提供随文旧注，未提供独立现代译文。</p>':'')+
      '<footer>《'+escape(source.book)+'》 · '+(source.mode==='tianyuan'?'天机古籍底本':source.mode==='pairedPillar'?'Libo国学原文与白话译注':'古籍典藏原文与站内白话')+' · <a href="'+escape(source.url)+'" referrerpolicy="no-referrer">查看来源</a></footer></main>'+settings+'</body></html>';
  }
  global.BaziPublicClassics=Object.freeze({resolve:resolve,fetchText:fetchText,extract:extract,documentText:documentText});
})(window);
