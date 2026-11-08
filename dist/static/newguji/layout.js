(function(global){
  'use strict';
  var key='wzbz_classics_preferences_v1';
  function preferences(){
    try{var p=JSON.parse(global.localStorage.getItem(key)||'{}');return {mode:['commentary','original','compare'].includes(p.mode)?p.mode:'commentary',font:[16,18,20,22,24].includes(p.font)?p.font:18};}
    catch(_){return {mode:'commentary',font:18};}
  }
  function send(view){
    var f=document.getElementById('bookbox');
    if(f&&f.contentWindow)f.contentWindow.postMessage({type:'classics-reading-preferences',mode:view.readerMode,font:view.readerFont},'*');
  }
  function update(view,mode,font){
    view.readerMode=mode;view.readerFont=Math.max(16,Math.min(24,font));
    try{global.localStorage.setItem(key,JSON.stringify({mode:view.readerMode,font:view.readerFont}));}catch(_){}
    send(view);
  }
  function render(){
    var v=this,h=v.$createElement||v._self._c,books=[];if(typeof document!=='undefined'&&document.documentElement)document.documentElement.setAttribute('data-theme',v.isDark?'dark':'light');
    v.books.forEach(function(group,g){group.forEach(function(book,i){books.push({book:book,g:g,i:i,index:books.length});});});
    var current=books[v.selBookDex]||books[0],height=620;
    try{height=Math.max(380,Math.min(700,global.parent.innerHeight-180));}catch(_){}
    function btn(label,click,attrs,active){return h('button',{class:{'is-active':!!active},attrs:Object.assign({type:'button'},attrs),on:{click:click}},[label]);}
    return h('section',{staticClass:'classics-reader',style:{height:height+'px'}},[
      h('header',{staticClass:'classics-controls'},[
        h('div',{staticClass:'classics-book-row'},[
          h('span',{staticClass:'classics-seal'},['典']),
          h('label',{staticClass:'classics-select-label'},[h('span',['选书']),h('select',{attrs:{'aria-label':'选择古籍'},domProps:{value:String(v.selBookDex)},on:{change:function(e){var b=books[Number(e.target.value)];if(b)v.onClickBook(b.book,b.g,b.i,b.index);}}},books.map(function(b){return h('option',{domProps:{value:String(b.index),selected:b.index===v.selBookDex}},[b.book.name]);}))]),
          h('span',{staticClass:'classics-book-count'},[(v.selBookDex+1)+' / '+books.length])
        ]),
        v.isGeJu?h('div',{staticClass:'classics-context'},[h('span',[v.gjData.isCusGeJu?'自定义格局':'格局参考']),h('button',{staticClass:'geju-text',attrs:{type:'button'},on:{click:v.setGeJu}},[(v.gjData.geju||'未设置格局')+' ›'])]):null,
        v.isTHYS?h('details',{staticClass:'classics-context'},[h('summary',['调候用神：'+v.thysStr]),h('p',['透：'+v.thysTouArr.filter(Boolean).join('、')+'　藏：'+v.thysCangArr.filter(Boolean).join('、')]),btn('调候提示',v.onTSYSTip)]):null,
        h('label',{staticClass:'classics-chapter'},[h('span',['篇目']),h('select',{attrs:{'aria-label':'选择古籍篇目',disabled:!v.tabs.length},domProps:{value:String(v.tabsDex)},on:{change:function(e){v.onTab(Number(e.target.value));}}},v.tabs.length?v.tabs.map(function(t,i){return h('option',{domProps:{value:String(i),selected:i===v.tabsDex}},[t.value]);}):[h('option',['暂无匹配篇目'])])]),
        h('nav',{staticClass:'classics-toolbar',attrs:{'aria-label':'阅读设置'}},[
          h('div',{staticClass:'classics-modes'},[['commentary','解说'],['original','原文'],['compare','对照']].map(function(p){return btn(p[1],function(){update(v,p[0],v.readerFont);},{'aria-pressed':String(v.readerMode===p[0])},v.readerMode===p[0]);})),
          h('div',{staticClass:'classics-font'},[btn('A−',function(){update(v,v.readerMode,v.readerFont-2);},{'aria-label':'缩小字号',disabled:v.readerFont<=16}),h('span',[String(v.readerFont)]),btn('A+',function(){update(v,v.readerMode,v.readerFont+2);},{'aria-label':'放大字号',disabled:v.readerFont>=24})])
        ])
      ]),
      v.matchNotice?h('p',{staticClass:'guji-notice',attrs:{role:'status'}},[v.matchNotice]):null,
      v.loadingBook?h('p',{staticClass:'guji-notice',attrs:{role:'status'}},['正在加载古籍…']):null,
      v.readError?h('div',{staticClass:'guji-load-error',attrs:{role:'alert'}},[h('p',[v.readError]),btn('重新加载',function(){v.initData();})]):null,
      h('iframe',{key:v.bookSrc,staticClass:'classics-document',attrs:{id:'bookbox',title:(current?current.book.name:'古籍')+'正文',sandbox:'allow-scripts',referrerpolicy:'no-referrer',src:v.bookSrc||'about:blank',scrolling:'yes'},style:{visibility:v.showBookBox?'visible':'hidden'},on:{load:function(){send(v);}}})
    ]);
  }
  global.BaziClassicsLayout=Object.freeze({render:render,preferences:preferences,send:send});
})(window);
