(function (global) {
  'use strict';
  var REPOSITORY = 'https://github.com/kyirejson/mingli-paipan';
  var state = { status: null, latest: null, ready: null, checking: false, downloading: false, percent: 0, error: '', message: '', needsPermission: false, initialized: false };
  var initializing, checking, lastCheck = 0, listenersAttached = false, announced = 0;
  function plugin() { return global.Capacitor && global.Capacitor.Plugins && global.Capacitor.Plugins.GitHubUpdater; }
  function errorText(error) { return error && error.message || String(error || '操作失败，请重试'); }
  function available() { return !!(state.latest && state.latest.available && state.status && Number(state.latest.latestCode) > Number(state.status.currentCode)); }
  function ready() { return !!(state.ready && state.status && Number(state.ready.latestCode) > Number(state.status.currentCode)); }
  async function refreshStatus() {
    var native = plugin();
    if (!native) return;
    var status = await native.getStatus();
    state.status = status;
    state.ready = status.ready || null;
    state.downloading = !!status.downloading;
    if (!state.latest && status.latest) state.latest = status.latest;
  }
  async function initialize() {
    if (initializing) return initializing;
    initializing = (async function () {
      if (plugin()) {
        await refreshStatus();
        if (!listenersAttached) {
          listenersAttached = true;
          await plugin().addListener('progress', function (event) { state.percent = Math.max(0, Math.min(100, Number(event.percent) || 0)); });
          await plugin().addListener('appResumed', function () { refreshStatus().then(function () { return check(false); }).catch(function () {}); });
        }
      } else {
        try { var response = await fetch('./static/update-info.json', { cache: 'no-store' }); if (response.ok) { var version = await response.json(); state.status = { currentVersion: version.version, currentCode: version.versionCode, isPreview: true }; } } catch (_) {}
        state.message = '请在安装了此更新功能的安卓 APP 中检查和安装新版。';
      }
      state.initialized = true;
    })().catch(function (error) { initializing = null; throw error; });
    return initializing;
  }
  function announce() {
    if (!available() || announced === state.latest.latestCode || location.hash.indexOf('/settingshow/updates') >= 0) return;
    announced = state.latest.latestCode;
    var previous = document.getElementById('wzbz-update-notice'); if (previous) previous.remove();
    var box = document.createElement('div'); box.id = 'wzbz-update-notice';
    var open = document.createElement('button'); open.textContent = '发现新版本 ' + state.latest.latestVersion + '，查看更新';
    open.onclick = function () { location.hash = '/main/settingshow/updates'; box.remove(); };
    var close = document.createElement('button'); close.textContent = '×'; close.setAttribute('aria-label', '稍后更新'); close.onclick = function () { box.remove(); };
    box.appendChild(open); box.appendChild(close); document.body.appendChild(box);
  }
  async function check(manual) {
    await initialize();
    if (!plugin()) return;
    if (checking) return checking;
    if (!manual && Date.now() - lastCheck < 5 * 60 * 1000) return;
    state.checking = true; if (manual) state.error = '';
    checking = plugin().check().then(function (result) {
      state.latest = result; state.message = result.message || ''; state.error = ''; lastCheck = Date.now(); announce();
    }).catch(function (error) { if (manual) state.error = errorText(error); }).finally(function () { state.checking = false; checking = null; });
    return checking;
  }
  async function download() {
    if (!plugin() || state.downloading || !available()) return;
    state.error = ''; state.percent = 0; state.downloading = true;
    try { state.ready = await plugin().download(); state.message = '下载与校验完成，请点击安装更新。'; }
    catch (error) { state.error = errorText(error); }
    finally { state.downloading = false; }
  }
  async function install() {
    state.error = '';
    try {
      var result = await plugin().install(); state.needsPermission = !!result.needsPermission;
      state.message = state.needsPermission ? '请允许此 APP 安装更新，返回后点击“安装更新”。' : '请在安卓安装窗口确认；取消安装后仍可在这里重试。';
    } catch (error) { state.error = errorText(error); }
  }
  async function notifications() {
    state.error = '';
    try { await plugin().setNotifications({ enabled: !state.status.backgroundEnabled }); await refreshStatus(); }
    catch (error) { state.error = errorText(error); }
  }
  function openRelease() {
    if (plugin()) plugin().openRelease().catch(function (error) { state.error = errorText(error); });
    else global.open(REPOSITORY + '/releases', '_blank', 'noopener');
  }
  global.WZBZUpdatePage = {
    name: 'GitHubVersionUpdate',
    data: function () { return { update: state }; },
    created: function () { initialize().then(function () { return check(true); }).catch(function (error) { state.error = errorText(error); }); },
    render: function (h) {
      var status = state.status || {}, latest = state.latest || {};
      function button(text, handler, disabled, secondary) { return h('button', { class: ['wz-update-button', secondary ? 'secondary' : ''], attrs: { type: 'button', disabled: !!disabled }, on: { click: handler } }, text); }
      var actions = [button(state.checking ? '正在检查…' : '检查更新', function () { check(true).catch(function (error) { state.error = errorText(error); }); }, state.checking || state.downloading)];
      if (available() && !status.isDebug && !status.isPreview && !ready()) actions.push(button(state.downloading ? '下载中 ' + state.percent + '%' : '下载更新', download, state.downloading));
      if (ready()) actions.push(button('安装更新', install, state.downloading));
      if (state.needsPermission) actions.push(button('允许安装更新', function () { plugin().openInstallPermission().catch(function (e) { state.error = errorText(e); }); }, false, true));
      if (state.downloading) actions.push(button('取消下载', function () { plugin().cancelDownload().catch(function (e) { state.error = errorText(e); }); }, false, true));
      var cards = [h('section', { class: 'wz-update-card' }, [h('div', { class: 'wz-update-caption' }, '当前安装版本'), h('div', { class: 'wz-update-version' }, status.currentVersion ? 'v' + status.currentVersion : '读取中…'), h('p', latest.latestVersion ? 'GitHub 发布版本：' + latest.latestVersion : '从 GitHub 获取正式发布版本'), h('div', { class: 'wz-update-actions' }, actions), state.downloading ? h('progress', { attrs: { max: 100, value: state.percent, 'aria-label': '更新下载进度' } }) : null, state.message ? h('p', { attrs: { role: 'status' } }, state.message) : null, state.error ? h('p', { class: 'wz-update-error', attrs: { role: 'alert' } }, state.error) : null])];
      if (status.isDebug) cards.push(h('section', { class: 'wz-update-card' }, '当前是模拟器调试版，可检查发布信息；下载安装请使用正式版。'));
      if (latest.notes) cards.push(h('section', { class: 'wz-update-card' }, [h('h2', '更新说明'), h('pre', latest.notes)]));
      cards.push(h('section', { class: 'wz-update-card' }, [h('h2', '更新提醒'), h('p', '打开 APP 或回到前台时自动检查。后台提醒开启后会定期检查，省电策略可能延迟通知。'), plugin() ? button(status.backgroundEnabled ? (status.notificationsAllowed ? '后台提醒已开启 · 点击关闭' : '后台检查已开启 · 系统通知已关闭') : '开启后台更新提醒', notifications, false, true) : null, h('p', '更新使用完整安装包，安装前需要在手机上确认。请保持网络连接，下载期间不要关闭 APP。'), button('查看 GitHub 发布页', openRelease, false, true)]));
      var self = this;
      return h('div', { class: 'wz-update-page' }, [h('header', { class: 'wz-update-header' }, [button('‹ 返回', function () { self.$router.replace('/main/wznavigation/wzmy'); }, false, true), h('h1', '版本更新')]), h('main', cards)]);
    }
  };
  global.__WZBZ_UPDATER__ = { state: state, check: check, initialize: initialize, available: available, ready: ready };
  setTimeout(function () { check(false).catch(function () {}); }, 1500);
  setInterval(function () { if (!document.hidden) check(false).catch(function () {}); }, 15 * 60 * 1000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) check(false).catch(function () {}); });
})(window);
