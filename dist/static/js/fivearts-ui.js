(function(global) {
  "use strict";
  var E = global.FiveArtsEngine, V, ui, modal, seed = 0, sessions = /* @__PURE__ */ new Map(), readingData, readingPromise;
  var TYPES = ["bazi", "ziwei", "qimen", "liuyao", "meihua"], NAMES = { bazi: "八字", ziwei: "紫微", qimen: "奇门", liuyao: "六爻", meihua: "梅花" };
  var KEYS = { preferences: "wzbz_fivearts_preferences_v1", records: "wzbz_fivearts_record_data_v1" };
  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }
  function read(key, fallback) {
    try {
      var v = JSON.parse(localStorage.getItem(key));
      return v && typeof v === "object" ? v : clone(fallback);
    } catch (_) {
      return clone(fallback);
    }
  }
  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) {
      if (ui) ui.message = "本机存储空间不足，设置尚未保存。";
      return false;
    }
  }
  function prefs(value) {
    value = value || {};
    var order = Array.isArray(value.order) ? value.order.filter(function(x, i, a) {
      return TYPES.includes(x) && a.indexOf(x) === i;
    }) : [];
    TYPES.forEach(function(x) {
      if (!order.includes(x)) order.push(x);
    });
    return { version: 1, defaultChart: TYPES.includes(value.defaultChart) ? value.defaultChart : "bazi", order };
  }
  function defaults() {
    return { qimen: clone(E.DEFAULTS), liuyao: { method: "time", numberMode: "three", numbers: ["", "", ""], coins: ["", "", "", "", "", ""], upper: 1, lower: 1, moving: [] }, meihua: { method: "time", numberMode: "three", numbers: ["", "", ""], upper: 1, lower: 1, moving: [1], phone: "", text: "", randomNumbers: null } };
  }
  function validOptions(value) {
    var d = defaults();
    ["qimen", "liuyao", "meihua"].forEach(function(k) {
      if (value && value[k] && typeof value[k] === "object") Object.assign(d[k], value[k]);
    });
    return d;
  }
  function notify(text) {
    ui.message = text;
    clearTimeout(notify.timer);
    notify.timer = setTimeout(function() {
      if (ui) ui.message = "";
    }, 3e3);
  }
  function now() {
    return global.WZBZHomeClock.nowMinute(/* @__PURE__ */ new Date());
  }
  function icon(h, name) {
    return global.PaperForest.icon(h, name);
  }
  function button(h, text, fn, cls, disabled) {
    return h("button", { class: cls || "fa-button", attrs: { type: "button", disabled: !!disabled }, on: { click: fn } }, Array.isArray(text) ? text : [text]);
  }
  function heading(h, text) {
    return h("h3", { class: "fa-section-title" }, [text]);
  }
  function choices(h, list, value, onChange, cls) {
    return h("div", { class: ["fa-choices", cls] }, list.map(function(p) {
      var k = Array.isArray(p) ? p[0] : p, label = Array.isArray(p) ? p[1] : p;
      return button(h, label, function() {
        onChange(k);
      }, ["fa-choice", { "is-selected": value === k }]);
    }));
  }
  function field(h, label, value, onInput, type, extra) {
    return h("label", { class: "fa-input-row" }, [h("span", [label]), h("input", { attrs: Object.assign({ type: type || "text", placeholder: "请填写", inputmode: type === "number" ? "numeric" : void 0 }, extra || {}), domProps: { value: value == null ? "" : value }, on: { input: function(e) {
      onInput(e.target.value);
    } } })]);
  }
  function dateField(h, label, value, onInput) {
    return h("div", { class: "fa-date-field" }, [field(h, label, String(value || "").replace(" ", "T"), function(v) {
      onInput(v.replace("T", " "));
    }, "datetime-local", { min: "1800-01-01T00:00", max: "2199-12-31T23:59" }), button(h, [icon(h, "clock"), "当前"], function() {
      onInput(now());
    }, "fa-now")]);
  }
  function ruleSwitch(h, label, value, fn, desc) {
    return h("div", { class: "fa-rule-row" }, [h("div", [h("span", [label]), desc ? h("small", [desc]) : null]), h("button", { class: ["pf-switch", { "is-on": !!value }], attrs: { type: "button", role: "switch", "aria-checked": String(!!value), "aria-label": label }, on: { click: function() {
      fn(!value);
    } } }, [h("span")])]);
  }
  function install(owner) {
    if (V) return;
    V = owner.constructor;
    while (V.super) V = V.super;
    ui = V.observable({ preferences: prefs(read(KEYS.preferences, {})), popup: "", scope: "", editor: null, error: "", message: "", baseTime: "", flow: 0, pending: null, drag: -1, readingStatus:'idle' });
    registerHost();
    modal = new V({ data: function() {
      return { state: ui };
    }, render: renderModal });
    modal.$mount();
    document.body.appendChild(modal.$el);
    var oldBack = global.__WZBZ_HANDLE_HARDWARE_BACK__;
    global.__WZBZ_HANDLE_HARDWARE_BACK__ = function() {
      if (ui.popup) {
        closeModal();
        return true;
      }
      var assistantBack = document.querySelector('.za-assistant .za-back');
      if (assistantBack) { assistantBack.click(); return true; }
      return oldBack ? oldBack() : false;
    };
  }
  function open(owner, type, session) {
    install(owner);
    ui.error = "";
    ui.scope = session || "";
    ui.baseTime = session ? session.baseTime : owner.infoData && (owner.infoData.birthday || owner.infoData.solarTime) || now();
    ui.editor = type === "preferences" ? clone(ui.preferences) : null;
    ui.popup = type;
  }
  function closeModal() {
    ui.popup = "";
    ui.editor = null;
    ui.error = "";
    ui.scope = "";
    ui.drag = -1;
  }
  function editMethod(owner, type, session) {
    open(owner, type, session);
    ui.editor = clone(session.modules[type]);
    if (!ui.editor.time) ui.editor.time = ui.baseTime;
  }
  function applyMethod() {
    var kind = ui.popup, draft = clone(ui.editor);
    try {
      E.parseTime(draft.time);
      if (kind === "qimen") E.qimen(draft.time, draft);
      else E[kind](draft.time, draft);
      var candidate = clone(ui.scope);
      candidate.modules[kind] = draft;
      if (!saveSession(candidate)) throw Error('保存失败，设置尚未应用；请处理存储问题后重试。');
      V.set(ui.scope.modules, kind, draft);
      ui.scope.revision++;
      ui.error = "";
      closeModal();
      notify("已应用" + NAMES[kind] + "起局设置");
    } catch (error) {
      ui.error = error.message || "参数不完整，请检查";
    }
  }
  function methodLabel(type, options) {
    if (type === "qimen") return (E.METHODS.find(function(x) {
      return x[0] === options.qiJuType;
    }) || ["", ""])[1] + (E.PLATES.find(function(x) {
      return x[0] === options.qiPanType;
    }) || ["", ""])[1];
    return { time: "时间起卦", coins: "铜钱录入", specified: "指定卦爻", single: "单数起卦", numbers: options.numberMode === "two" ? "双数起卦" : "三数起卦", text: "汉字笔画", number: "号码起卦", lifetime: "终身起卦", random: "随机起卦" }[options.method] || "时间起卦";
  }
  async function startForm(owner) {
    install(owner);
    if(owner.isConfirmingDatetime || owner._submittingChart)return;
    owner.switchSave = true;
    ui.flow++;
    ui.pending = { token: "flow-" + Date.now() + "-" + ++seed, modules: defaults(), created: Date.now() };
    try {
      return await owner.toPaiPan();
    } catch (error) {
      ui.pending = null;
      throw error;
    }
  }
  function preferenceEntry(h, owner) {
    install(owner);
    return button(h, [icon(h, "grid"), h("span", [h("strong", ["排盘偏好"]), h("small", ["默认打开" + NAMES[ui.preferences.defaultChart] + " · 拖动调整五盘顺序"])]), icon(h, "next")], function() {
      open(owner, "preferences");
    }, "fa-preference-entry");
  }
  function timeLabel(type) {
    return type === "qimen" ? "起局时间" : "起卦时间";
  }
  function loadReadings() {
    if(readingData){ui.readingStatus='ready';return Promise.resolve(readingData);}
    if(readingPromise)return readingPromise;
    ui.readingStatus='loading';
    readingPromise=new Promise(function(resolve,reject){
      var script=document.createElement('script');
      script.src=new URL('static/js/fivearts-readings.js',document.baseURI).href;
      script.onload=function(){
        var data=global.FiveArtsReadingsData;
        if(!data||data.version!==1||Object.keys(data.hexagrams||{}).length!==64){script.remove();reject(Error('解卦资料不完整，请重试'));return;}
        readingData=data;resolve(data);
      };
      script.onerror=function(){script.remove();reject(Error('解卦资料加载失败，请重试'));};
      document.head.appendChild(script);
    }).then(function(data){ui.readingStatus='ready';return data;},function(error){readingPromise=null;ui.readingStatus='error';ui.error=error.message;throw error;});
    return readingPromise;
  }
  function openGua(owner,session,gua,position,moving,line,context) {
    open(owner,'reading',session);
    ui.editor={kind:'gua',value:gua.value,position:position,moving:moving||0,line:line||moving||1,tab:line?'lines':'meaning',limit:60,context:context||''};
    loadReadings().catch(function(){});
  }
  function openClassic(owner,session,id,result,yongIndex) {
    V.set(session,'liuyaoReference',id);saveSession(session);
    open(owner,'reading',session);
    var row=result.rows[yongIndex-1];
    ui.editor={kind:'book',book:id,chapter:0,query:'',limit:60,context:result.main.name+' → '+result.changed.name+' · '+result.main.palace.trigram+'宫',term:row.role,detail:'当前用神：'+row.index+'爻 '+row.role+row.ganzhi+row.element+'；'+(row.moving?'动爻':'静爻')+'，'+row.season+(row.void?'，日空':'')};
    loadReadings().catch(function(){});
  }
  function sourceLink(h,label,url){return h('a',{attrs:{href:url,target:'_blank',rel:'noopener noreferrer'}},[label]);}
  function readingParagraphs(h,paragraphs,limit){return paragraphs.slice(0,limit).map(function(text,i){return h('p',{key:i},[text]);});}
  function renderReading(h) {
    var d=ui.editor;
    if(ui.readingStatus==='error')return[h('p',{class:'fa-error'},[ui.error]),button(h,'重新加载',function(){ui.error='';loadReadings().catch(function(){});},'fa-primary')];
    if(!readingData||ui.readingStatus==='loading')return[h('p',{class:'fa-loading'},['正在打开离线资料…'])];
    if(d.kind==='book'){
      var book=readingData.books[d.book],query=d.query.trim(),sections=book.sections;
      var matches=query?sections.flatMap(function(s){return s.paragraphs.filter(function(p){return p.includes(query);}).map(function(p){return{chapter:s.title,text:p};});}):[];
      var chapter=sections[d.chapter]||sections[0],paragraphs=query?matches.map(function(m){return m.chapter+' · '+m.text;}):chapter.paragraphs;
      return[h('div',{class:'fa-reading-context'},[h('strong',[d.context]),h('small',[d.detail])]),
        choices(h,[['huozhulin','火珠林'],['haidiyan','海底眼'],['huangjince','黄金策']],d.book,function(id){d.book=id;d.chapter=0;d.query='';d.limit=60;V.set(ui.scope,'liuyaoReference',id);saveSession(ui.scope);}),
        h('p',{class:'fa-caption'},[book.edition]),h('label',{class:'fa-input-row'},[h('span',['章节']),h('select',{domProps:{value:d.chapter},on:{change:function(e){d.chapter=Number(e.target.value);d.query='';d.limit=60;}}},sections.map(function(s,i){return h('option',{attrs:{value:i}},[(i+1)+' · '+s.title]);}))]),
        h('div',{class:'fa-reading-search'},[h('input',{attrs:{type:'search',placeholder:'在本书中搜索'},domProps:{value:d.query},on:{input:function(e){d.query=e.target.value;d.limit=60;}}}),button(h,'搜用神',function(){d.query=d.term;d.limit=60;},'fa-small-button')]),
        h('div',{class:'fa-reading-prose'},[heading(h,query?'找到 '+matches.length+' 段':chapter.title)].concat(readingParagraphs(h,paragraphs,d.limit))),
        query&&!paragraphs.length?h('p',{class:'fa-caption'},['本书没有匹配段落，可以切换关键词或按章节阅读。']):null,
        paragraphs.length>d.limit?button(h,'继续显示（余 '+(paragraphs.length-d.limit)+' 段）',function(){d.limit+=100;},'fa-button fa-load-more'):null,
        h('p',{class:'fa-reading-source'},[typeof book.source==='string'&&book.source.startsWith('https:')?sourceLink(h,'原文出处',book.source):book.source]),
        h('p',{class:'fa-caption'},['典籍条文供对照查阅；上方用神和旺衰取自本盘。'])];
    }
    var g=readingData.hexagrams[String(d.value)],hex=E.hexagram(d.value),selected=g.lines[d.line-1];
    var relative=[1,2,3,4,5,6].map(function(n){return guaLineStructure(hex,n);});
    return[h('div',{class:'fa-reading-intro'},[h('span',{class:'fa-reading-kicker'},[d.position+' · 第'+g.number+'卦 · '+g.upper+'上'+g.lower+'下']),h('h3',[g.name]),d.context?h('p',{class:'fa-caption'},[d.context]):null]),
      choices(h,[['meaning','卦意白话'],['lines','六爻详解'],['canonical','经传原文']],d.tab,function(tab){d.tab=tab;d.limit=60;}),
      d.tab==='meaning'?h('div',{class:'fa-reading-prose'},[heading(h,'卦辞'),h('blockquote',[g.judgment]),heading(h,'现代白话'),h('p',[g.plain]),heading(h,'大象'),h('blockquote',[g.image]),d.moving?h('section',{class:'fa-current-line'},[h('strong',['当前动爻 · '+g.lines[d.moving-1].label]),h('p',[g.lines[d.moving-1].original]),h('p',[g.lines[d.moving-1].plain]),button(h,'查看动爻详细说明',function(){d.tab='lines';d.line=d.moving;},'fa-small-button')]):null]):null,
      d.tab==='lines'?h('div',[h('div',{class:'fa-reading-lines'},g.lines.map(function(l){return button(h,[l.label,l.index===d.moving?h('small',['动']):null],function(){d.line=l.index;},['fa-choice',{'is-selected':d.line===l.index}]);})),h('article',{class:'fa-reading-prose'},[heading(h,selected.label+(d.line===d.moving?' · 当前动爻':'')),h('blockquote',[selected.original]),heading(h,'现代白话'),h('p',[selected.plain]),heading(h,'爻位与变化'),h('p',[relative[d.line-1]]),h('p',{class:'fa-caption'},['当位、相应等描述用于理解爻位结构，应结合全卦与实际问题阅读。'])])]):null,
      d.tab==='canonical'?h('article',{class:'fa-reading-prose'},readingParagraphs(h,g.canonical,d.limit).concat(g.canonical.length>d.limit?[button(h,'继续阅读经传',function(){d.limit+=100;},'fa-button fa-load-more')]:[])):null,
      h('details',{class:'fa-reading-sources'},[h('summary',['资料出处与更多解说']),h('p',[sourceLink(h,'易安居 · '+g.name+'详细解说',g.reference)]),h('p',[sourceLink(h,'白话资料来源（MIT）',readingData.sources.modern.source)]),h('p',['经传原文：随包《易经》对应卦章。'])])];
  }
  function openPalaceReading(host, result, mode, flow, horoscope, yearBase, birthYear, birthBranch, selected) {
    var chart=result.chart;
    open(host.owner,'palace',host.session);
    ui.editor={selected:selected,mode:{sanhe:'三合',qintian:'钦天·四化',feixing:'飞星'}[mode],palaces:chart.palaces.map(function(p,index){
      var year=yearBase+(E.ZHI.indexOf(p.earthlyBranch)-(yearBase-4)%12+12)%12;
      var annualAge=(E.ZHI.indexOf(p.earthlyBranch)-birthBranch+12)%12+1;
      return {name:p.name==='仆役'?'交友':p.name,ganzhi:p.heavenlyStem+p.earthlyBranch,
        stars:getCachedPalaceStars(chart,p,mode,flow,index).map(function(star){
          var mut=flow?flow.mutagen.indexOf(star.name):-1;
          return {name:star.name,brightness:star.brightness||'',mutagen:star.mutagen||'',flowMutagen:mut<0?'':'流'+'禄权科忌'[mut]};
        }),
        rows:[['宫位标记',[p.isBodyPalace?'身宫':'',p.isOriginalPalace?'来因宫':''].filter(Boolean).join(' · ')||'—'],
          ['大限',p.decadal.range.join('～')+'岁'+(horoscope?' · 大限'+horoscope.decadal.palaceNames[index]:'')],
          ['流年',mode==='sanhe'?[0,1,2,3,4].map(function(i){return annualAge+i*12+'岁';}).join('、'):year+'年 · '+(year-birthYear+1)+'虚岁'],
          ['小限',p.ages.slice(0,5).map(function(age){return age+'岁';}).join('、')],
          ['十二长生',p.changsheng12||'—'],['博士十二神',p.boshi12||'—'],['将前十二神',p.jiangqian12||'—'],['岁前十二神',p.suiqian12||'—']]
          .concat(flow?[[flow.name,flow.palaceNames[index]]]:[])
          .concat([['本宫四化',getCachedTransformations(chart,index).map(function(f){return f.star+'化'+('禄权科忌'['ABCD'.indexOf(f.code)]||f.code)+' → '+chart.palaces[f.target].name;}).join('；')||'—']])};
    })};
  }
  function renderPalaceReading(h,d) {
    var palace=d.palaces[d.selected];
    return [h('div',{class:'fa-palace-reading'},[
      choices(h,d.palaces.map(function(p,i){return [i,p.name];}),d.selected,function(index){d.selected=index;}),
      h('h3',[palace.name+' · '+palace.ganzhi+' · '+d.mode]),
      h('div',{class:'fa-palace-reading-stars'},palace.stars.length?palace.stars.map(function(star){return h('span',[star.name,h('small',[[star.brightness,star.mutagen?'生年化'+star.mutagen:'',star.flowMutagen].filter(Boolean).join(' · ')])]);}):[h('span',['本宫无所选盘式星曜'])]),
      h('dl',palace.rows.map(function(row){return h('div',[h('dt',[row[0]]),h('dd',[row[1]])]);}))
    ])];
  }
  function modalContents(h) {
    var kind = ui.popup, d = ui.editor;
    if(kind==='reading')return renderReading(h);
    if(kind==='palace')return renderPalaceReading(h,d);
    if (kind === "preferences") return [
      heading(h, "默认打开"),
      h("div", { class: "fa-default-list" }, ui.editor.order.map(function(type) {
        return button(h, [h("span", { class: ["fa-radio", { "is-selected": ui.editor.defaultChart === type }] }), NAMES[type]], function() {
          ui.editor.defaultChart = type;
        }, "fa-radio-row");
      })),
      h("p", { class: "fa-caption" }, ["进入结果时先显示所选盘，顺序可独立设置。"]),
      heading(h, "页面顺序"),
      h("p", { class: "fa-caption" }, ["拖动右侧手柄，或使用上下按钮调整。"]),
      h("div", { class: "fa-sort-list" }, ui.editor.order.map(function(type, i2) {
        return h("div", { class: "fa-sort-row", key: type, attrs: { "data-sort-index": i2 }, on: { dragover: function(e) {
          e.preventDefault();
        }, drop: function(e) {
          e.preventDefault();
          moveOrder(ui.drag, i2);
          ui.drag = -1;
        } } }, [h("span", { class: "fa-order-number" }, [String(i2 + 1)]), h("strong", [NAMES[type]]), button(h, "↑", function() {
          moveOrder(i2, i2 - 1);
        }, "fa-sort-arrow", i2 === 0), button(h, "↓", function() {
          moveOrder(i2, i2 + 1);
        }, "fa-sort-arrow", i2 === 4), h("button", { class: "fa-drag", attrs: { type: "button", draggable: true, "aria-label": "拖动" + NAMES[type] }, on: { dragstart: function() {
          ui.drag = i2;
        }, pointerdown: function(e) {
          ui.drag = i2;
          e.currentTarget.setPointerCapture(e.pointerId);
        }, pointermove: function(e) {
          if (ui.drag < 0 || !e.buttons) return;
          var row = document.elementFromPoint(e.clientX, e.clientY);
          row = row && row.closest("[data-sort-index]");
          if (row) {
            var to = Number(row.dataset.sortIndex);
            moveOrder(ui.drag, to);
            ui.drag = to;
          }
        }, pointerup: function() {
          ui.drag = -1;
        }, pointercancel: function() {
          ui.drag = -1;
        } } }, ["☰"])]);
      })),
      button(h, "保存偏好", function() {
        var next = prefs(ui.editor);
        if (write(KEYS.preferences, next)) {
          ui.preferences = next;
          closeModal();
          notify("排盘偏好已保存");
        }
      }, "fa-primary")
    ];
    if (!d) return [];
    var out = [dateField(h, timeLabel(kind), d.time, function(value) {
      d.time = value;
      ui.error = "";
    })];
    if (kind === "qimen") {
      out.push(heading(h, "起局方式"), choices(h, E.METHODS, d.qiJuType, function(v) {
        d.qiJuType = v;
        ui.error = "";
      }, "fa-three-cols"), heading(h, "排盘方式"), choices(h, E.PLATES, d.qiPanType, function(v) {
        d.qiPanType = v;
      }, "fa-three-cols"));
      if (d.qiJuType === "ZHIRUN") out.push(heading(h, "置闰阈值"), choices(h, [[8, "8天"], [9, "9天"]], Number(d.zhiRunTianShu), function(v) {
        d.zhiRunTianShu = v;
      }));
      out.push(h("details", { class: "fa-advanced" }, [h("summary", ["高级规则"]), ruleSwitch(h, "区分早晚子时", d.useZaoWanZiShi, function(v) {
        d.useZaoWanZiShi = v;
      }), heading(h, "中五寄宫"), choices(h, [["JIGONG2GONG", "固定寄坤二"], ["YANG8YIN2", "阳八阴二"]], d.jiGongType, function(v) {
        d.jiGongType = v;
      }), heading(h, "空亡与驿马"), choices(h, [["SHI", d.qiJuType.startsWith("KEJIA") ? "刻空刻马" : "时空时马"], ["RI", "日空日马"]], d.maKongType, function(v) {
        d.maKongType = v;
      }), heading(h, "暗干排法"), choices(h, [["AUTO", "随局式"], ["FEIBU", "飞布"], ["ZHUANBU", "转布"], ["FEIPANGANZHI", "飞盘干支"]], d.anGanPaiFa, function(v) {
        d.anGanPaiFa = v;
      }, "fa-two-cols"), d.qiPanType !== "ZHUANPAN" ? ruleSwitch(h, "使用中门", d.feiPanUseZhongMen, function(v) {
        d.feiPanUseZhongMen = v;
      }) : null, d.qiPanType === "FEIPAN" ? ruleSwitch(h, "甲时值符照仪", d.feiPanZhiFuZhaoYi, function(v) {
        d.feiPanZhiFuZhaoYi = v;
      }) : null, d.qiPanType === "KUONANG" ? ruleSwitch(h, "括囊天盘干自飞", d.kuoNangTianPanGanZiFei, function(v) {
        d.kuoNangTianPanGanZiFei = v;
      }) : null]), h("p", { class: "fa-caption" }, ["方式、盘式及默认规则对齐从真奇门。只调整本盘。"]));
    } else {
      var methods = kind === "liuyao" ? [["time", "时间起卦"], ["coins", "铜钱录入"], ["specified", "指定卦爻"], ["single", "单数起卦"], ["numbers", "报数起卦"]] : [["time", "时间"], ["numbers", "报数"], ["text", "汉字"], ["number", "号码"], ["lifetime", "终身"], ["single", "单数"], ["specified", "指定"], ["random", "随机"]];
      out.push(heading(h, "起卦方式"), choices(h, methods, d.method, function(v) {
        d.method = v;
        ui.error = "";
        if (v === "random" && !d.randomNumbers) d.randomNumbers = E.drawRandom();
      }, kind === "meihua" ? "fa-four-cols" : "fa-two-cols"));
      if (d.method === "time") out.push(h("p", { class: "fa-caption" }, ["按所选时间的农历年月日时起卦。"]));
      if (d.method === "coins") out.push(heading(h, "录入六次铜钱结果"), h("p", { class: "fa-caption" }, ["从初爻至上爻依次录入，保留实际铜钱结果。"]), h("div", { class: "fa-coin-list" }, ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"].map(function(label, i2) {
        return h("label", [h("span", [label]), h("select", { domProps: { value: d.coins[i2] }, on: { change: function(e) {
          V.set(d.coins, i2, e.target.value === "" ? "" : Number(e.target.value));
        } } }, [["", "未录入"], [6, "6 · 老阴 ×"], [7, "7 · 少阳"], [8, "8 · 少阴"], [9, "9 · 老阳 ○"]].map(function(pair) {
          return h("option", { attrs: { value: pair[0] } }, [pair[1]]);
        }))]);
      })));
      if (d.method === "numbers") {
        out.push(heading(h, "报数方式"), choices(h, [["two", "双数"], ["three", "三数"]], d.numberMode, function(v) {
          d.numberMode = v;
        }));
        out.push(h("p", { class: "fa-caption" }, [d.numberMode === "three" ? "前两数分别取上卦和下卦，第三数取动爻。" : "两数分别取上卦和下卦，两数之和" + (d.addHour ? "加时辰数" : "") + "取动爻。"]));
        for (var i = 0; i < (d.numberMode === "three" ? 3 : 2); i++) (function(index) {
          out.push(field(h, ["上卦数", "下卦数", "动爻数"][index], d.numbers[index], function(v) {
            V.set(d.numbers, index, v);
          }, "number", { min: 0, max: 999999999999 }));
        })(i);
        if (d.numberMode === "two") out.push(ruleSwitch(h, "动爻加时辰数", d.addHour, function(v) {
          V.set(d, "addHour", v);
        }, "关闭时以两数之和取动爻"));
      }
      if (d.method === "single") out.push(h("p", { class: "fa-caption" }, ["起卦数取上卦，加时辰数取下卦及动爻。"]),field(h, "起卦数", d.numbers[0], function(v) {
        V.set(d.numbers, 0, v);
      }, "number", { min: 0, max: 999999999999 }));
      if (d.method === "text") out.push(field(h, "汉字（2至4字）", d.text, function(v) {
        d.text = v;
      }, "text", { maxlength: 4 }), h("p", { class: "fa-caption" }, ["按字数前后分组，以简体笔画和取上下卦，总笔画取动爻。字典未收录的字需更换。"]));
      if (d.method === "number") out.push(field(h, "11位号码", d.phone, function(v) {
        d.phone = v;
      }, "tel", { maxlength: 11, autocomplete: "off" }),h("p", { class: "fa-caption" }, ["前五位和后六位的数字和分别取上下卦，全部数字之和取动爻。"]));
      if (d.method === "lifetime") out.push(h("p", { class: "fa-caption" }, ["以上方出生时间的年干、农历月日及时辰起卦。"]));
      if (d.method === "specified") {
        ["upper", "lower"].forEach(function(k, i2) {
          out.push(h("label", { class: "fa-input-row" }, [h("span", [i2 ? "下卦" : "上卦"]), h("select", { domProps: { value: d[k] }, on: { change: function(e) {
            d[k] = Number(e.target.value);
          } } }, E.TRIGRAMS.map(function(t, j) {
            return h("option", { attrs: { value: j + 1 } }, [j + 1 + " " + t.name]);
          }))]));
        });
        out.push(heading(h, kind === "meihua" ? "动爻（单选）" : "动爻（可多选，也可静卦）"), h("div", { class: "fa-choices fa-three-cols" }, [1, 2, 3, 4, 5, 6].map(function(n) {
          return button(h, n === 1 ? "初爻" : n === 6 ? "上爻" : n + "爻", function() {
            d.moving = kind === "meihua" ? [n] : d.moving.includes(n) ? d.moving.filter(function(v) {
              return v !== n;
            }) : d.moving.concat(n);
          }, ["fa-choice", { "is-selected": d.moving.includes(n) }]);
        })));
      }
      if (d.method === "random") out.push(h("p", { class: "fa-random-values" }, [(d.randomNumbers || []).join(" · ")]), button(h, "重新随机", function() {
        d.randomNumbers = E.drawRandom();
      }, "fa-button"), h("p", { class: "fa-caption" }, ["随机结果随卦保存，切换页面不会重新随机。"]));
    }
    out.push(ui.error ? h("p", { class: "fa-error", attrs: { role: "alert" } }, [ui.error]) : null, button(h, kind === "qimen" ? "应用并重排奇门" : "应用并重新起卦", applyMethod, "fa-primary"));
    return out;
  }
  function moveOrder(from, to) {
    if (from < 0 || to < 0 || from > 4 || to > 4 || from === to) return;
    var order = ui.editor.order.slice(), item = order.splice(from, 1)[0];
    order.splice(to, 0, item);
    ui.editor.order = order;
  }
  function renderModal(h) {
    var kind = ui.popup, title = { palace: "宫位详读", preferences: "排盘偏好", qimen: "奇门起局设置", liuyao: "六爻起卦方式", meihua: "梅花起卦方式" }[kind];
    if(kind==='reading')title=ui.editor.kind==='gua'?ui.editor.position+' · '+E.hexagram(ui.editor.value).name:{huozhulin:'火珠林',haidiyan:'海底眼',huangjince:'黄金策'}[ui.editor.book];
    return h("div", { class: "fa-portals" }, [kind ? h("div", { class: "fa-modal-overlay", attrs: { role: "presentation" }, on: { click: function(e) {
      if (e.target === e.currentTarget) closeModal();
    } } }, [h("section", { class: ["fa-modal", { "fa-preferences-modal": kind === "preferences",'fa-reading-modal':kind==='reading'||kind==='palace' }], attrs: { role: "dialog", "aria-modal": "true", "aria-label": title } }, [h("header", { class: "fa-modal-header" }, [h("h2", [title]), h("button",{class:"fa-icon-button",attrs:{type:"button","aria-label":"关闭"},on:{click:closeModal}},[icon(h,"close")])]), h("div", { class: "fa-modal-content" }, modalContents(h))])]) : null, ui.message ? h("div", { class: "fa-toast", attrs: { role: "status" } }, [ui.message]) : null]);
  }
  function saveSession(session) {
    try { if(global.PaperForestDetails) global.PaperForestDetails.migrateNotes(); } catch(error) { notify(error.message); return false; }
    var records = read(KEYS.records, {});
    if (!session.guid) return write(KEYS.records, Object.assign(records, { "@last": { baseTime: session.baseTime, modules: clone(session.modules), ziweiMode: session.ziweiMode,liuyaoReference:session.liuyaoReference } }));
    records[session.guid] = { version: 1, baseTime: session.baseTime, modules: clone(session.modules), ziweiMode: session.ziweiMode,liuyaoReference:session.liuyaoReference };
    return write(KEYS.records, records);
  }
  function findVue(root, predicate) {
    if (predicate(root)) return root;
    for (var child of root.$children || []) {
      var found = findVue(child, predicate);
      if (found) return found;
    }
    return null;
  }
  function goNav(owner, index) {
    var paths = ["/main/wznavigation/wzindex", "/main/wznavigation/wzuserlist", "/main/wznavigation/wzbook", "/main/wznavigation/wzmy"];
    var targetPath = paths[index];
    if (owner.$store) {
      try {
        owner.$store.dispatch("setnavigatorindex", index);
      } catch (e) {}
    }
    if (owner.$router && owner.$route && owner.$route.path !== targetPath) {
      owner.$router.replace(targetPath).catch(function() {});
    }
    var nav = findVue(owner.$root, function(t) {
      return t.$options.name === "WZNavigation";
    });
    if (nav) {
      nav.toNavigationPage(index);
      if (nav.$route && nav.$route.path !== targetPath && nav.$router) {
        nav.$router.replace(targetPath).catch(function() {});
      }
      return;
    }
    if (owner.$router) {
      owner.$router.replace(targetPath).catch(function() {});
    }
  }
  function navBar(h, owner) {
    return h("nav", { class: "navigation-foot", attrs: { "aria-label": "主导航" } }, [
      h("div", { class: "navigation-foot-content" }, ["排盘", "记录", "题库", "设置"].map(function(label, i) {
        return h("button", {
          key: label,
          class: ["navigation-item", { "navigation-item-selected": i === 0 }],
          attrs: { type: "button", "aria-current": i === 0 ? "page" : null },
          on: { click: function() { goNav(owner, i); } }
        }, [
          icon(h, ["compass", "record", "book", "settings"][i]),
          h("span", { class: "nav-text" }, [label])
        ]);
      }))
    ]);
  }
  function calendarDetails(h, c) {
    return h("div", { class: "fa-calendar-details" }, [["公历", c.solarText], ["农历", c.lunarText], ["四柱", c.pillars.join(" ")], ["旬空", c.dayVoid + "（日） · " + c.hourVoid + "（时）"]].concat(c.solar.getHour() === 23 ? [["换日", c.dayBoundary === "zi-start" ? "子初换日 · 23时起按次日" : "午夜换日 · 晚子时按当日"]] : []).map(function(p) {
      return h("p", [h("span", [p[0]]), h("strong", [p[1]])]);
    }));
  }
  function hexLines(h, g, moving, onLine) {
    return h("div", { class: "fa-hex-lines" }, g.lines.slice().reverse().map(function(yang, i) {
      var line = 6 - i;
      return h("button", { class: ["fa-yao", { "is-yang": !!yang, "is-moving": moving && moving.includes(line) }],attrs:{type:'button','aria-label':g.name+' 第'+line+'爻详解'},on:{click:function(){onLine(line);}} }, [h("i"), h("i")]);
    }));
  }
  function renderMeihua(h, r) {
    var self=this,context='本盘体用：'+r.ti.name+r.ti.element+'为体，'+r.yong.name+r.yong.element+'为用，'+r.relation,items = [["本卦", r.main], ["互卦", r.mutual], ["变卦", r.changed], ["综卦", r.reverse], ["错卦", r.opposite]], month = r.calendar.eight.getMonthZhi();
    return h("div", { class: "fa-meihua" }, [calendarDetails(h, r.calendar), h("p", { class: "fa-method-meta" }, ["起卦：" + methodLabel("meihua", this.session.modules.meihua) + " · 动爻：" + r.moving + "爻"]), heading(h, "梅花易数卦象列表"), h("div", { class: "fa-five-gua" }, items.map(function(item, i) {
      return h("section", [h("h4", [item[0]]), hexLines(h, item[1], i === 0 ? [r.moving] : null,function(line){openGua(self.owner,self.session,item[1],item[0],i===0?r.moving:0,line,context);}), button(h, item[1].name, function() {
        openGua(self.owner,self.session,item[1],item[0],i===0?r.moving:0,null,context);
      }, "fa-gua-name")]);
    })),h('p',{class:'fa-gua-reading-hint'},['点卦名看详细解卦 · 点爻线看逐爻白话']), heading(h, "八卦类象 · 五行四季旺衰"), h("div", { class: "fa-trigram-matrix" }, ["upper", "lower"].map(function(key) {
      return items.map(function(item) {
        var t = item[1][key];
        return h("div", [h("div", { class: "fa-trigram" }, [2, 1, 0].map(function(bit) {
          return h("div", { class: ["fa-yao", { "is-yang": !!(t.bits >> bit & 1) }] }, [h("i"), h("i")]);
        })), h("strong", [t.name + "卦"]), h("span", [t.element + "（" + E.seasonState(t.element, month) + "）"])]);
      });
    })), heading(h, "用卦体卦五行生克关系"), h("table", { class: "fa-relation-table" }, [h("thead", [h("tr", [h("th", ["卦象"])].concat(items.map(function(item) {
      return h("th", [item[0]]);
    })))]), h("tbody", [h("tr", [h("th", ["用卦"])].concat(items.map(function(item) {
      return h("td", [(r.moving <= 3 ? item[1].lower : item[1].upper).element]);
    }))), h("tr", [h("th", ["体卦"])].concat(items.map(function(item) {
      return h("td", [(r.moving <= 3 ? item[1].upper : item[1].lower).element]);
    })))])]), h("p", { class: "fa-relation-summary" }, [r.ti.name + r.ti.element + "为体 · " + r.yong.name + r.yong.element + "为用 · " + r.relation])]);
  }
  function guaLineStructure(hex,n){
    var yang=!!hex.lines[n-1],proper=yang===(n%2===1),opposite=n<=3?n+3:n-3,respond=yang!==!!hex.lines[opposite-1];
    return(n<=3?'内卦':'外卦')+'第'+n+'爻，'+(yang?'阳':'阴')+'爻'+(proper?'当位':'不当位')+(n===2||n===5?'、居中':'')+'；与第'+opposite+'爻'+(respond?'阴阳相应':'同类不相应')+'。单变此爻为'+E.hexagram(hex.value^(1<<(n-1))).name+'。';
  }
  function renderLiuyaoReading(h,r,annotations){
    var self=this;
    if(!readingData&&!readingPromise&&ui.readingStatus!=='error')loadReadings().catch(function(){});
    if(ui.readingStatus==='error')return h('section',{class:'fa-liuyao-reading'},[heading(h,'本卦详解'),h('p',{class:'fa-error'},[ui.error]),button(h,'重新加载解卦资料',function(){ui.error='';loadReadings().catch(function(){});},'fa-button')]);
    if(!readingData)return h('section',{class:'fa-liuyao-reading'},[heading(h,'本卦详解'),h('p',{class:'fa-loading'},['正在打开离线解卦资料…'])]);
    var g=readingData.hexagrams[r.main.value],roles=E.yongshen(r.rows,this.yongIndex),context=r.main.name+' → '+r.changed.name;
    return h('section',{class:'fa-liuyao-reading'},[
      heading(h,'本卦详解 · '+g.name),h('div',{class:'fa-reading-prose'},[
        h('p',{class:'fa-reading-kicker'},['第'+g.number+'卦 · '+g.upper+'上'+g.lower+'下 · '+r.main.palace.trigram+'宫'+r.main.palace.element+' · '+r.main.palace.kind]),
        h('h4',['卦辞']),h('blockquote',[g.judgment]),h('h4',['现代白话']),h('p',[g.plain]),h('h4',['大象']),h('blockquote',[g.image]),
        h('p',{class:'fa-liuyao-reading-context'},['本盘'+(r.moving.length?'动爻：'+r.moving.map(function(n){return g.lines[n-1].label;}).join('、')+'，变为'+r.changed.name:'为静卦，本卦与变卦相同')+'。世爻在第'+r.main.palace.shi+'爻；用神选在第'+this.yongIndex+'爻。']),
        button(h,'展开经传与完整解说',function(){openGua(self.owner,self.session,r.main,'本卦',0,null,context);},'fa-small-button')
      ]),heading(h,'各爻位详解'),g.lines.map(function(line){
        var row=r.rows[line.index-1],changed=r.changedRows[line.index-1],a=annotations.rows[line.index-1];
        return h('article',{key:line.index,class:['fa-liuyao-line-reading',{'is-moving':row.moving,'is-selected':self.yongIndex===line.index}]},[
          h('header',[h('h4',[line.label+' · 第'+line.index+'爻']),row.moving?h('span',{class:'fa-reading-moving'},['动爻']):null,row.shi?h('span',[row.shi+'爻']):null,self.yongIndex===line.index?h('span',['用神']):null]),
          h('div',{class:'fa-reading-prose'},[h('blockquote',[line.original]),h('p',[line.plain]),h('p',{class:'fa-line-configuration'},['纳甲：'+row.role+row.ganzhi+row.element+'；六神：'+row.god+'；'+roles[line.index-1]+'神；月令'+row.season+'，日长生位：'+a.dayLife+'。']),
            row.hidden?h('p',{class:'fa-line-configuration'},['伏神：'+row.hidden.role+row.hidden.ganzhi+row.hidden.element+'，伏于本爻之下。']):null,
            h('p',{class:'fa-line-configuration'},['日月关系：'+(a.tags.join('、')||'无冲合空破标记')+'。'+(row.moving?'本爻发动，变为'+changed.role+changed.ganzhi+changed.element+'；'+(a.changes.join('、')||'无回头生克、进退标记')+'。':'本爻安静。')]),
            h('p',{class:'fa-line-structure'},[guaLineStructure(r.main,line.index)])
          ]),button(h,'查看本爻经传',function(){openGua(self.owner,self.session,r.main,'本卦',0,line.index,context);},'fa-small-button')
        ]);
      }),h('p',{class:'fa-reading-source'},[sourceLink(h,'卦爻白话与资料出处',g.reference)]),h('p',{class:'fa-caption'},['爻辞白话与本盘纳甲分别列示；纳甲关系随起卦时间、动爻及用神更新。日长生采用五行顺行、土随水。'])
    ]);
  }
  function renderLiuyao(h,r){
    var self=this,roles=E.yongshen(r.rows,this.yongIndex),annotations=E.liuyaoAnnotations(r);
    return h('div',{class:'fa-liuyao'},[
      calendarDetails(h,r.calendar),h('div',{class:'fa-liuyao-calendar-extra'},[
        h('p',['四柱旬空：'+annotations.voids.join(' / ')+'（年 / 月 / 日 / 时）']),
        h('p',['节气：'+annotations.term.name+' '+annotations.term.time]),h('p',['月建：'+annotations.month+' · 日辰：'+annotations.day+' · 起卦：'+methodLabel('liuyao',this.session.modules.liuyao)])
      ]),h('div',{class:'fa-liuyao-references'},E.liuyaoReferences(r).map(function(ref){var basis=ref.basis==='年支'?'农历年支':ref.basis;return h('span',{attrs:{title:'取法：'+basis}},[h('b',[ref.name]),' '+ref.value,h('small',['（'+basis+'）'])]);})),
      h('div',{class:'fa-liuyao-head'},[[r.main,'本卦'],[r.changed,'变卦']].map(function(item,i){return h('div',[h('h3',[item[0].name]),h('small',[item[1]+' · '+item[0].palace.trigram+'宫'+item[0].palace.element+' · '+item[0].palace.kind]),i===1?h('small',{class:'fa-liuyao-relation-note'},['六亲按本卦'+r.main.palace.trigram+'宫']):null]);})),
      h('div',{class:'fa-liuyao-rows'},r.rows.slice().reverse().map(function(row){
        var changed=r.changedRows[row.index-1],a=annotations.rows[row.index-1];
        function lineMain(x,isMain){
          var roleText=roles[row.index-1];
          var roleClass=roleText==='用'||roleText==='用神'?'is-yong':roleText==='元'||roleText==='元神'?'is-yuan':roleText==='忌'||roleText==='忌神'?'is-ji':roleText==='仇'||roleText==='仇神'?'is-chou':'is-xian';
          return h('div',{class:'fa-yao-main'},[h('div',{class:'fa-yao-left'},[h('strong',[x.role+x.ganzhi]),isMain&&roleText?h('em',{class:['fa-role-tag',roleClass]},[roleText]):null,h('span',[x.element])]),h('div',{class:['fa-yao',{'is-yang':!!x.yang,'is-moving':isMain&&row.moving}]},[h('i'),h('i')]),h('div',{class:'fa-yao-right'},[isMain&&row.moving?h('b',{class:'fa-moving-mark'},[row.yang?'○':'×']):null,h('b',{class:'fa-shiying'},[x.shi])])]);
        }
        return h('div',{class:'fa-liuyao-pair'},[
          button(h,[h('small',{class:'fa-yao-status'},[a.tags.concat(a.changes).join(' · ')||'静']),lineMain(row,true),
            h('div',{class:'fa-yao-info'},[h('small',[row.season+' · '+a.dayLife])]),
            row.hidden?h('small',{class:'fa-fushen'},['伏 '+row.hidden.role+row.hidden.ganzhi+row.hidden.element]):null
          ],function(){self.yongIndex=row.index;},['fa-liuyao-half',{'is-selected':self.yongIndex===row.index}]),
          h('div',{class:'fa-liuyao-half'},[h('small',{class:['fa-yao-status','is-empty']}),lineMain(changed,false),h('div',{class:'fa-yao-info'},[h('span',{class:'fa-six-god'},[changed.god]),h('small',[changed.season+' · '+a.changedDayLife])])])
        ]);
      })),
      renderLiuyaoReading.call(this,h,r,annotations)
    ]);
  }

  function renderQimen(h, r) {
    var self = this;
    return h("div", { class: "fa-qimen" }, [h("div", { class: "fa-qimen-heading" }, [h("div", { class: "fa-qimen-pillars" }, r.calendar.pillars.concat(r.config.qiJuType.startsWith("KEJIA") ? [r.keGz] : []).map(function(gz, i) {
      return h("div", [h("strong", [gz[0]]), h("small", [["年", "月", "日", "时", "刻"][i]]), h("strong", [gz[1]])]);
    })), h("div", [h("h3", [(r.isYang ? "阳遁" : "阴遁") + r.ju + "局 · " + ["上元", "中元", "下元"][r.yuan]]), h("p", [r.xunHead + "旬 · " + r.usedTerm]), h("p", ["值符：" + r.chiefStar + " · 值使：" + r.chiefDoor])])]), h("div", { class: "fa-qimen-actions" }, [button(h, methodLabel("qimen", r.config), function() {
      editMethod(self.owner, "qimen", self.session);
    }, "fa-small-button"), button(h, "←", function() {
      self.shiftTime(-2);
    }, "fa-small-button"), button(h, "→", function() {
      self.shiftTime(2);
    }, "fa-small-button")]), h("div", { class: "fa-qimen-grid" }, [4, 9, 2, 3, 5, 7, 8, 1, 6].map(function(n) {
      var c = r.cells[n - 1];
      return button(h, [h("div", { class: "fa-qimen-cell-top" }, [h("span", { class: "fa-hidden-stem" }, c.hiddenHeaven?[h('small',[c.hiddenHeaven]),h('small',[c.hidden+c.hiddenBranch]),h('small',[c.hiddenEarth])]:[c.hidden+c.hiddenJi, h("small", [c.hiddenBranch])]), h("strong", { class: { "fa-accent": c.isChief } }, [c.god]), h("small", { class: "fa-marks" }, [(c.void ? "○ " : "") + (c.horse ? "马" : "")])]), h("div", { class: "fa-qimen-cell-mid" }, [h("small", [c.heavenJi]), h("strong", { class: { "fa-accent": c.isChief } }, [c.star]), h("b", [c.heaven])]), h("div", { class: "fa-qimen-cell-bottom" }, [h("small", [c.earthJi || (r.config.qiPanType==='ZHUANPAN'?'':r.config.qiPanType==='KUONANG'?c.extraDoor:c.earthGod)]), h("strong", { class: { "fa-accent": c.isDoorChief } }, [c.door]), h("b", [c.earth])]),r.config.qiPanType==='KUONANG'?h('small',{class:'fa-earth-god'},[c.earthGod]):null], function() {
        self.qimenPalace = n;
      }, ["fa-qimen-cell", { "is-selected": self.qimenPalace === n }]);
    })), h("p", { class: "fa-caption" }, ["日空：" + r.calendar.dayVoid + " · 日马：" + r.dayHorse]), h("p", { class: "fa-caption" }, ["时空：" + r.calendar.hourVoid + " · 时马：" + r.hourHorse]), this.qimenPalace ? h("section", { class: "fa-palace-detail" }, [heading(h, r.cells[this.qimenPalace - 1].name + "宫"), h("p", [["神 " + r.cells[this.qimenPalace - 1].god, "星 " + r.cells[this.qimenPalace - 1].star, "门 " + r.cells[this.qimenPalace - 1].door].join(" · ")]), h("p", ["天盘 " + r.cells[this.qimenPalace - 1].heaven + " · 地盘 " + r.cells[this.qimenPalace - 1].earth + " · 暗干 " + r.cells[this.qimenPalace - 1].hidden])]) : null]);
  }
  function ziweiPalaceStars(p,mode,flow,index){
    var order=['文昌','文曲','左辅','右弼','天魁','天钺','禄存','擎羊','陀罗','火星','铃星','地空','地劫','天马'];
    var minor=p.minorStars.slice().sort(function(a,b){return order.indexOf(a.name)-order.indexOf(b.name);});
    var extra=p.adjectiveStars.filter(function(s){return mode==='sanhe'?s.name!=='天厨':['红鸾','天喜','天姚','天刑'].includes(s.name);});
    return p.majorStars.concat(minor,extra,flow&&flow.stars?flow.stars[index]:[]);
  }
  function getCachedTransformations(chart, index) {
    if (!chart._cachedTransformations) chart._cachedTransformations = {};
    if (!chart._cachedTransformations[index]) {
      chart._cachedTransformations[index] = E.transformations(chart, index);
    }
    return chart._cachedTransformations[index];
  }
  function getCachedPalaceStars(chart, p, mode, flow, index) {
    if (!chart._cachedPalaceStars) chart._cachedPalaceStars = {};
    var key = mode + '_' + (flow ? flow.name + '_' + JSON.stringify(flow.stars && flow.stars[index]) : '') + '_' + index;
    if (!chart._cachedPalaceStars[key]) {
      chart._cachedPalaceStars[key] = ziweiPalaceStars(p, mode, flow, index);
    }
    return chart._cachedPalaceStars[key];
  }
  // Cache by chart identity and exact flow time; chart switching never changes it.
  var horoscopeCache = new WeakMap();
  function getCachedHoroscope(chart, date, hour) {
    var cache = horoscopeCache.get(chart), key = date + '|' + hour;
    if (!cache) { cache = new Map(); horoscopeCache.set(chart, cache); }
    if (!cache.has(key)) {
      var value = chart.horoscope(date, hour);
      cache.set(key, value);
      if (cache.size > 80) cache.delete(cache.keys().next().value);
    }
    return cache.get(key);
  }
  // Palace anchors remain normalized; heads and labels use unscaled CSS pixels.
  function flightGeometry(item, width, height) {
    var points = item.points.map(function(p) { return [p[0] * width / 100, p[1] * height / 100]; });
    var tip = points[points.length - 1], prev = points[points.length - 2];
    var dx = tip[0] - prev[0], dy = tip[1] - prev[1], length = Math.hypot(dx, dy) || 1;
    var ux = dx / length, uy = dy / length;
    return { points: points, head: [tip, [tip[0]-ux*7-uy*2.8, tip[1]-uy*7+ux*2.8], [tip[0]-ux*7+uy*2.8, tip[1]-uy*7-ux*2.8]],
      label: [tip[0]-ux*16-uy*8, tip[1]-uy*16+ux*8], direction: [ux, uy] };
  }
  function registerFlightLayer() {
    V.component('FiveArtsFlightLayer', {
      props: ['items'],
      data: function() { return { width: 0, height: 0 }; },
      mounted: function() {
        var self = this;
        this._measure = function() {
          var rect = self.$el.getBoundingClientRect();
          if (Math.abs(self.width-rect.width) > .01) self.width = rect.width;
          if (Math.abs(self.height-rect.height) > .01) self.height = rect.height;
        };
        this._measure();
        if (global.ResizeObserver) { this._sizeObserver = new ResizeObserver(this._measure); this._sizeObserver.observe(this.$el.parentElement); }
        else global.addEventListener('resize', this._measure);
      },
      beforeDestroy: function() {
        if (this._sizeObserver) this._sizeObserver.disconnect();
        else global.removeEventListener('resize', this._measure);
      },
      render: function(h) {
        var width = this.width, height = this.height, children = [], labels = [];
        if (width && height) (this.items || []).forEach(function(item, index) {
          var g = flightGeometry(item, width, height), attrs = Object.assign({}, item.attrs, {
            points: g.points.map(function(p) { return p.join(','); }).join(' '), fill: 'none',
            stroke: item.color, 'stroke-width': 1.6, 'vector-effect': 'non-scaling-stroke'
          });
          children.push(h('polyline', { key: 'line'+index, class: item.className, attrs: attrs }));
          if (item.arrow) children.push(h('polygon', { key: 'head'+index, class: 'fa-flight-head', attrs: {
            points: g.head.map(function(p) { return p.join(','); }).join(' '), fill: item.color
          } }));
          if (item.label) {
            var x = g.label[0], y = g.label[1], half = item.label.length * 3.8 + 3;
            // Keep labels apart when several transformations arrive at one palace.
            for (var n=0; n<8 && labels.some(function(b) { return Math.abs(b.x-x)<b.half+half && Math.abs(b.y-y)<13; }); n++) {
              x -= g.direction[0]*13; y -= g.direction[1]*13;
            }
            labels.push({x:x, y:y, half:half});
            children.push(h('text', { key: 'label'+index, class: 'fa-flight-label', attrs: {
              x:x, y:y, fill:item.color, 'font-size':11, 'text-anchor':'middle', 'dominant-baseline':'central'
            } }, [item.label]));
          }
        });
        return h('svg', { class:'fa-flight-layer', attrs: { viewBox:'0 0 '+(width || 1)+' '+(height || 1),
          preserveAspectRatio:'xMidYMid meet', 'aria-hidden':'true', 'shape-rendering':'geometricPrecision' } }, children);
      }
    });
  }
  function renderZiwei(h, r) {
    var self=this,chart=r.chart,mode=this.session.ziweiMode,palaces=chart.palaces,selected=this.ziweiPalace<0?palaces.findIndex(function(p){return p.name==='命宫';}):this.ziweiPalace;
    var positions=[[3,0,0],[4,0,1],[5,0,2],[6,0,3],[2,1,0],[7,1,3],[1,2,0],[8,2,3],[0,3,0],[11,3,1],[10,3,2],[9,3,3]];
    var colors=['#319344','#9234a4','#2788ce','#e04436'],badgeColors=['#2a703b','#7d328a','#22659e','#b7392e'],codes='ABCD',mutagens='禄权科忌',flow=null,horoscope;
    try{horoscope=getCachedHoroscope(chart,this.flowDate,this.flowHour);if(this.flowScope)flow=horoscope[this.flowScope];}catch(_){}
    var flights=getCachedTransformations(chart,selected),birthYear=r.calendar.lunar.getYear(),birthBranch=E.ZHI.indexOf(r.calendar.lunar.getYearZhi());
    var flowYearBase=this.flowScope?E.calendar(this.flowDate+' 12:00').lunar.getYear():birthYear+2;
    function anchor(index){var pos=positions.find(function(p){return p[0]===index;});return [pos[2]===0?25:pos[2]===3?75:pos[2]*25+12.5,pos[1]===0?25:pos[1]===3?75:pos[1]*25+12.5];}
    function starNode(star){
      var birth=star.mutagen?mutagens.indexOf(star.mutagen):-1,flight=flights.findIndex(function(f){return f.star===star.name;}),flowMut=flow?flow.mutagen.indexOf(star.name):-1;
      return h('div',{class:['fa-ziwei-star','fa-star-'+star.type,{'fa-flow-star':star.scope&&star.scope!=='origin'}]},[
        h('strong',{class:{'fa-flight-highlight':flight>=0},style:flight>=0?{'--fa-mutagen-color':badgeColors[flight]}:{}},[{截路:'截空',空亡:'副截'}[star.name]||star.name]),
        mode==='sanhe'&&star.brightness?h('small',{class:'fa-brightness'},[star.brightness]):null,
        h('div',{class:'fa-star-mutagens'},[
          birth>=0?h('em',{class:['fa-mutagen',{'fa-mutagen-code':mode==='qintian'}],style:{'--fa-mutagen-color':mode==='sanhe'?badgeColors[3]:badgeColors[birth]}},[mode==='qintian'?codes[birth]:mutagens[birth]]):null,
          flowMut>=0?h('em',{class:'fa-flow-mutagen',style:{color:['var(--pf-wood)','var(--zw-purple)','var(--pf-water)','var(--pf-fire)'][flowMut]}},['流'+mutagens[flowMut]]):null
        ])
      ]);
    }
    function flowYear(p){return flowYearBase+(E.ZHI.indexOf(p.earthlyBranch)-(flowYearBase-4)%12+12)%12;}
    function decadalName(index){return horoscope&&horoscope.decadal.palaceNames[index]||'';}
    var jsx=positions.map(function(pos){
      var p=palaces[pos[0]],stars=getCachedPalaceStars(chart,p,mode,flow,pos[0]),year=flowYear(p),annualAge=(E.ZHI.indexOf(p.earthlyBranch)-birthBranch+12)%12+1;
      var tags=[];
      if(p.isBodyPalace&&mode==='sanhe')tags.push(h('span',{class:'fa-palace-tag'},['身宫']));
      if(p.isOriginalPalace&&mode!=='sanhe')tags.push(h('span',{class:'fa-palace-tag'},['来因']));
      var footer=mode==='qintian'?h('div',{class:'fa-qintian-foot'},[
        h('b',{class:'fa-palace-ganzhi'},[p.heavenlyStem+p.earthlyBranch]),
        h('div',[h('span',['大'+decadalName(pos[0]).replace('宫','').slice(0,1)]),h('small',[p.decadal.range.join('～')])]),
        h('strong',{class:'fa-palace-name'},[p.name==='仆役'?'交友':p.name])
      ]):h('div',{class:'fa-palace-foot'},[
        mode==='sanhe'?h('div',{class:'fa-palace-gods'},[p.boshi12,p.jiangqian12,p.suiqian12].map(function(v){return h('span',[v]);})):h('div',{class:'fa-palace-annual'},[h('span',[year-birthYear+1+'岁']),h('span',[String(year)]),h('span',['大'+decadalName(pos[0]).replace('宫','').slice(0,1)])]),
        h('div',{class:'fa-palace-title'},[h('small',[p.decadal.range.join('～')]),h('strong',{class:'fa-palace-name'},[p.name==='仆役'?'交友':p.name])]),
        h('div',{class:'fa-palace-branch'},[mode==='sanhe'?h('small',[p.changsheng12]):null,h('b',{class:'fa-palace-ganzhi'},[p.heavenlyStem+p.earthlyBranch])])
      ]);
      return button(h,[h('div',{class:'fa-ziwei-stars',style:{'--fa-stars-count':Math.max(stars.length,1)}},stars.map(starNode)),h('div',{class:'fa-palace-tags'},tags),
        h('div',{class:'fa-palace-meta'},[
          mode==='sanhe'?h('div',{class:'fa-palace-age-lists'},[h('small',['流年: '+[0,1,2,3,4].map(function(i){return annualAge+i*12;}).join(',')]),h('small',['小限: '+p.ages.slice(0,5).join(',')])]):null,
          mode==='qintian'?h('small',{class:'fa-palace-year'},[year+'年'+(year-birthYear+1)+'虚岁']):null,
          h('span',{class:['fa-flow-palace-name',{'is-empty':!flow}],attrs:{'aria-hidden':String(!flow)}},[flow?flow.name+' '+flow.palaceNames[pos[0]]:'\u00a0']),footer
        ])
      ],function(){self.ziweiPalace=pos[0];self.ziweiFlying=true;},['fa-ziwei-palace',{'is-selected':selected===pos[0],'fa-flow-palace':flow&&flow.index===pos[0]}]);
    });
    var info=this.owner.infoData,polarity='甲丙戊庚壬'.includes(r.calendar.lunar.getYearGan())?'阳':'阴';
    var center=[h('h3',['造化元钥']),h('div',{class:'fa-ziwei-identity'},[h('span',['姓名: '+(info.name||'匿名')]),h('span',[polarity+chart.gender+' '+chart.fiveElementsClass])])];
    if(mode!=='qintian')center.push(h('p',['真太阳时: '+(info.sunTime||info.solarTime)]),h('p',['钟表时间: '+info.solarTime]));
    center.push(h('p',{class:'fa-ziwei-lunar'},['农历: '+chart.lunarDate+' '+chart.time]));
    if(mode==='sanhe'){
      center.push(h('p',['命主: '+chart.soul+' 身主: '+chart.body]));
      var lunar=r.calendar.lunar,normal=[lunar.getYearInGanZhi(),lunar.getMonthInGanZhi(),lunar.getDayInGanZhi(),lunar.getTimeInGanZhi()];
      center.push(h('div',{class:'fa-center-pillar-groups'},[['节气四柱',r.calendar.pillars],['非节气四柱',normal]].map(function(pair){return h('section',[h('small',[pair[0]]),h('div',{class:'fa-center-pillars'},pair[1].map(function(gz){return h('b',[gz.split('').map(function(char){return h('span',{class:'fa-pillar-'+char},[char]);})]);}))]);})));
      var pan=this.owner.panData;
      if(pan&&pan.qiyunStr)center.push(h('p',{class:'fa-ziwei-qiyun'},[pan.qiyunStr]));
      if(this.owner.dayunArr&&this.owner.dayunArr.length)center.push(h('div',{class:'fa-ziwei-bazi-luck'},this.owner.dayunArr.slice(0,8).map(function(d){return h('span',[h('b',[d[0]+d[1]]),h('small',[d[4]+'岁']),h('small',[String(d[5])])]);})));
    }
    if(mode!=='qintian')center.push(h('div',{class:'fa-self-legend'},['自化图示: '].concat(mutagens.split('').map(function(m,i){return h('span',{style:{color:['var(--pf-wood)','var(--zw-purple)','var(--pf-water)','var(--pf-fire)'][i]}},['→'+m]);}))));
    var lines=[],a=anchor(selected);
    if(mode==='qintian'){
      var grouped={};(E.centripetalTransformations?E.centripetalTransformations(chart):[]).forEach(function(f){var key=f.source+'_'+f.target;if(!grouped[key])grouped[key]={source:f.source,target:f.target,codes:[]};grouped[key].codes.push(f.code);});
      Object.keys(grouped).forEach(function(key){var item=grouped[key];lines.push({className:'fa-qintian-flight',points:[anchor(item.source),anchor(item.target)],arrow:true,label:item.codes.join(''),color:'#e04436',attrs:{'data-source':item.source,'data-target':item.target,'data-codes':item.codes.join('')}});});
    }else [4,6,8].forEach(function(d){var target=(selected+d)%12;lines.push({className:'fa-sanhe-line',points:[a,anchor(target)],color:'#999',attrs:{'data-source':selected,'data-target':target,'stroke-dasharray':'4 3'}});});
    var arrowKey = [mode,this.flowScope,this.flowDate,this.flowHour].join('|');
    if (!chart._cachedSelfArrows || chart._cachedSelfArrowsKey !== arrowKey) {
      var arrowData = [];
      positions.forEach(function(pos){
        var palace=palaces[pos[0]],stars=getCachedPalaceStars(chart,palace,mode,flow,pos[0]);
        getCachedTransformations(chart,pos[0]).forEach(function(f,i){
          if(f.target!==pos[0])return;
          var col=pos[2],row=pos[1],order=stars.findIndex(function(star){return star.name===f.star;});
          var step=mode==='sanhe'?Math.min(2.9,24/stars.length):4.4,offset=mode==='feixing'?24-(order+.5)*step:1+(order+.5)*step,x=col*25+offset,y=row*25+1,points;
          if(row===0){points=[[x,y],[x,-3]];}
          else if(row===3){y=row*25+16;points=mode==='qintian'?[[x,y],[x,row*25+17],[col*25+5.75,row*25+17],[col*25+5.75,103]]:[[x,y],[x,103]];}
          else {y=row*25+11;var turn=row*25+16;points=[[x,y],[x,turn],[col===0?-3:103,turn]];}
          var color=mode==='qintian'?'#e04436':colors[i];
          arrowData.push({className:'fa-self-arrow',points:points,arrow:true,label:mode==='qintian'?codes[i]:'',color:color,attrs:{'data-source':pos[0],'data-star':f.star,'data-code':codes[i]}});
        });
      });
      chart._cachedSelfArrows = arrowData;
      chart._cachedSelfArrowsKey = arrowKey;
    }
    lines = lines.concat(chart._cachedSelfArrows);
    var directions=h('div',{class:'fa-ziwei-directions'},[['top','正南方','南偏西'],['left','南偏东','东偏南','正东方','东偏北'],['right','西偏南','正西方','西偏北','北偏西'],['bottom','北偏东','正北方']].map(function(items){return h('div',{class:'fa-direction-'+items[0]},items.slice(1).map(function(t){return h('span',[t]);}));}));
    return h('div',{class:['fa-ziwei','fa-ziwei-'+mode]},[
      h('div',{class:'fa-ziwei-board'},[directions,h('div',{class:'fa-ziwei-grid'},jsx.concat([h('div',{class:'fa-ziwei-center'},center),h('FiveArtsFlightLayer',{props:{items:lines}})]))]),
      this.renderZiweiFlows(h,r,mode==='sanhe'),
      h('div',{class:'fa-ziwei-modebar'},[choices(h,[['feixing','飞星'],['sanhe','三合'],['qintian','钦天·四化']],mode,function(v){self.session.ziweiMode=v;saveSession(self.session);}),button(h,'本命',function(){self.flowScope='';},'fa-ziwei-natal'),button(h,'宫位详读',function(){openPalaceReading(self,r,mode,flow,horoscope,flowYearBase,birthYear,birthBranch,selected);},'fa-small-button fa-palace-read'),button(h,'紫微助手',function(){self.assistantOpen=true;},'fa-ziwei-assistant-entry')])
    ]);
  }

  function renderZiweiAssistant(h) {
    var self=this, snapshot;
    try{snapshot=this.assistantSnapshot();}catch(_){snapshot=null;}
    var palace=snapshot&&snapshot.palaces[snapshot.selectedPalace];
    return h('section',{class:'za-assistant',attrs:{'aria-label':'紫微助手'}},[
      h('header',{class:'za-header'},[button(h,'‹',function(){self.assistantOpen=false;},'za-back'),h('h2',['紫微助手']),h('span',{class:'za-header-space'})]),
      h('main',{class:'za-content'},[
        h('div',{class:'za-chart'},[h('div',{class:'za-chart-mark'},['▦']),h('div',[h('strong',['当前命盘']),h('p',[snapshot?snapshot.gender+' · '+snapshot.fiveElementsClass+' · '+(palace?palace.name:'命宫'):'命盘准备中']),h('small',[snapshot&&snapshot.flowDate?'所选运限：'+snapshot.flowDate:'本命盘'])])]),
        h('div',{class:'za-prompts'},['命宫解析','三方四正','大限流年','四化解析'].map(function(label){return button(h,label,function(){self.sendAssistant(label);},'za-chip',self.assistantBusy||!global.WZBZAssistantEndpoint);})),
        h('p',{class:'za-privacy'},['提问时会将当前命盘结构和问题发送至 DeepSeek；不发送姓名和出生日期。']),
        self.assistantMessages.length?self.assistantMessages.map(function(item,i){return h('div',{key:i,class:['za-message','za-'+item.role]},[
          h('div',{class:'za-bubble'},[h('p',[item.text]),item.evidence?h('div',{class:'za-evidence'},[h('strong',['当前选中宫位']),h('p',[item.evidence])]):null,item.role==='assistant'?button(h,'加入断事笔记',function(){self.assistantToNote(item);},'za-note-button'):null])]);}):h('div',{class:'za-empty'},[global.WZBZAssistantEndpoint?'选择一个问题，或输入你想了解的内容。':'紫微助手服务尚未开通；排盘与断事笔记可正常使用。']),
        self.assistantBusy?h('p',{class:'za-pending'},['正在分析命盘…']):null,
        self.assistantError?h('p',{class:'za-error',attrs:{role:'alert'}},[self.assistantError]):null
      ]),
      h('form',{class:'za-composer',on:{submit:function(e){e.preventDefault();self.sendAssistant();}}},[
        h('input',{attrs:{type:'text',maxlength:'1000',placeholder:'请输入关于命盘的问题','aria-label':'输入问题'},domProps:{value:self.assistantQuestion},on:{input:function(e){self.assistantQuestion=e.target.value;}}}),
        h('button',{attrs:{type:'submit',disabled:self.assistantBusy||!global.WZBZAssistantEndpoint||!self.assistantQuestion.trim()}},['发送'])
      ])
    ]);
  }
  function registerHost() {
    registerFlightLayer();
    V.component('FiveArtsChartPane', {
      props: ['host', 'type'],
      render: function(h) {
        var self = this.host, k = this.type, s = self.session, _a;
        var content, error = "";
          try {
            var r = self.result(k);
            content = k === "ziwei" ? renderZiwei.call(self, h, r) : k === "qimen" ? renderQimen.call(self, h, r) : k === "liuyao" ? renderLiuyao.call(self, h, r) : renderMeihua.call(self, h, r);
          } catch (e) {
            error = e.message || "排盘失败，请检查输入";
          }

          return h("div", { key: k, class: "fa-slide-pane fa-slide-" + k }, [
            h("header", { class: "fa-result-header" }, [
              button(h, icon(h, "back"), self.owner.onBack, "fa-icon-button"),
              h("h2", [self.owner.infoData && self.owner.infoData.name || NAMES[k] + "排盘"]),
              button(h, icon(h, "settings"), function() { open(self.owner, "preferences"); }, "fa-icon-button")
            ]),
            h("main", { class: "fa-other-content" }, [
              k !== "ziwei" ? h("div", { class: "fa-result-date" }, [
                button(h, [icon(h, "calendar"), ((_a = s.modules[k]) == null ? void 0 : _a.time) || s.baseTime], function() {
                  editMethod(self.owner, k, s);
                }, "fa-time-button"),
                button(h, methodLabel(k, s.modules[k]), function() {
                  editMethod(self.owner, k, s);
                }, "fa-method-button")
              ]) : null,
              error ? h("section", { class: "fa-empty-state" }, [
                h("p", [error]),
                k !== "ziwei" ? button(h, "选择起卦参数", function() { editMethod(self.owner, k, s); }, "fa-primary") : null
              ]) : content,

            ])
          ]);
      }
    });
    V.component("FiveArtsResultHost", {
      props: ["owner"],
      data: function() {
        var def = ui.preferences.defaultChart;
        var initRendered = { bazi: true };
        if (def) initRendered[def] = true;
        return {
          active: def,
          session: null,
          sourceKey: "",
          yongIndex: 6,
          qimenPalace: 0,
          ziweiPalace: -1,
          ziweiFlying: false,
          assistantOpen: false,
          assistantQuestion: '',
          assistantBusy: false,
          assistantError: '',
          assistantMessages: [],
          flowDate: now().slice(0, 10),
          flowHour: 0,
          flowScope: "",
          ziweiMoreFlows: false,
          renderedTabs: initRendered
        };
      },
      computed: {
        trackStyle: function() {
          var order = ui.preferences.order;
          var index = order.indexOf(this.active);
          if (index === -1) index = 0;
          return {
            transform: "translate3d(" + -(index * 20) + "%, 0, 0)",
            transition: "none"
          };
        }
      },
      created: function() {
        this._cache = /* @__PURE__ */ new Map();
        this._scrollPositions = {};
        this._touch = null;
        this._dragOffset = 0;
        this._isDragging = false;
        this._rafId = null;
        this._slideTimer = null;
        this._prepareTimer = null;
        this._prepareIdle = null;
        this._mountFrame = null;
        this._slideRequest = 0;
        this.$watch(function() {
          var i = this.owner.infoData;
          return [this.owner.$route.fullPath, this.owner.chartPending, i && i.solarTime, i && i.sunTime, i && i.strSunTime, i && i.sex, this.owner.caseGuid, ui.flow].join("|");
        }, this.syncSession, { immediate: true });
      },
      mounted: function() {
        this.prepareNextPane();
        var self=this;
        this._legacyWidth=0;
        this._measureLegacy=function(){
          var width=self.$el.clientWidth;
          if(!width || width===self._legacyWidth)return;
          self._legacyWidth=width;
          self.refreshLegacySize();
        };
        if(global.ResizeObserver){this._legacyObserver=new ResizeObserver(this._measureLegacy);this._legacyObserver.observe(this.$el);}
        else global.addEventListener('resize',this._measureLegacy);
        this._measureLegacy();
      },
      beforeDestroy: function() {
        if(this._legacyObserver)this._legacyObserver.disconnect();
        else global.removeEventListener('resize',this._measureLegacy);
        if(this._legacyResizeFrame)cancelAnimationFrame(this._legacyResizeFrame);
        this._cache.clear();
        if (this._rafId) cancelAnimationFrame(this._rafId);
        if (this._mountFrame) cancelAnimationFrame(this._mountFrame);
        this._slideRequest++;
        clearTimeout(this._slideTimer);
        if (this._prepareIdle && global.cancelIdleCallback) global.cancelIdleCallback(this._prepareIdle);
        clearTimeout(this._prepareTimer);
      },
      methods: {
        refreshLegacySize: function() {
          var self=this;
          this.$nextTick(function(){
            if(self._isDestroyed)return;
            if(self._legacyResizeFrame)cancelAnimationFrame(self._legacyResizeFrame);
            self._legacyResizeFrame=requestAnimationFrame(function(){
              self._legacyResizeFrame=null;
              var el=self.$el.querySelector('.fa-legacy .wzbz_main_wrapper.van-swipe'),swipe=el&&el.__vue__;
              if(swipe&&typeof swipe.resize==='function')swipe.resize();
            });
          });
        },
        assistantToNote: function(item) {
          var note=this.owner.noteData, guid=note&&note.userGuid;
          if(!guid){this.assistantError='当前命例无法写入笔记';return;}
          var key='wzbz_note_drafts_v1', drafts=read(key,{}), old=drafts[guid]&&typeof drafts[guid].content==='string'?drafts[guid].content:String(note.content||'');
          var text=old+(old?'\n\n':'')+'【紫微助手】\n'+item.text+'\n当前选中宫位：'+item.evidence;
          if(text.length>20000){this.assistantError='笔记长度已达上限，请先整理笔记';return;}
          drafts[guid]={content:text,updatedAt:Date.now()};
          if(!write(key,drafts)){this.assistantError='笔记草稿写入失败';return;}
          this.assistantOpen=false;this.change('bazi');this.owner.onTab(3);notify('已加入断事笔记草稿，请查看并保存');
        },
        assistantSnapshot: function() {
          var result=this.result('ziwei'), chart=result.chart, index=this.ziweiPalace<0?chart.palaces.findIndex(function(p){return p.name==='命宫';}):this.ziweiPalace;
          var horoscope=this.flowScope?getCachedHoroscope(chart,this.flowDate,this.flowHour):null;
          return {mode:this.session.ziweiMode,scope:this.flowScope||'本命',flowDate:this.flowScope?this.flowDate:null,selectedPalace:index,
            gender:chart.gender,fiveElementsClass:chart.fiveElementsClass,
            palaces:chart.palaces.map(function(p,i){return {index:i,name:p.name,stem:p.heavenlyStem,branch:p.earthlyBranch,decadal:p.decadal&&p.decadal.range,
              stars:p.majorStars.map(function(s){return {name:s.name,type:'major',brightness:s.brightness||null,mutagen:s.mutagen||null};}).concat(p.minorStars.map(function(s){return {name:s.name,type:'minor',brightness:s.brightness||null,mutagen:s.mutagen||null};}))};}),
            selectedTransformations:getCachedTransformations(chart,index).map(function(f){return {star:f.star,source:f.source,target:f.target,code:f.code};}),
            flow:horoscope&&horoscope[this.flowScope]?{name:horoscope[this.flowScope].name,palaceNames:horoscope[this.flowScope].palaceNames,mutagen:horoscope[this.flowScope].mutagen}:null};
        },
        sendAssistant: async function(question) {
          var text=String(question||this.assistantQuestion).trim(); if(!text||this.assistantBusy)return;
          var endpoint=global.WZBZAssistantEndpoint;
          if(!endpoint){this.assistantError='紫微助手服务尚未开通，当前可正常使用排盘与笔记。';return;}
          var snapshot; try{snapshot=this.assistantSnapshot();}catch(e){this.assistantError='命盘数据尚未准备好';return;}
          var sourceKey=this.sourceKey,history=this.assistantMessages.slice(-8).filter(function(x){return x.role==='user'||x.role==='assistant';}).map(function(x){return {role:x.role,content:x.text};});
          this.assistantQuestion='';this.assistantError='';this.assistantBusy=true;
          this.assistantMessages.push({role:'user',text:text});
          try{
            var response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:text,chart:snapshot,history:history}),signal:AbortSignal.timeout(65000)});
            var result=await response.json();if(!response.ok)throw Error(result.error||'助手暂时不可用');
            if(sourceKey!==this.sourceKey)return;
            var palace=snapshot.palaces[snapshot.selectedPalace];
            this.assistantMessages.push({role:'assistant',text:result.answer,evidence:palace.name+' · '+(palace.stem||'')+(palace.branch||'')+' · '+(palace.stars.map(function(s){return s.name;}).join('、')||'无主辅星')+' · '+snapshot.scope});
          }catch(error){if(sourceKey===this.sourceKey)this.assistantError=error.message||'连接失败，请稍后重试';}
          finally{if(sourceKey===this.sourceKey)this.assistantBusy=false;}
        },
        prepareNextPane: function() {
          var self=this;
          clearTimeout(this._prepareTimer);
          if(this._prepareIdle&&global.cancelIdleCallback)global.cancelIdleCallback(this._prepareIdle);
          this._prepareIdle=null;
          this._prepareTimer=setTimeout(function(){
            self._prepareTimer=null;
            if(self._isDestroyed||!self.session||document.hidden)return;
            if(self._isDragging||self._slideTimer){self.prepareNextPane();return;}
            var session=self.session,active=self.active,order=ui.preferences.order,index=order.indexOf(active),next=order[(index+1)%order.length];
            if(!next||self.renderedTabs[next])return;
            function prepare(deadline){
              self._prepareIdle=null;
              if(self._isDestroyed||document.hidden)return;
              if(self.session!==session||self.active!==active||self._mountFrame){self.prepareNextPane();return;}
              if(self._isDragging||self._slideTimer||(deadline&&deadline.timeRemaining()<8)){self.prepareNextPane();return;}
              V.set(self.renderedTabs,next,true);
            }
            if(global.requestIdleCallback)self._prepareIdle=global.requestIdleCallback(prepare);
            else prepare();
          },600);
        },
        settleSlide: function() {
          var track = this.$refs.sliderTrack;
          clearTimeout(this._slideTimer);
          this._slideTimer = null;
          if (track) {
            track.style.transition = 'none';
            track.style.transform = 'translate3d(' + -(ui.preferences.order.indexOf(this.active)*20) + '%, 0, 0)';
          }
          this.prepareNextPane();
        },
        syncSession: function() {
          var o = this.owner, i = o.infoData;
          if (o.isComp || !/^\/main\/paipan(?:$|[/?])/.test(o.$route.path)) return;
          if (o.chartPending) {
            if(this._mountFrame){cancelAnimationFrame(this._mountFrame);this._mountFrame=null;}
            this._slideRequest++;
            this.session = null;
            this.sourceKey = '';
            this.active = ui.preferences.defaultChart;
            this._cache.clear();
            return;
          }
          if (!i || !i.solarTime) return;
          var time = global.WZBZTimePolicy.chartTime(i);
          if (!time.includes(" ")) time += " 00:00";
          var guid = o.caseGuid || "", key = [guid, time, i.sex, ui.flow].join("|");
          if (key === this.sourceKey) return;
          if(this._mountFrame){cancelAnimationFrame(this._mountFrame);this._mountFrame=null;}
          this._slideRequest++;
          this.sourceKey = key;
          this.assistantOpen=false;this.assistantMessages=[];this.assistantQuestion='';this.assistantError='';this.assistantBusy=false;
          var existing = sessions.get(key);
          if (!existing) {
            var allSaved = read(KEYS.records, {}), pending = ui.pending && Date.now() - ui.pending.created < 6e4 ? ui.pending : null;
            var saved = guid ? allSaved[guid] : !pending && allSaved["@last"] && allSaved["@last"].baseTime === time ? allSaved["@last"] : null;
            var modules = validOptions(pending && pending.modules || saved && saved.modules);
            if (!saved && !pending) ["qimen", "liuyao", "meihua"].forEach(function(k) {
              delete modules[k].time;
            });
            existing = V.observable({ guid: guid, baseTime: time, sex: i.sex, modules: modules, ziweiMode: saved && saved.ziweiMode || "sanhe", liuyaoReference: saved && ['huozhulin', 'haidiyan', 'huangjince'].includes(saved.liuyaoReference) ? saved.liuyaoReference : 'huozhulin', revision: 0 });
            sessions.set(key, existing);
            if (sessions.size > 20) sessions.delete(sessions.keys().next().value);
            if (pending) ui.pending = null;
          }
          this.session = existing;
          this.active = ui.preferences.defaultChart;
          this._cache.clear();
          this.yongIndex = 6;
          this._scrollPositions = {};
          this.ziweiMoreFlows = false;
          this.flowScope = "";
          this.ziweiFlying = false;
          this.ziweiPalace = -1;
          if (guid) saveSession(existing);
          this.prepareNextPane();
        },
        result: function(type) {
          var s = this.session;
          if (!s) return null;
          if (Number(this.owner.infoData.unknowhour) === 1 && (type === "ziwei" || !s.modules[type].time)) throw Error("出生时辰未知，请先补全时间后查看" + NAMES[type] + "盘。");
          var options = s.modules[type] || {}, time = options.time || s.baseTime, key = type + "|" + time + "|" + JSON.stringify(options) + "|" + s.sex;
          var cached = this._cache.get(key);
          if (cached) return cached;
          var r = type === "ziwei" ? E.ziwei(s.baseTime, Number(s.sex) === 0 ? "女" : "男") : E[type](time, options);
          this._cache.set(key, r);
          if (this._cache.size > 40) this._cache.delete(this._cache.keys().next().value);
          return r;
        },
        slideTo: function(index) {
          if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
          if (this._mountFrame) { cancelAnimationFrame(this._mountFrame); this._mountFrame = null; }
          clearTimeout(this._prepareTimer);
          if(this._prepareIdle&&global.cancelIdleCallback)global.cancelIdleCallback(this._prepareIdle);
          this._prepareIdle=null;
          clearTimeout(this._slideTimer);
          this._slideTimer=null;
          var self=this,request=++this._slideRequest;
          var order = ui.preferences.order;
          index = Math.max(0, Math.min(order.length - 1, index));
          var targetTab = order[index];
          var needsMount=!this.renderedTabs[targetTab];
          if (needsMount) {
            V.set(this.renderedTabs, targetTab, true);
          }
          this._dragOffset = 0;
          this._isDragging = false;
          function beginSlide() {
            if(self._isDestroyed||request!==self._slideRequest)return;
            self._mountFrame=null;
            var track=self.$refs.sliderTrack;
            if(track){
              track.style.transition="transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)";
              track.style.transform="translate3d("+-(index*20)+"%, 0, 0)";
            }
            self.active=targetTab;
            ui.active=targetTab;
            self._slideTimer=setTimeout(function(){self.settleSlide();},280);
          }
          if(needsMount){
            // Let Vue mount and the browser paint the target before starting its animation.
            this.$nextTick(function(){
              if(self._isDestroyed||request!==self._slideRequest)return;
              self._mountFrame=requestAnimationFrame(function(){
                if(self._isDestroyed||request!==self._slideRequest)return;
                self._mountFrame=requestAnimationFrame(beginSlide);
              });
            });
          }else beginSlide();
        },
        change: function(type) {
          var order = ui.preferences.order;
          var idx = order.indexOf(type);
          if (idx !== -1) {
            this.slideTo(idx);
          }
        },
        touchStart: function(e) {
          if (ui.popup || e.touches.length !== 1 || e.target.closest("input,textarea,select,.fa-choices,.fa-flow-row,.tab_block,.fa-sort-list,.navigation-foot")) return;
          clearTimeout(this._prepareTimer);
          if(this._prepareIdle&&global.cancelIdleCallback)global.cancelIdleCallback(this._prepareIdle);
          this._prepareIdle=null;
          if(this._mountFrame){cancelAnimationFrame(this._mountFrame);this._mountFrame=null;}
          this._slideRequest++;
          this._touch = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, time: Date.now(), direction: null };
          this._dragOffset = 0;
          this._isDragging = false;
        },
        touchMove: function(e) {
          if (!this._touch) return;
          var dx = e.touches[0].clientX - this._touch.startX, dy = e.touches[0].clientY - this._touch.startY;
          if (this._touch.direction === null) {
            if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
              if (Math.abs(dx) >= Math.abs(dy)) {
                this._touch.direction = "horizontal";
                this._isDragging = true;
                clearTimeout(this._slideTimer);
                this._slideTimer = null;
              } else {
                this._touch.direction = "vertical";
              }
            }
          }
          if (this._touch.direction === "horizontal") {
            if (e.cancelable) e.preventDefault();
            e.stopPropagation();
            var order = ui.preferences.order, curIdx = order.indexOf(this.active);
            if ((curIdx === 0 && dx > 0) || (curIdx === order.length - 1 && dx < 0)) {
              dx = dx * 0.28;
            }
            this._dragOffset = dx;
            var self = this;
            if (!this._rafId) {
              this._rafId = requestAnimationFrame(function() {
                self._rafId = null;
                var track = self.$refs.sliderTrack;
                if (track) {
                  var basePercent = -(order.indexOf(self.active) * 20);
                  track.style.transition = "none";
                  track.style.transform = "translate3d(calc(" + basePercent + "% + " + self._dragOffset + "px), 0, 0)";
                }
              });
            }
          }
        },
        touchEnd: function(e) {
          if (!this._touch) return;
          var dx = e.changedTouches[0].clientX - this._touch.startX, dy = e.changedTouches[0].clientY - this._touch.startY;
          var isHoriz = this._touch.direction === "horizontal" || this._isDragging;
          this._touch = null;
          this._isDragging = false;
          this._dragOffset = 0;
          if (this._rafId) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
          }
          var order = ui.preferences.order, index = order.indexOf(this.active);
          if (!isHoriz || Math.abs(dx) < 35 || Math.abs(dx) < Math.abs(dy) * 1.15) {
            this.slideTo(index);
            return;
          }
          e.stopPropagation();
          var next = index + (dx < 0 ? 1 : -1);
          if (next >= 0 && next < order.length) {
            this.slideTo(next);
          } else {
            this.slideTo(index);
          }
        },
        shiftTime: function(hours) {
          var s = this.session, time = s.modules.qimen.time || s.baseTime, date = E.parseTime(time).nextHour(hours);
          V.set(s.modules.qimen, "time", date.toYmdHms().slice(0, 16));
          s.revision++;
          saveSession(s);
        },
renderZiweiFlows: function(h, r, full) {
        var self = this, chart = r.chart, horoscope;
        try {
          horoscope = getCachedHoroscope(chart, this.flowDate, this.flowHour);
        } catch (_) {
          return h("p", { class: "fa-caption" }, ["请选择有效的限流日期"]);
        }
        var cachedData=global.WZBZFlowData.get(chart,this.flowDate,this.flowHour,full,r.flowRules),rows=cachedData.rows;
        return h("div", { class: "fa-ziwei-flows" }, [
          rows.filter(function(row){return row.scope==='decadal'||row.scope==='yearly'||self.ziweiMoreFlows;}).map(function(row) {
            return h("div", { key:row.scope, class: "fa-flow-row", attrs:{'data-flow-scope':row.scope} }, [h("strong", [row.label]), h("div", {class:'fa-flow-items'}, row.items.map(function(item) {
              var isSel = (row.scope === "decadal" && horoscope.decadal && horoscope.decadal.index === item.index) ||
                          (row.scope === "yearly" && item.year === cachedData.year) ||
                          (row.scope === "monthly" && item.current) ||
                          (row.scope === "daily" && item.dayNum === cachedData.day) ||
                          (row.scope === "hourly" && item.hour === self.flowHour);
              var cell = button(h, [h("span", [item.label]), h("small", [item.gz])], function() {
                self.flowDate = item.date;
                if (item.hour !== void 0) self.flowHour = item.hour;
                self.flowScope = row.scope;
              }, ["fa-flow-cell", { "is-selected": isSel && !!self.flowScope }]);
              cell.key = row.scope+':'+(item.year!==void 0?item.year:item.index!==void 0?item.index:item.hour!==void 0?item.hour:item.date);
              return cell;
            }))]);
          }),
          full?button(h,self.ziweiMoreFlows?'收起流月、流日、流时':'流月 · 流日 · 流时',function(){self.ziweiMoreFlows=!self.ziweiMoreFlows;},'fa-more-flows'):null,
        ]);
      },
      
      
    },
      render: function(h) {
        var self = this, legacy = this.$slots.default || [], currentType = this.active, s = this.session;
        var order = ui.preferences.order;

        var panes = order.map(function(k) {
          if (k === "bazi") {
            return h("div", { key: "bazi", class: "fa-slide-pane fa-slide-bazi" }, [
              h("div", { class: "fa-legacy" }, legacy)
            ]);
          }

          if (!self.renderedTabs[k] || !s) {
            return h("div", { key: k, class: "fa-slide-pane fa-slide-" + k }, [
              h("header", { class: "fa-result-header" }, [
                button(h, icon(h, "back"), self.owner.onBack, "fa-icon-button"),
                h("h2", [self.owner.infoData && self.owner.infoData.name || NAMES[k] + "排盘"]),
                button(h, icon(h, "settings"), function() { open(self.owner, "preferences"); }, "fa-icon-button")
              ]),
              h("main", { class: "fa-other-content" }, [
                h("p", { class: "fa-loading" }, ["正在读取出生信息…"])
              ])
            ]);
          }

          return h("FiveArtsChartPane", { key:k, props:{host:self,type:k} });
        });

        return h("div", {
          class: ["fa-result-host", "fa-active-" + currentType],
          on: {
            "!touchstart": this.touchStart,
            "!touchmove": this.touchMove,
            "!touchend": this.touchEnd,
            touchcancel: function() {
              self._touch = null;
              self._isDragging = false;
              if (self._rafId) cancelAnimationFrame(self._rafId);
              self.slideTo(order.indexOf(self.active));
            }
          }
        }, [
          h("div", { class: "fa-slider-wrapper" }, [
            h("div", { ref: "sliderTrack", class: "fa-slider-track", style: this.trackStyle, on:{transitionend:function(e) {
              if (e.target === self.$refs.sliderTrack && e.propertyName === 'transform') self.settleSlide();
            }} }, panes)
          ]),
          h("nav", { class: "fa-global-tabs", attrs: { "aria-label": "五术盘面" } }, order.map(function(k) {
            return button(h, NAMES[k], function() {
              self.change(k);
            }, ["fa-global-tab", { "is-selected": k === currentType }]);
          })),
          navBar(h, this.owner),
          this.assistantOpen ? renderZiweiAssistant.call(this,h) : null
        ]);
      }
    });
  }
  function renderPan(owner, h, legacy) {
    install(owner);
    if (owner.isComp) return legacy;
    return h("FiveArtsResultHost", { props: { owner } }, [legacy]);
  }
  global.FiveArtsUI = { install, startForm, preferenceEntry, renderPan, open: function(owner, type) {
    open(owner, type);
  }, getState: function() {
    return ui;
  }, normalizePreferences: prefs };
})(window);
