(function (global) {
  'use strict';
  function nowMinute(date) {
    var pad = function (value) { return String(value).padStart(2, '0'); };
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
  }
  async function refresh(force) {
    if (!this.showQiYun || this.datetimeData.isManual || this.datetimeData.show || this.isConfirmingDatetime) return false;
    var date = new Date(), value = nowMinute(date);
    if (!force && this.infoData.birthday === value) return true;
    this.infoData.birthday = value;
    this.infoData.lunarArr = [];
    this.infoData.timetype = 0;
    this.infoData.unknowhour = 0;
    this.infoData.fenzhu = '';
    this.infoData.unknowminute = 0;
    this.datetimeData.data = date;
    this.datetimeData.value = value;
    this.datetimeData.index = 0;
    this.datetimeData.index_real = 0;
    this.datetimeData.sizhu = '';
    this.datetimeData.fenzhu = '';
    this.datetimeData.unknowminute = 0;
    await this.handleSunTime();
    return true;
  }
  function stop() {
    if (this._currentTimeTimer) clearInterval(this._currentTimeTimer);
    this._currentTimeTimer = null;
  }
  function start() {
    stop.call(this);
    if (!this.showQiYun) return;
    var self = this;
    this.refreshCurrentTime(true).catch(function (error) { console.error('更新时间失败', error); });
    this._currentTimeTimer = setInterval(function () {
      if (!document.hidden && self.$el && self.$el.isConnected) self.refreshCurrentTime(false).catch(function (error) { console.error('更新时间失败', error); });
    }, 1000);
  }
  async function useCurrent() {
    this.datetimeData.isManual = false;
    return this.refreshCurrentTime(true);
  }
  async function submit() {
    if (this.isConfirmingDatetime || this._submittingChart) return;
    this._submittingChart = true;
    try {
      if (this.showQiYun) {
        await this.refreshCurrentTime(true);
        this.infoData.isInstant = !this.datetimeData.isManual;
      }
      return await this.submitSelectedChart();
    } finally { this._submittingChart = false; }
  }
  global.WZBZHomeClock = { nowMinute: nowMinute, refresh: refresh, start: start, stop: stop, useCurrent: useCurrent, submit: submit };
})(window);
