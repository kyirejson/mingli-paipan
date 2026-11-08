(function(global){
  'use strict';
  var bank,pending,registered=false;
  function freeze(v){if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.keys(v).forEach(function(k){freeze(v[k]);});Object.freeze(v);}return v;}
  function load(){
    if(bank)return Promise.resolve(bank);if(pending)return pending;
    var controller=global.AbortController?new AbortController():null,timer;
    var request=Promise.resolve().then(function(){return fetch(new URL('static/data/ziwei-reading.json',document.baseURI).href,controller?{signal:controller.signal}:{});}).then(function(r){if(!r.ok)throw Error('Local reading catalog failed');return r.json();});
    pending=Promise.race([request,new Promise(function(resolve,reject){timer=setTimeout(function(){if(controller)controller.abort();reject(Error('Reading catalog timeout'));},15000);})]).then(function(d){bank=freeze(global.WZBZInterpretation.validate(d));return bank;}).finally(function(){clearTimeout(timer);pending=null;});return pending;
  }
  var TABS=[['palace','本宫详解'],['relations','三方夹拱'],['hua','四化飞星'],['patterns','星系格局'],['life','命身运限']];
  function register(Vue){
    if(registered)return;registered=true;
    Vue.component('ZiweiReading',{
      props:{enabled:Boolean,chart:Object,selected:Number,mode:String,flights:Array,flow:Object,flowScope:String,flowDate:String,horoscope:Object},
      data:function(){return {bank:bank||null,status:bank?'ready':'idle',error:'',near:false,tab:'palace',allPalaces:false};},
      computed:{view:function(){return this.bank?global.WZBZInterpretation.analyse(this.bank,this.chart,{selected:this.selected,mode:this.mode,flow:this.flow,flowScope:this.flowScope,flowDate:this.flowDate,horoscope:this.horoscope}):null;},readings:function(){return this.view?this.view.rows:[];}},
      mounted:function(){var self=this;if(global.IntersectionObserver){this._observer=new IntersectionObserver(function(items){self.near=items.some(function(x){return x.isIntersecting;});self.ensure();},{rootMargin:'120px 0px'});this._observer.observe(this.$el);}else{this.near=true;this.ensure();}},
      beforeDestroy:function(){if(this._observer)this._observer.disconnect();},
      watch:{enabled:function(){this.ensure();}},
      methods:{ensure:function(){var self=this;if(!this.enabled||!this.near||this.bank||this.status==='loading'||this.status==='error')return;this.status='loading';this.error='';load().then(function(d){if(!self._isDestroyed){self.bank=d;self.status='ready';}}).catch(function(error){if(global.console)global.console.warn('[ZiweiReading]',error);if(!self._isDestroyed){self.status='error';self.error='本地解读资料未能打开，请重新读取';}});},retry:function(){this.status='idle';this.near=true;this.ensure();},choose:function(i){this.$emit('select',i);}},
      render:function(h){
        var self=this,mode={sanhe:'三合',qintian:'钦天四化',feixing:'飞星'}[this.mode]||'三合';
        var scopeLabel={decadal:'大限',yearly:'流年',monthly:'流月',daily:'流日',hourly:'流时',age:'小限'}[this.flowScope]||'运限';
        var children=[h('header',{class:'zr-header'},[h('div',[h('p',{class:'zr-eyebrow'},['星曜 · 宫位 · 四化 · 会照']),h('h3',['盘面详解'])]),h('span',{class:'zr-mode'},[mode+' · '+(this.flowScope?scopeLabel:'本命')])])];
        if(!this.bank){children.push(h('p',{attrs:{role:this.error?'alert':'status'}},[this.error||'正在读取本地解读…']),this.error?h('button',{class:'zr-retry',attrs:{type:'button'},on:{click:this.retry}},['重新打开']):null);return h('section',{class:'ziwei-reading'},children);}
        if(!this.view){children.push(h('p',{attrs:{role:'alert'}},['命盘宫位或星曜数据异常，暂未生成解读，请重新排盘。']));return h('section',{class:'ziwei-reading'},children);}
        var view=this.view,current=view.current;
        children.push(h('details',{class:'zr-policy'},[h('summary',['阅读取法与出处']),h('p',[view.policy.focus]),h('p',['按实际星位、宫职与命中条件生成。白话为编辑整理；每条可展开核对出处与对应古籍原段，尚未完成全部转述的独立审校。']),view.policy.pending?h('p',{class:'zr-source-note'},['未接入：'+view.policy.pending.join('、')+'。']):null]));
        function sourceNode(refs,contexts,traces){
          traces=(traces||[]).filter(Boolean);var keys=Array.from(new Set(traces.flatMap(function(t){return t.contextKeys;})));
          var originals=(contexts||[]).concat(keys.map(function(k){return self.bank.contexts[k];})).filter(function(c,i,x){return c&&x.findIndex(function(o){return o&&o.id===c.id;})===i;});
          return h('details',{class:'zr-sources'},[h('summary',[originals.length?'出处与原段 · '+originals.length+'段':'出处与取法'])].concat((refs||[]).filter(function(k,i,x){return x.indexOf(k)===i;}).map(function(k){var s=self.bank.sources[k];return s?h('p',{key:k},[h('a',{attrs:{href:s.url,target:'_blank',rel:'noopener noreferrer'}},[s.title])]):null;}),originals.map(function(c){return h('details',{key:c.id,class:'zr-original'},[h('summary',[c.chapter+' · '+c.star]),h('p',[c.text]),h('a',{attrs:{href:self.bank.sources[c.source].url+'#'+encodeURIComponent(c.anchor),target:'_blank',rel:'noopener noreferrer'}},['查看底本章节'])]);}),[]));
        }
        function cardTone(c){
          var head=(c.title||'')+' '+(c.technique||'');
          if(['运限四化','运限叠宫','运限流曜'].includes(c.technique))return 'is-tone-flow';
          if((c.breaking&&c.breaking.length)||/化忌|落陷|煞忌|离心|空劫|羊陀|火铃/.test(head))return 'is-tone-warn';
          if((c.bonus&&c.bonus.length)||/化禄|化科|入庙|居旺|辅弼|昌曲|魁钺|禄马|庆会|明珠|朝垣/.test(head))return 'is-tone-good';
          return 'is-tone-core';
        }
        function splitLead(text,i){
          var dot=i===0?text.indexOf('。'):-1;
          if(dot>0&&dot<text.length-1)return [h('strong',{class:'zr-lead'},[text.slice(0,dot+1)]),text.slice(dot+1)];
          return [i===0?h('strong',{class:'zr-lead'},[text]):text];
        }
        function cardNode(c){return h('article',{key:c.id,class:['zr-card',cardTone(c)],attrs:{'data-reading-id':c.id,'data-technique':c.technique,'data-reading-layer':c.layer}},[h('p',{class:'zr-tag'},[c.technique+(c.variant?' · '+c.variant:'')]),h('h5',[c.title]),c.text.split('\n').map(function(p,i){return h('p',{key:'p'+i},splitLead(p,i));}),c.evidence?h('p',{class:'zr-evidence'},[c.evidence]):null,c.extra?h('p',{class:'zr-extra'},[c.extra]):null,c.overlay?h('p',{class:'zr-overlay'},[c.overlay]):null,c.bonus&&c.bonus.length?h('section',{class:'zr-pattern-factors'},[h('h6',['本盘增强条件']),h('ul',c.bonus.map(function(x){return h('li',[x]);}))]):null,c.breaking&&c.breaking.length?h('section',{class:'zr-pattern-factors is-strained'},[h('h6',['本盘受损条件']),h('ul',c.breaking.map(function(x){return h('li',[x]);})),h('p',['上述支持结构仍在，受损条件同时带来阻力，不能沿用没有煞忌时的完整评价。'])]):null,sourceNode(c.refs,[],c.trace)]);}
        function palaceSummaryNode(r){
          var roleNote=self.bank.palaceNotes[r.name]||'';
          var starHead=r.major.length?'主星'+r.major.map(function(m){var s=r.stars.find(function(x){return x.name===m;});return m+(s&&s.brightness?'（'+s.brightness+'）':'');}).join('、')+'坐守':'本宫无十四主星（借对宫'+(r.opposite&&r.opposite.major.length?r.opposite.major.join('、'):'星曜')+'）';
          var auxList=r.stars.filter(function(s){return !!self.bank.auxiliary[s.name];}).map(function(s){return s.name;});
          var relCards=r.index===current.index?view.relations:global.WZBZInterpretation.relations(self.bank,r);
          var natal=r.natal.map(function(n){return n.title.split('在')[0];}),rels=relCards.slice(0,3).map(function(x){return x.title.split(' · ')[0];});
          return h('div',{class:'zr-palace-summary'},[
            h('strong',['【本宫总括】']),roleNote?roleNote+' ':'',starHead+(auxList.length?'，同宫辅煞：'+auxList.join('、'):'')+'。',
            natal.length?' 生年四化：'+natal.join('、')+'。':'',
            rels.length?' 三方夹拱：'+rels.join('、')+'。':''
          ]);
        }
        function palaceFlowNode(r){
          if(!self.flowScope||!self.flow||!Array.isArray(self.flow.palaceNames))return null;
          var rawFp=self.flow.palaceNames[r.index]||'',fpTitle=rawFp?global.WZBZInterpretation.title(rawFp.replace(/宫$/,'')):scopeLabel;
          var dec=self.horoscope&&self.horoscope.decadal,rawDp=dec&&self.flowScope!=='decadal'&&Array.isArray(dec.palaceNames)?dec.palaceNames[r.index]||'':'',dpTitle=rawDp?'在大限叠「大限'+global.WZBZInterpretation.title(rawDp.replace(/宫$/,''))+'」，':'';
          var direct=view.life.filter(function(c){return c.technique==='运限四化'&&c.index===r.index;}),opp=r.opposite?view.life.filter(function(c){return c.technique==='运限四化'&&c.index===r.opposite.index;}):[];
          var oppJi=opp.filter(function(c){return /化忌$/.test(c.title);}),oppGood=opp.filter(function(c){return !/化忌$/.test(c.title);});
          var fStars=Array.isArray(self.flow.stars)&&Array.isArray(self.flow.stars[r.index])?self.flow.stars[r.index].map(function(s){return s&&s.name;}).filter(Boolean):[];
          var fHint=fStars.length&&global.WZBZInterpretation.flowStarNote?global.WZBZInterpretation.flowStarNote(fStars):'';
          return h('section',{class:'zr-palace-flow'},[
            h('p',{class:'zr-flow-banner'},[
              h('strong',['【当前'+scopeLabel+'叠宫】']),
              '本命'+r.title+'（'+r.ganzhi+'）'+dpTitle+'在所选'+scopeLabel+(self.flowDate?'（'+self.flowDate+'）':'')+'叠作「'+(self.flow.name||scopeLabel)+fpTitle+'」'+
              (direct.length?'，受'+direct.map(function(c){return c.title;}).join('、')+'直接引动：'+direct.map(function(c){return c.text.split('\n').slice(1,3).filter(Boolean).join(' ');}).join(' '):'')+
              (oppJi.length?'；对宫受'+oppJi.map(function(c){return c.title;}).join('、')+'直冲，宜防突发变动与外力冲击':oppGood.length&&!direct.length?'，对宫得'+oppGood.map(function(c){return c.title;}).join('、')+'拱照':'')+
              (!direct.length&&!opp.length?'，本宫无流四化直落，参看原局星系。':'。')+
              (fStars.length?' 流曜同度：'+fStars.join('、')+(fHint?'（'+fHint+'）':'')+'。':'')
            ])
          ]);
        }
        function palaceNode(r){return h('article',{key:r.index,class:'zr-palace',attrs:{'data-palace-index':r.index,'data-palace-name':r.name}},[h('header',{class:'zr-palace-heading'},[h('h4',[r.title]),h('span',[r.ganzhi+(r.body?' · 身宫':'')])]),h('p',{class:'zr-stars'},[r.stars.map(function(s){return s.name+(s.brightness?'（'+s.brightness+'）':'')+(s.mutagen?'化'+s.mutagen:'');}).join('、')||'无十四主星']),palaceSummaryNode(r),palaceFlowNode(r),r.cards.map(cardNode),r.natal.length?h('section',{class:'zr-section'},[h('h4',['本宫生年四化']),r.natal.map(cardNode)]):null,r.major.length===2?h('details',{class:'zr-star-detail'},[h('summary',['分别理解两颗主星'])].concat(r.major.map(function(n){return h('section',{key:n},[h('h6',[n+'在'+r.title]),h('p',[self.bank.profiles[n][r.name]])]);}))):null,r.misc.length?h('details',{class:'zr-star-detail',attrs:{'data-misc-palace':r.name}},[h('summary',['杂曜细读 · '+r.misc.length+'项'])].concat(r.misc.map(cardNode))):null,r.cycles.length?h('details',{class:'zr-star-detail'},[h('summary',['长生与神煞 · '+r.cycles.length+'组']),h('p',{class:'zr-source-note'},['以下为出生盘的辅助层，不替代主星与四化；同名星按所属系统分开。'])].concat(r.cycles.map(function(o){return h('p',{key:o.system},[o.label+'：'+o.star+' · '+o.text]);}),[sourceNode(['cycles'])])):null,sourceNode(['quanshu'],r.contexts)]);}
        children.push(h('p',{class:'zr-layer-note'},[this.flowScope?'当前选中'+scopeLabel+' '+(this.flowDate||'')+'；本宫顶部已同步当前运限叠宫，全盘运限总览见“命身运限”。':'本命解读 · 随盘面实际星位与条件生成。']));
        children.push(h('nav',{class:'zr-tabs',attrs:{'aria-label':'选择解读技法'}},TABS.map(function(t){return h('button',{key:t[0],class:{'is-selected':self.tab===t[0]},attrs:{type:'button','aria-pressed':String(self.tab===t[0])},on:{click:function(){self.tab=t[0];}}},[t[1]]);})),h('nav',{class:'zr-palaces',attrs:{'aria-label':'选择解读宫位'}},view.rows.map(function(r){return h('button',{key:r.index,class:{'is-selected':r.index===current.index},attrs:{type:'button','aria-pressed':String(r.index===current.index)},on:{click:function(){self.choose(r.index);}}},[r.name==='仆役'?'交友':r.name]);})));
        if(this.tab==='palace'){
          children.push(h('div',{class:'zr-section-heading'},[h('h4',[this.allPalaces?'十二宫通览':current.title+' · 星系与修正']),h('button',{class:'zr-text-button',attrs:{type:'button','aria-pressed':String(this.allPalaces)},on:{click:function(){self.allPalaces=!self.allPalaces;}}},[this.allPalaces?'只读本宫':'十二宫通览'])]),(this.allPalaces?view.rows:[current]).map(palaceNode));
        }else if(this.tab==='relations'){
          children.push(h('section',{class:'zr-section'},[h('h4',[current.title+' · 三方四正阵位']),h('div',{class:'zr-related-grid'},[current].concat(current.trines,[current.opposite]).map(function(r){var relation=r===current?'本宫':r===current.opposite?'对宫':'三合';return h('article',{key:r.index,class:'zr-card zr-related',attrs:{'data-related-index':r.index}},[h('button',{class:'zr-related-title',attrs:{type:'button'},on:{click:function(){self.choose(r.index);self.tab='palace';}}},[relation+' · '+r.title+' '+r.ganzhi+' ›']),describeRelated(r)]);})),h('h4',['会照与夹拱判断']),view.relations.length?view.relations.map(cardNode):h('p',{class:'zr-source-note'},['本宫三方四正与邻宫未见成对辅煞、禄马或煞忌交会，主要依上方四正宫星系参看。'])]));
        }else if(this.tab==='hua'){
          children.push(h('section',{class:'zr-section'},[h('h4',['生年四化 · 全盘落点']),view.rows.flatMap(function(r){return r.natal;}).map(cardNode)]));
          if(this.mode!=='sanhe')children.push(h('section',{class:'zr-section'},[h('h4',[current.title+' · 宫干飞化与自化']),view.flights.map(cardNode)]));
        }else if(this.tab==='patterns'){
          children.push(h('section',{class:'zr-section'},[h('h4',['本盘星系与格局']),view.patterns.length?view.patterns.map(cardNode):h('p',['本盘已匹配的星系释义见各宫详解。'])]));
        }else{
          children.push(h('section',{class:'zr-section'},[h('h4',['命身与运限叠读']),view.life.map(cardNode),h('details',{class:'zr-star-detail'},[h('summary',['本命大限分布'])].concat(view.rows.filter(function(r){return r.decadal&&Array.isArray(r.decadal.range);}).slice().sort(function(a,b){return a.decadal.range[0]-b.decadal.range[0];}).map(function(r){return h('p',{key:r.index,class:'zr-decadal'},[r.decadal.range.join('—')+'虚岁 · '+r.title+' '+r.ganzhi+' · '+(r.major.join('、')||'空宫')]);})))]));
        }
        function describeRelated(r){
          var majors=r.major.length?r.major.map(function(m){var s=r.stars.find(function(x){return x.name===m;});return m+(s&&s.brightness?'（'+s.brightness+'）':'')+(s&&s.mutagen?'化'+s.mutagen:'');}).join('、'):'空宫（借'+(r.opposite&&r.opposite.major.length?r.opposite.major.join('、'):'对宫')+'）';
          var aux=r.stars.filter(function(s){return !!self.bank.auxiliary[s.name];}).map(function(s){return s.name+(s.mutagen?'化'+s.mutagen:'');});
          return h('div',{class:'zr-related-meta'},[h('p',{class:'zr-stars'},[majors+(aux.length?' · '+aux.join('、'):'')]),h('p',{class:'zr-related-note'},[self.bank.palaceNotes[r.name]||''])]);
        }
        return h('section',{class:'ziwei-reading',attrs:{'aria-label':'紫微盘面技法解读'}},children);
      }
    });
  }
  global.WZBZReading=Object.freeze({register:register,load:load,validate:function(d){return global.WZBZInterpretation.validate(d);},match:function(d,c){return global.WZBZInterpretation.match(d,c);}});
})(window);
