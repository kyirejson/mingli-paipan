/* Paper Forest: shared presentation only. Chart and quiz logic stay in their components. */
(function (global) {
  'use strict';
  var paths = {
    compass: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z', 'm15.5 8.5-2 5-5 2 2-5 5-2Z'],
    record: ['M6 3h9l4 4v14H6V3Z', 'M14 3v5h5M9 12h7M9 16h5'],
    book: ['M12 6c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Zm0 0v15'],
    settings: ['M4 6h16M4 12h16M4 18h16', 'M8 3v6M16 9v6M10 15v6'],
    clock: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z', 'M12 7v5l3 2'],
    sun: ['M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5'],
    calendar: ['M4 5h16v16H4V5ZM4 10h16M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2'],
    back: ['m15 5-7 7 7 7'],
    next: ['m9 6 6 6-6 6'],
    up: ['m6 15 6-6 6 6'],
    arrow: ['M4 12h15m-6-6 6 6-6 6'],
    more: ['M5 12a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0M10.5 12a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0M16 12a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0'],
    edit: ['m4 16 11-11 4 4L8 20H4v-4Zm9-9 4 4'],
    link: ['M10 7H7a5 5 0 0 0 0 10h3M14 7h3a5 5 0 0 1 0 10h-3M8 12h8'],
    compare: ['M5 20V10h3v10M11 20V4h3v16M17 20V7h3v13'],
    leaf: ['M20 4C9 2 3 7 5 14c2 6 13 5 15-10ZM4 21 16 9'],
    lock: ['M5 11h14v10H5V11ZM8 11V7a4 4 0 0 1 8 0v4M12 15v2'],
    grid: ['M3 3h7v7H3V3ZM14 3h7v7h-7V3ZM3 14h7v7H3v-7ZM14 14h7v7h-7v-7Z'],
    pin: ['M12 22s7-7 7-13A7 7 0 1 0 5 9c0 6 7 13 7 13Z', 'M12 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z'],
    folder: ['M3 6h7l2 3h9v11H3V6Z'],
    download: ['M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4'],
    search: ['M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 6 6'],
    check: ['m5 12 4 4L19 6'],
    plus: ['M12 4v16M4 12h16'],
    eye: ['M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z'],
    trash: ['M3 6h18M8 6V3h8v3M6 6l1 15h10l1-15M10 10v7M14 10v7'],
    close: ['M6 6l12 12M18 6 6 18'],
    star: ['m12 3 3 6 6 1-4.5 4.5 1 6.5-5.5-3-5.5 3 1-6.5L3 10l6-1 3-6Z']
  };
  function iconName(label) {
    label = String(label || '');
    if (/返回/.test(label)) return 'back';
    if (/菜单|更多/.test(label)) return 'more';
    if (/更新|同步|版本/.test(label)) return 'download';
    if (/编辑|修改|笔记|习题/.test(label)) return 'edit';
    if (/藏干|司令|排盘/.test(label)) return 'grid';
    if (/太阳|五运/.test(label)) return 'sun';
    if (/子时|时间|提醒|日时/.test(label)) return 'clock';
    if (/合盘|关系/.test(label)) return 'link';
    if (/对比/.test(label)) return 'compare';
    if (/分组/.test(label)) return 'folder';
    if (/星标|置顶/.test(label)) return 'star';
    if (/删除/.test(label)) return 'trash';
    if (/搜索|筛选/.test(label)) return 'search';
    if (/知识|百科/.test(label)) return 'book';
    if (/命宫|神煞|太极/.test(label)) return 'compass';
    return 'settings';
  }
  function icon(h, name, data) {
    data = data || {};
    var attrs = Object.assign({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' }, data.attrs);
    return h('svg', Object.assign({}, data, { attrs: attrs, class: ['pf-icon', data.class] }), (paths[name] || paths.settings).map(function (d) { return h('path', { attrs: { d: d } }); }));
  }
  function toggle(h, checked, action, label) {
    return h('button', { class: ['pf-switch', { 'is-on': checked }], attrs: { type: 'button', role: 'switch', 'aria-checked': String(!!checked), 'aria-label': label }, on: { click: action } }, [h('span')]);
  }
  function field(h, name, value, action, cls) {
    return h('div', { class: ['pf-field', cls] }, [h('label', { class: 'form_row_title' }, [name]), h('button', { class: 'form_row_right pf-field-value', attrs: { type: 'button', 'aria-label': name }, on: { click: action } }, [h('span', { class: 'form_row_right_value' }, [String(value || '请选择')]), icon(h, 'next')])]);
  }
  function renderForm(h) {
    var t = this;
    var sex = h('div', { class: 'pf-field pf-sex' }, [h('span', { class: 'form_row_title' }, ['性别']), h('div', { class: 'form_radios_box' }, [1, 0].map(function (v) { return h('button', { class: ['form_radios_item', { 'form_radios_item-selected': t.infoData.sex === v }], attrs: { type: 'button', 'aria-pressed': String(t.infoData.sex === v) }, on: { click: function () { t.onChangeSex(v); } } }, [v ? '男' : '女']); }))]);
    var calendar = h('div', { class: 'pf-calendar-row' }, [h('span', { class: 'form_row_title' }, ['历法']), h('div', { class: 'form_radios_box' }, ['公历', '农历', t.sizhuTabLabel].map(function (label, i) { return h('button', { class: ['form_radios_item', { 'form_radios_item-selected': t.datetimeData.index === i }], attrs: { type: 'button', 'aria-pressed': String(t.datetimeData.index === i) }, on: { click: function () { t.onShowDatetime(i); } } }, [label]); }))]);
    var birthText=String(t.infoData.birthday||'');
    if(Number(t.infoData.unknowhour)===1)birthText=birthText.replace(/\s+\d{2}:\d{2}(?::\d{2})?$/,' 时辰未知');
    var equivalent=t.datetimeData.index_real>0?'对应公历 '+birthText:'';
    var time = h('div', { class:'pf-field pf-birth-field' }, [h('label',{class:'form_row_title'},['出生时间']),h('div',{class:'pf-time-inputs'},[h('button',{class:'form_row_right pf-field-value',attrs:{type:'button','aria-label':'出生时间'},on:{click:function(){t.onShowDatetime(t.datetimeData.index_real);}}},[h('span',{class:'pf-birth-summary'},[h('strong',[t.datetimeDisplayValue]),equivalent?h('small',[equivalent]):null]),icon(h,'calendar')]),t.showQiYun?h('button', { class: 'form-time-mode', attrs: { type: 'button' }, on: { click: function (e) { e.stopPropagation(); return t.useCurrentTime(); } } }, [icon(h, 'clock'), t.datetimeData.isManual ? '使用当前' : '当前时间']):null])]);
    return h('div', { class: 'form_wrapper pf-form' }, [
      h('div', { class: 'form_container' }, [
        h('div', { class: 'pf-name-sex' }, [h('div', { class: 'pf-field pf-name' }, [h('label', { class: 'form_row_title', attrs: { for: 'pf-name-' + t._uid } }, ['姓名']), h('input', { class: 'form_row_input', attrs: { id: 'pf-name-' + t._uid, type: 'text', maxlength: 10, placeholder: '选填', autocomplete: 'off' }, domProps: { value: t.infoData.username }, on: { input: function (e) { if (!e.target.composing) t.$set(t.infoData, 'username', e.target.value); }, compositionend: function (e) { t.$set(t.infoData, 'username', e.target.value); } } })]), sex]),
        calendar, time,
        h('div', { class: 'pf-location-group' }, [field(h, '出生地点', Array.from(new Set(t.addressData.data)).join(' '), function () { t.onShowAddress(true); }), field(h, '分组', t.groupName, function () { t.onShowGroup(true); })]),
        h('p',{class:'pf-caption'},['基础排盘需联网，会发送所填的起盘信息。命例与笔记保存在本机，请定期备份。']),
        h('button', { class: 'form_confirm pf-primary', attrs: { type: 'button', disabled: t.isConfirmingDatetime }, on: { click: function(){return t.showQiYun ? global.FiveArtsUI.startForm(t) : t.toPaiPan();} } }, [h('span', [t.startBtnText]), icon(h, 'arrow')])
      ]),
      t.datetimeData.error&&!t.datetimeData.show ? h('p',{class:'pf-calendar-error',attrs:{role:'alert'}},[t.datetimeData.error]) : null,
      t.shouldRenderDatetimePicker ? h('FormDatetime', { ref: 'formDatetimeRef', attrs: { datetimeData: t.datetimeData, unknowhour: t.infoData.unknowhour, addressData: t.addressData.data, isXLS: t.isXLS }, on: { close: t.onCloseDatetime, show: t.onShowDatetime, tab: t.onChangeDatetimeTab, confirm: function(data){return global.WZBZCalendarInput.confirmForm(t,data);} } }) : null,
      t.shouldRenderAddressPicker ? h('FormAddress', { ref: 'addressRef', attrs: { isShow: t.addressData.show, tabIndex: t.addressData.index, addressData: t.addressData.data, isBJTime: t.isBJTime }, on: { close: t.onShowAddress, confirm: t.onConfirmAddress, bjtime: t.onChangeBJTime } }) : null,
      h('van-action-sheet', { class: 'popup_wrapper', attrs: { 'get-container': 'body', 'close-on-click-overlay': false }, on: { 'click-overlay': function () { t.onShowGroup(false); }, input: function (value) { t.showGroup = value; } }, props: { value: t.showGroup } }, [h('GroupBox', { attrs: { list: t.groupArr, groupId: t.infoData.groupId }, on: { jump: t.onAddGroup, close: t.onShowGroup, confirm: t.onConfirmGroup } })])
    ]);
  }
  function renderIndexHeader(h) {
    return h('header', { class: 'index_header_wrapper pf-home-heading' }, [h('h1', { class: 'index_header_title' }, ['造化元钥']), h('p', { class: 'pf-caption' }, ['一次输入，五盘同参'])]);
  }
  function renderHeader(h) {
    var t = this;
    return h('header', { class: 'wzbz_header theme-stroke-bottom' }, [t.showBack || t.showJinBack ? h('button', { class: 'pf-header-action', attrs: { type: 'button', 'aria-label': '返回' }, on: { click: t.onBack } }, [icon(h, 'back')]) : h('span', { class: 'pf-header-action' }), h('div', { class: 'wzbz_header_title' }, [t.title === '八字排盘' ? '造化元钥' : t.title]), h('button', { class: 'wzbz_header_right pf-header-action', attrs: { type: 'button', disabled: !t.rightText }, on: { click: t.onRightText } }, [t.rightText]), t.$slots.default]);
  }
  function renderTools(h) {
    var t = this;
    return h('section', { class: 'pf-tools-section' }, [h('div', { class: 'pf-section-rule' }, ['更多工具']), h('div', { class: 'mulAppEntry_wrapper home-tools' }, ['hepan', 'multipan', 'wylq'].map(function (key, i) { return h('button', { class: 'home-tool', attrs: { type: 'button' }, on: { click: function () { t.onJump(key); } } }, [icon(h, ['link', 'compare', 'leaf'][i]), h('span', [['合盘', '多盘对比', '五运六气'][i]])]); }))]);
  }
  function renderSettingsHeading(h) {
    var t = this;
    return h('header', { class: 'my-header pf-settings-heading' }, [h('div', [h('h1', ['设置'])]), global.FiveArtsUI.preferenceEntry(h, t),h('button',{class:'pf-detail-button',attrs:{type:'button'},on:{click:function(){global.WZBZBackup.open();}}},['数据备份'])]);
  }
  function renderPreferenceHeader(h) {
    var t=this;
    return h('header',{class:'wzbz_header pf-preference-header'},[h('button',{class:'pf-header-action',attrs:{type:'button','aria-label':'返回'},on:{click:t.onBack}},[icon(h,'back')]),h('div',{class:'pf-preference-tabs'},['first','second'].map(function(key,i){return h('button',{class:{'is-selected':t.actived===key},attrs:{type:'button','aria-pressed':String(t.actived===key)},on:{click:function(){t.handleTab(key);}}},[i?'规则设置':'显示设置']);})),h('button',{class:'pf-header-action',attrs:{type:'button'},on:{click:t.onReset}},['重置'])]);
  }
  function renderFormatOptions(h) {
    var t=this;
    return h('section',{class:'form_box pf-format-options'},[h('h2',{class:'header'},[t.title]),h('p',{class:'pf-caption'},['选择四柱与流运的排列顺序']),h('div',{class:'pf-format-list'},t.secondList.map(function(item,i){var labels=[['流运在前','四柱在前'],['时 日 月 年','年 月 日 时'],['大运 · 流年 · 流月','流月 · 流年 · 大运']][i]||['顺序一','顺序二'];return h('div',{key:item.key},[h('h3',[item.title]),h('div',{class:'pf-format-choices'},labels.map(function(label,j){var on=j?item.rightActived:item.leftActived;return h('button',{class:{'is-selected':on},attrs:{type:'button','aria-pressed':String(!!on)},on:{click:function(){t.handleImage(item,!j);}}},[label, on?icon(h,'check'):null]);}))]);}))]);
  }
  function imageSwitch(h,data) {
    var original=data.attrs||{}, on=/selected|switchbtn_s[.\/_]|switch_on|switch_open/i.test(String(original.src||''));
    return h('button',Object.assign({},data,{staticClass:(data.staticClass||'').replace(/theme-image/g,''),class:['pf-switch',{'is-on':on}],attrs:{type:'button',role:'switch','aria-checked':String(on),'aria-label':original.alt||'切换设置'}}),[h('span')]);
  }
  function text(h,value,data) {
    data=Object.assign({},data);data.staticClass=(data.staticClass||'').replace(/theme-image/g,'')+' pf-copy';
    data.attrs={};data.domProps={textContent:String(value==null?'':value)};
    return h('span',data);
  }
  function renderLesson(h) {
    var t=this,l=t.levelData;if(!l||!l.id)return h();
    var content=t.lists[l.level-1]||{content1:[],content2:[]};
    return h('div',{class:'tilin_root pf-lesson'},[h('header',{class:'pf-lesson-header'},[h('button',{class:'pf-header-action',attrs:{type:'button','aria-label':'返回'},on:{click:t.onBack}},[icon(h,'back')]),h('span',['题林探索']),h('span',{class:'pf-header-action'})]),h('main',{class:'pf-lesson-main'},[h('div',{class:'pf-lesson-number'},[String(l.level).padStart(2,'0')]),h('h1',[l.name]),h('p',{class:'pf-caption'},[t.cn_levels[l.clevel-1]+' · '+(t.isCleared?'已完成':'探索必备知识')]),t.isCleared?h('section',{class:'pf-lesson-content'},[h('h2',[l.score+'分']),h('p',['答题时长：'+t.millisecondsToHms(1000*l.duration)]),h('p',['答题数量：'+l.num]),h('p',['错误数量：'+l.wrongNum])]):h('section',{class:'pf-lesson-content'},[h('h2',['主要知识目标']),content.content1.map(function(text,i){return h('p',{key:'k'+i},[text]);}),h('h2',['主要能力验证']),content.content2.map(function(text,i){return h('p',{key:'a'+i},[text]);})]),h('p',{class:'pf-caption pf-lesson-threshold'},['得分达到'+l.advanceScore+'分以上将解锁下一关。']),h('button',{class:'pf-primary',attrs:{type:'button'},on:{click:t.navToDati}},['立即探索',icon(h,'arrow')])])]);
  }
  function renderResult(h) {
    var t=this,r=t.resultData;
    return h('div',{class:'wzbz_container wzbz_container_h pf-result'},[h('Header',{attrs:{title:t.title||'答题结果'},on:{onBack:t.onBack}}),h('main',{class:'wzbz_main_wrapper'},[r?h('div',{class:'pf-result-main'},[h('span',{class:'pf-eyebrow'},['本次得分']),h('h1',[String(r.score),h('small',['分'])]),h('p',{class:'pf-result-state'},[r.cleared?(t.hasNext?'已达到晋级标准':'已完成全部等级'):'继续研习，再接再厉']),h('div',{class:'pf-result-stats'},[['答题时长',r.durationStr],['答题数量',r.num],['错误数量',r.wrongNum]].map(function(item){return h('div',[h('span',[item[0]]),h('strong',[String(item[1])])]);})),h('p',{class:'pf-caption'},['晋级标准：得分达到 '+r.advanceScore+' 分。']),h('div',{class:'pf-result-actions'},[h('button',{class:'pf-primary',attrs:{type:'button'},on:{click:function(){t.onHandleClick('check');}}},['查看解析',icon(h,'arrow')]),t.hasNext?h('button',{class:'pf-secondary',attrs:{type:'button'},on:{click:function(){t.onHandleClick('restart');}}},['重新探索']):null,t.hasNext?h('button',{class:'pf-secondary',attrs:{type:'button'},on:{click:function(){t.onHandleClick('next');}}},['探索下一级']):null])]):h('p',{class:'pf-caption'},['暂无答题结果。'])])]);
  }
  function renderNavigation(h) {
    var t = this;
    return h('div', [h('Scroll', { ref: 'scroll', class: 'card-box' }, [h('div', { class: 'navigation-root' }, [h('div', { class: 'navigation-fragment' }, [h('keep-alive', { props: { include: ['WZIndex', 'WZUserList', 'WZBook', 'WZMy'] } }, [h('router-view')])]), h('nav', { ref: 'navigationFoot', class: 'navigation-foot', directives: [{ name: 'show', value: t.isShow }], attrs: { 'aria-label': '主导航' } }, [h('div', { class: 'navigation-foot-content' }, t.pageList.map(function (page, i) { return h('button', { key: page.text, class: ['navigation-item', { 'navigation-item-selected': i === t.navigatorIndex }], attrs: { type: 'button', 'aria-current': i === t.navigatorIndex ? 'page' : null }, on: { click: function () { t.toNavigationPage(i); } } }, [icon(h, ['compass', 'record', 'book', 'settings'][i]), h('span', { class: 'nav-text' }, [page.text])]); })), h('div', { class: 'navigation-foot-auto', directives: [{ name: 'show', value: t.isAuto }] })])])])]);
  }
  function renderQuiz(h) {
    var t = this;
    return h('div', { class: 'tiku-root pf-quiz' }, [
      h('div', { class: 'tiku-head pf-quiz-tools' }, ['知识百科', '习题作战'].map(function (name, i) { return h('button', { attrs: { type: 'button' }, on: { click: function () { t.onTab(i); } } }, [icon(h, i ? 'edit' : 'book'), h('strong', [name]), h('span', [i ? '巩固所学，循序进阶' : '基础概念，随时查阅']), icon(h, 'next')]); })),
      h('div', { class: 'tiku-content pf-syllabus' }, [h('div', { class: 'pf-syllabus-heading' }, [h('h2', ['题林探索']), h('span', { class: 'pf-caption' }, ['循序渐进，从容研习'])]), t.list.map(function (level, i) {
        var open = !!(t.maxLocks && t.maxLocks[i]);
        return h('article', { key: level.id, class: ['cardd pf-level', { 'pf-level-open': open }] }, [h('div', { class: 'pf-level-number' }, [h('span', [String(i + 1).padStart(2, '0')])]), h('div', { class: 'pf-level-body' }, [h('div', { class: 'pf-level-heading' }, [h('h3', [level.name]), t.isJinjis && t.isJinjis[i] ? h('span', { class: 'pf-level-done' }, ['已晋级']) : null]), h('div', { class: 'pf-level-info' }, [h('span', { class: 'pf-score' }, [level.advanceScore + '分晋级']), h('span', { class: 'pf-caption' }, ['难度 ' + t.getStarLevel(level.level)])]), h('div', { class: 'bottom pf-level-actions' }, [h('button', { class: open ? 'pf-primary' : 'pf-secondary', attrs: { type: 'button', 'aria-label': (open ? '探索' : '解锁') + level.name }, on: { click: function () { open ? t.navToTiLin(i, -1) : t.handleUnLock(i); } } }, [open ? '立即探索' : '尚未解锁', icon(h, open ? 'arrow' : 'lock')]), h('div', { class: 'pf-sublevels' }, (level.children || []).map(function (child, j) { var locked = !!(t.locks && t.locks[i] && t.locks[i][j]); return h('button', { key: child.id || j, attrs: { type: 'button', 'aria-label': level.name + '第' + (j + 1) + '级' }, class: { 'is-locked': locked }, on: { click: function () { locked ? t.handleUnLock(i) : t.navToTiLin(i, j); } } }, [locked ? icon(h, 'lock') : String(j + 1)]); }))])])]);
      })])
    ]);
  }
  // Polyfill / adapter: Enable mouse drag support for mobile swipe-cells on PC / Android emulator
  (function initMouseSwipeSupport() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    var activeCell = null;
    var isDown = false;

    function makeTouch(e, target) {
      if (typeof Touch !== 'undefined') {
        try {
          return new Touch({
            identifier: 1,
            target: target,
            clientX: e.clientX,
            clientY: e.clientY,
            pageX: e.pageX,
            pageY: e.pageY,
            screenX: e.screenX,
            screenY: e.screenY
          });
        } catch (_) {}
      }
      return {
        identifier: 1,
        target: target,
        clientX: e.clientX,
        clientY: e.clientY,
        pageX: e.pageX,
        pageY: e.pageY,
        screenX: e.screenX,
        screenY: e.screenY
      };
    }

    document.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      var cell = e.target && e.target.closest && e.target.closest('.van-swipe-cell');
      if (!cell) return;
      activeCell = cell;
      isDown = true;
      var touch = makeTouch(e, activeCell);
      try {
        activeCell.dispatchEvent(new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
          touches: [touch],
          targetTouches: [touch],
          changedTouches: [touch]
        }));
      } catch (_) {}
    }, true);

    window.addEventListener('mousemove', function (e) {
      if (!isDown || !activeCell) return;
      var touch = makeTouch(e, activeCell);
      try {
        activeCell.dispatchEvent(new TouchEvent('touchmove', {
          bubbles: true,
          cancelable: true,
          touches: [touch],
          targetTouches: [touch],
          changedTouches: [touch]
        }));
      } catch (_) {}
    }, true);

    window.addEventListener('mouseup', function (e) {
      if (!isDown || !activeCell) return;
      isDown = false;
      var target = activeCell;
      activeCell = null;
      var touch = makeTouch(e, target);
      try {
        target.dispatchEvent(new TouchEvent('touchend', {
          bubbles: true,
          cancelable: true,
          touches: [],
          targetTouches: [],
          changedTouches: [touch]
        }));
      } catch (_) {}
    }, true);
  })();

  global.PaperForest = Object.freeze({ icon: icon, iconName: iconName, text:text,imageSwitch:imageSwitch, renderForm: renderForm, renderIndexHeader: renderIndexHeader, renderHeader: renderHeader, renderTools: renderTools, renderSettingsHeading: renderSettingsHeading, renderPreferenceHeader:renderPreferenceHeader,renderFormatOptions:renderFormatOptions, renderLesson:renderLesson, renderResult:renderResult, renderNavigation: renderNavigation, renderQuiz: renderQuiz });
})(window);

